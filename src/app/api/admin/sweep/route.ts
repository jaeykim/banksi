import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  sweepPayment,
  sweepMerchantFunds,
  sweepAllConfirmed,
} from '@/lib/payments/sweep';

// ---------------------------------------------------------------------------
// POST /api/admin/sweep — Trigger sweep
// Body: { paymentId? } | { merchantId? } | {} (sweep all)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { paymentId, merchantId } = body as {
      paymentId?: string;
      merchantId?: string;
    };

    // Sweep a single payment
    if (paymentId) {
      const result = await sweepPayment(paymentId);
      return NextResponse.json({ result });
    }

    // Sweep all confirmed for a specific merchant
    if (merchantId) {
      const results = await sweepMerchantFunds(merchantId);
      const swept = results.filter((r) => r.status === 'SUBMITTED').length;
      const failed = results.filter((r) => r.status === 'FAILED').length;
      return NextResponse.json({ swept, failed, results });
    }

    // Sweep all confirmed across all merchants
    const summary = await sweepAllConfirmed();
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Sweep error:', error);
    const message =
      error instanceof Error ? error.message : 'An internal error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/sweep — List recent sweep jobs with stats
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Aggregate stats
    const [totalSwept, pendingSweep, failedSweeps] = await Promise.all([
      prisma.sweepJob.count({ where: { status: 'SUBMITTED' } }),
      prisma.payment.count({
        where: {
          status: 'CONFIRMED',
          derivedAddress: { isSwept: false },
        },
      }),
      prisma.sweepJob.count({ where: { status: 'FAILED' } }),
    ]);

    // Recent sweep jobs
    const jobs = await prisma.sweepJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        chain: { select: { name: true } },
      },
    });

    return NextResponse.json({
      stats: {
        totalSwept,
        pendingSweep,
        failedSweeps,
      },
      jobs: jobs.map((j) => ({
        id: j.id,
        merchantId: j.merchantId,
        chainId: j.chainId,
        chainName: j.chain.name,
        fromAddress: j.fromAddress,
        toAddress: j.toAddress,
        amount: j.amount,
        merchantAmount: j.merchantAmount,
        feeAmount: j.feeAmount,
        feePercent: j.feePercent,
        feeAddress: j.feeAddress,
        feeTxHash: j.feeTxHash,
        txHash: j.txHash,
        status: j.status,
        errorMessage: j.errorMessage,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching sweep jobs:', error);
    return NextResponse.json(
      { error: 'An internal error occurred.' },
      { status: 500 },
    );
  }
}
