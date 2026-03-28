import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        merchant: { select: { name: true } },
        chain: { select: { name: true } },
        token: { select: { symbol: true } },
      },
    });

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        merchantId: p.merchantId,
        merchantName: p.merchant.name,
        amountExpected: p.amountExpected,
        amountReceived: p.amountReceived,
        fiatAmount: p.fiatAmount,
        currency: p.currency,
        chainId: p.chainId,
        chainName: p.chain.name,
        tokenSymbol: p.token.symbol,
        status: p.status,
        txHash: p.txHash,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'An internal error occurred.' },
      { status: 500 },
    );
  }
}
