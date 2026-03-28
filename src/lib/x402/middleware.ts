import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface X402Config {
  merchantSlug: string;
  amount: number;
  description?: string;
}

/**
 * x402 Payment Required middleware.
 *
 * Check for a valid X-Payment header. If absent or invalid, return 402 with
 * payment instructions. If valid (CONFIRMED/SWEPT payment), return null to
 * let the request proceed.
 */
export async function requirePayment(
  request: NextRequest,
  config: X402Config
): Promise<NextResponse | null> {
  const paymentId = request.headers.get('X-Payment');

  if (paymentId) {
    // Verify the payment exists and is confirmed
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, status: true, fiatAmount: true, merchant: { select: { slug: true } } },
    });

    if (
      payment &&
      ['CONFIRMED', 'SWEPT'].includes(payment.status) &&
      payment.merchant.slug === config.merchantSlug &&
      payment.fiatAmount >= config.amount
    ) {
      // Payment verified — let request through
      return null;
    }

    // Payment exists but not valid
    if (payment && payment.status === 'PENDING') {
      return NextResponse.json(
        {
          status: 402,
          error: 'Payment not yet confirmed. Please wait for blockchain confirmation.',
          paymentId: payment.id,
          paymentStatus: payment.status,
        },
        { status: 402 }
      );
    }
  }

  // No payment or invalid — return 402 with instructions
  const merchant = await prisma.merchant.findUnique({
    where: { slug: config.merchantSlug },
    select: { name: true },
  });

  const chains = await prisma.chain.findMany({
    where: { isActive: true },
    include: { tokens: { where: { isActive: true }, select: { id: true, symbol: true } } },
  });

  const baseUrl = request.nextUrl.origin;

  return NextResponse.json(
    {
      status: 402,
      paymentRequired: {
        scheme: 'x402',
        version: '0.1',
        description: config.description || 'Payment required to access this resource.',
        merchant: config.merchantSlug,
        merchantName: merchant?.name || config.merchantSlug,
        amount: config.amount,
        currency: 'USD',
        chains: chains.map((c) => ({
          id: c.id,
          name: c.name,
          tokens: c.tokens.map((t) => ({ id: t.id, symbol: t.symbol })),
        })),
        payUrl: `${baseUrl}/api/x402/pay`,
        howToPay: [
          `1. POST ${baseUrl}/api/x402/pay with { "merchantSlug": "${config.merchantSlug}", "chainId": "<chain>", "tokenId": "<token>", "amount": ${config.amount} }`,
          '2. Send the specified amount of stablecoin to the returned address.',
          '3. Wait for blockchain confirmation.',
          '4. Retry this request with header: X-Payment: <paymentId>',
        ],
      },
    },
    { status: 402 }
  );
}
