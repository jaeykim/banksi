import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { monitorPendingPayments } from '@/lib/payments/monitor';

// POST /api/payments/verify - Cron endpoint to monitor all pending payments (admin-only)
export async function POST(_request: NextRequest) {
  try {
    // Verify admin access
    // Support both session auth and a shared cron secret for automated calls
    const cronSecret = _request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
      // Authenticated via cron secret -- proceed
    } else {
      // Fall back to session auth
      const session = await getServerSession(authOptions);
      if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await monitorPendingPayments();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error running payment verification:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
