import { NextRequest, NextResponse } from 'next/server';
import { requirePayment } from '@/lib/x402/middleware';

// GET /api/x402/demo — Demo protected endpoint requiring 0.01 USD payment
export async function GET(request: NextRequest) {
  // Check for payment — returns 402 if not paid
  const paywall = await requirePayment(request, {
    merchantSlug: 'seoul-coffee',
    amount: 0.01,
    description: 'Access premium market data (demo). Costs $0.01 in USDT or USDC.',
  });

  if (paywall) return paywall;

  // Payment verified — return premium content
  return NextResponse.json({
    data: {
      message: 'Payment verified! Here is your premium content.',
      marketData: {
        btcPrice: 97542.50,
        ethPrice: 3821.30,
        timestamp: new Date().toISOString(),
        source: 'Banksi x402 Demo',
      },
    },
  });
}
