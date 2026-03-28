import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ merchantId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { merchantId } = await params;
    const isAdmin = session.user.role === 'ADMIN';
    const isMerchant = session.user.role === 'MERCHANT' && session.user.merchantId === merchantId;
    if (!isAdmin && !isMerchant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Get all confirmed/swept payments for this merchant
    const payments = await prisma.payment.findMany({
      where: {
        merchantId,
        status: { in: ['CONFIRMED', 'SWEPT'] },
      },
      select: {
        fiatAmount: true,
        createdAt: true,
        chain: { select: { id: true, name: true } },
        token: { select: { symbol: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Daily volume (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dailyMap = new Map<string, number>();
    for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      dailyMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const p of payments) {
      const day = p.createdAt.toISOString().slice(0, 10);
      if (dailyMap.has(day)) {
        dailyMap.set(day, (dailyMap.get(day) || 0) + p.fiatAmount);
      }
    }
    const dailyVolume = Array.from(dailyMap, ([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }));

    // Hourly distribution (24h)
    const hourlyMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) hourlyMap.set(h, 0);
    for (const p of payments) {
      const h = p.createdAt.getHours();
      hourlyMap.set(h, (hourlyMap.get(h) || 0) + p.fiatAmount);
    }
    const hourlyVolume = Array.from(hourlyMap, ([hour, amount]) => ({ hour, amount: Math.round(amount * 100) / 100 }));

    // By chain
    const chainMap = new Map<string, { name: string; amount: number; count: number }>();
    for (const p of payments) {
      const key = p.chain.id;
      const existing = chainMap.get(key) || { name: p.chain.name, amount: 0, count: 0 };
      existing.amount += p.fiatAmount;
      existing.count += 1;
      chainMap.set(key, existing);
    }
    const byChain = Array.from(chainMap.values()).map((v) => ({ ...v, amount: Math.round(v.amount * 100) / 100 }));

    // By token
    const tokenMap = new Map<string, { symbol: string; amount: number; count: number }>();
    for (const p of payments) {
      const key = p.token.symbol;
      const existing = tokenMap.get(key) || { symbol: key, amount: 0, count: 0 };
      existing.amount += p.fiatAmount;
      existing.count += 1;
      tokenMap.set(key, existing);
    }
    const byToken = Array.from(tokenMap.values()).map((v) => ({ ...v, amount: Math.round(v.amount * 100) / 100 }));

    // Recent payments (last 10)
    const recentPayments = await prisma.payment.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        chain: { select: { id: true, name: true, explorerUrl: true } },
        token: { select: { symbol: true } },
        product: { select: { name: true } },
      },
    });

    const recent = recentPayments.map((p) => {
      let txExplorerUrl: string | null = null;
      if (p.txHash && p.chain.explorerUrl) {
        txExplorerUrl = `${p.chain.explorerUrl.replace(/\/$/, '')}/tx/${p.txHash}`;
      }
      return {
        id: p.id,
        status: p.status,
        fiatAmount: p.fiatAmount,
        amountExpected: p.amountExpected,
        chainId: p.chain.id,
        chainName: p.chain.name,
        tokenSymbol: p.token.symbol,
        productName: p.product?.name || null,
        txHash: p.txHash,
        txExplorerUrl,
        createdAt: p.createdAt,
      };
    });

    return NextResponse.json({ dailyVolume, hourlyVolume, byChain, byToken, recent });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
