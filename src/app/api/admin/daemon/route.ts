import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';

// GET /api/admin/daemon — Check daemon status and last activity
export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check auto_sweep setting
    const autoSweep = await prisma.systemSetting.findUnique({
      where: { key: 'auto_sweep_enabled' },
    });
    const intervalSetting = await prisma.systemSetting.findUnique({
      where: { key: 'auto_sweep_interval_minutes' },
    });

    // Get latest activity indicators
    const [lastPayment, lastSweepJob, pendingPayments, confirmedUnsswept] = await Promise.all([
      prisma.payment.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { id: true, status: true, updatedAt: true },
      }),
      prisma.sweepJob.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, createdAt: true },
      }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({
        where: { status: 'CONFIRMED', derivedAddress: { isSwept: false } },
      }),
    ]);

    return NextResponse.json({
      monitorRunning: true, // always true if server is up (instrumentation hook)
      autoSweepEnabled: autoSweep?.value === 'true',
      sweepIntervalMinutes: intervalSetting ? parseInt(intervalSetting.value) : 10,
      pendingPayments,
      confirmedAwaitingSweep: confirmedUnsswept,
      lastPaymentUpdate: lastPayment?.updatedAt || null,
      lastSweepJob: lastSweepJob
        ? { status: lastSweepJob.status, createdAt: lastSweepJob.createdAt }
        : null,
    });
  } catch (error) {
    console.error('Error fetching daemon status:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
