import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sweepAllConfirmed } from '@/lib/payments/sweep';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if auto sweep is enabled
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'auto_sweep_enabled' },
    });
    if (setting?.value !== 'true') {
      return NextResponse.json({ ok: true, skipped: true, reason: 'auto_sweep_enabled is false' });
    }

    const result = await sweepAllConfirmed();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Cron sweep error:', error);
    return NextResponse.json({ error: 'Sweep failed' }, { status: 500 });
  }
}
