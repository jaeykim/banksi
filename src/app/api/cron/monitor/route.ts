import { NextRequest, NextResponse } from 'next/server';
import { monitorPendingPayments } from '@/lib/payments/monitor';

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await monitorPendingPayments();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Cron monitor error:', error);
    return NextResponse.json({ error: 'Monitor failed' }, { status: 500 });
  }
}
