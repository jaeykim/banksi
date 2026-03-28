import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ paymentId: string }> };

// GET /api/payments/[paymentId]/status - Public polling endpoint
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { paymentId } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        txHash: true,
        amountReceived: true,
        paidAt: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      txHash: payment.txHash,
      amountReceived: payment.amountReceived,
      paidAt: payment.paidAt,
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
