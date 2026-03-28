import { NextRequest, NextResponse } from 'next/server';
import { checkPaymentStatus } from '@/lib/payments/monitor';
import { prisma } from '@/lib/prisma';
import { corsHeaders, corsOptionsResponse } from '@/lib/cors';

export async function OPTIONS() { return corsOptionsResponse(); }

type RouteContext = { params: Promise<{ paymentId: string }> };

// GET /api/payments/[paymentId]/status - Public polling endpoint with on-chain check
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { paymentId } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, status: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // For terminal statuses, return immediately without on-chain check
    if (['CONFIRMED', 'SWEPT', 'EXPIRED', 'FAILED'].includes(payment.status)) {
      const full = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, status: true, txHash: true, amountReceived: true, paidAt: true },
      });
      return NextResponse.json(full);
    }

    // For active payments (PENDING, CONFIRMING), do an on-chain check
    const result = await checkPaymentStatus(paymentId);

    return NextResponse.json({
      id: paymentId,
      status: result.status,
      txHash: result.txHash,
      amountReceived: result.amountReceived,
      paidAt: result.status === 'CONFIRMED' ? new Date() : null,
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
