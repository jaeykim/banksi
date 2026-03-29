import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPayment } from '@/lib/payments/create';
import { authenticateApiKey } from '@/lib/auth-api-key';
import { corsHeaders, corsOptionsResponse } from '@/lib/cors';

export async function OPTIONS() { return corsOptionsResponse(); }

function corsJson(data: unknown, status: number) {
  return corsHeaders(NextResponse.json(data, { status }));
}

// POST /api/x402/pay — Create a payment for x402 paywall
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchantSlug, chainId, tokenId, amount } = body;

    if (!chainId || !tokenId || !amount) {
      return corsJson({ error: 'chainId, tokenId, and amount are required.' }, 400);
    }

    let merchantId: string;
    let resolvedSlug: string;

    const apiMerchant = await authenticateApiKey(request);
    if (apiMerchant) {
      merchantId = apiMerchant.id;
      resolvedSlug = apiMerchant.slug;
    } else if (merchantSlug) {
      const merchant = await prisma.merchant.findUnique({
        where: { slug: merchantSlug },
        select: { id: true, slug: true, isActive: true },
      });
      if (!merchant || !merchant.isActive) {
        return corsJson({ error: 'Merchant not found.' }, 404);
      }
      merchantId = merchant.id;
      resolvedSlug = merchant.slug;
    } else {
      return corsJson({ error: 'Provide Authorization header (Bearer bks_xxx) or merchantSlug in body.' }, 400);
    }

    const token = await prisma.token.findUnique({ where: { id: tokenId } });
    if (!token || !token.isActive) {
      return corsJson({ error: 'Token not found.' }, 404);
    }

    const result = await createPayment({
      merchantId,
      chainId,
      tokenId,
      fiatAmount: parseFloat(amount),
      currency: 'USD',
      amountExpected: parseFloat(amount).toString(),
      metadata: JSON.stringify({ type: 'x402', merchantSlug: resolvedSlug }),
    });

    return corsJson({
      paymentId: result.paymentId,
      address: result.address,
      amountExpected: result.amountExpected,
      tokenSymbol: result.tokenSymbol,
      chainName: result.chainName,
      expiresAt: result.expiresAt,
    }, 201);
  } catch (error) {
    console.error('x402 pay error:', error);
    const msg = error instanceof Error ? error.message : 'An internal error occurred.';
    return corsJson({ error: msg }, 500);
  }
}
