import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { corsHeaders } from '@/lib/cors';

export const dynamic = 'force-dynamic';

// GET /api/demo/dashboard — Public demo dashboard data for Seoul Coffee
export async function GET() {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { slug: 'seoul-coffee' },
      select: { id: true, name: true, slug: true },
    });

    if (!merchant) {
      return corsHeaders(NextResponse.json({ error: 'Demo merchant not found' }, { status: 404 }));
    }

    // Stats
    const [productsCount, paymentsCount, totalVolumeAgg] = await Promise.all([
      prisma.product.count({ where: { merchantId: merchant.id, isActive: true } }),
      prisma.payment.count({ where: { merchantId: merchant.id } }),
      prisma.payment.aggregate({
        where: { merchantId: merchant.id, status: { in: ['CONFIRMED', 'SWEPT'] } },
        _sum: { fiatAmount: true },
      }),
    ]);

    // Recent payments
    const recentPayments = await prisma.payment.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        chain: { select: { id: true, name: true, explorerUrl: true } },
        token: { select: { symbol: true } },
        product: { select: { name: true } },
      },
    });

    const recent = recentPayments.map((p) => ({
      id: p.id,
      status: p.status,
      fiatAmount: p.fiatAmount,
      amountExpected: p.amountExpected,
      chainId: p.chain.id,
      chainName: p.chain.name,
      tokenSymbol: p.token.symbol,
      productName: p.product?.name || null,
      txHash: p.txHash,
      txExplorerUrl: p.txHash && p.chain.explorerUrl ? `${p.chain.explorerUrl.replace(/\/$/, '')}/tx/${p.txHash}` : null,
      createdAt: p.createdAt,
    }));

    // By chain
    const payments = await prisma.payment.findMany({
      where: { merchantId: merchant.id, status: { in: ['CONFIRMED', 'SWEPT'] } },
      select: { fiatAmount: true, createdAt: true, chain: { select: { id: true, name: true } }, token: { select: { symbol: true } } },
    });

    const chainMap = new Map<string, { name: string; amount: number; count: number }>();
    const tokenMap = new Map<string, { symbol: string; amount: number; count: number }>();
    for (const p of payments) {
      const ce = chainMap.get(p.chain.id) || { name: p.chain.name, amount: 0, count: 0 };
      ce.amount += p.fiatAmount; ce.count++; chainMap.set(p.chain.id, ce);
      const te = tokenMap.get(p.token.symbol) || { symbol: p.token.symbol, amount: 0, count: 0 };
      te.amount += p.fiatAmount; te.count++; tokenMap.set(p.token.symbol, te);
    }

    return corsHeaders(NextResponse.json({
      merchant,
      stats: { productsCount, paymentsCount, totalVolume: totalVolumeAgg._sum.fiatAmount || 0 },
      recent,
      byChain: Array.from(chainMap.values()),
      byToken: Array.from(tokenMap.values()),
    }));
  } catch (error) {
    console.error('Demo dashboard error:', error);
    return corsHeaders(NextResponse.json({ error: 'Internal error' }, { status: 500 }));
  }
}
