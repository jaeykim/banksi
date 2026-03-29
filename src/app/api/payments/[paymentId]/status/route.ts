import { NextRequest, NextResponse } from 'next/server';
import { checkPaymentStatus } from '@/lib/payments/monitor';
import { prisma } from '@/lib/prisma';
import { corsHeaders, corsOptionsResponse } from '@/lib/cors';

export async function OPTIONS() { return corsOptionsResponse(); }

type RouteContext = { params: Promise<{ paymentId: string }> };

function corsJson(data: unknown, status = 200) {
  return corsHeaders(NextResponse.json(data, { status }));
}

// GET /api/payments/[paymentId]/status - Public polling endpoint with on-chain check
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { paymentId } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, status: true },
    });

    if (!payment) {
      return corsJson({ error: 'Payment not found' }, 404);
    }

    if (['CONFIRMED', 'SWEPT', 'EXPIRED', 'FAILED'].includes(payment.status)) {
      const full = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, status: true, txHash: true, amountReceived: true, paidAt: true },
      });
      return corsJson(full);
    }

    const result = await checkPaymentStatus(paymentId);

    return corsJson({
      id: paymentId,
      status: result.status,
      txHash: result.txHash,
      amountReceived: result.amountReceived,
      paidAt: result.status === 'CONFIRMED' ? new Date() : null,
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return corsJson({ error: 'An internal error occurred.' }, 500);
  }
}
