import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPayment } from '@/lib/payments/create';

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { productId, chainId, tokenId } = body;

    if (!productId || !chainId || !tokenId) {
      return NextResponse.json(
        { error: 'productId, chainId, and tokenId are required.' },
        { status: 400 }
      );
    }

    // Look up merchant by slug
    const merchant = await prisma.merchant.findUnique({
      where: { slug },
      select: { id: true, isActive: true, storeIsPublic: true },
    });

    if (!merchant || !merchant.isActive || !merchant.storeIsPublic) {
      return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    }

    // Look up product
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.merchantId !== merchant.id || !product.isActive) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // Look up token to get decimals for amount conversion
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
    });

    if (!token || !token.isActive) {
      return NextResponse.json({ error: 'Token not found.' }, { status: 404 });
    }

    // Stablecoins are 1:1 with USD — use human-readable amount
    const amountExpected = product.priceUsd.toString();

    const result = await createPayment({
      merchantId: merchant.id,
      productId: product.id,
      chainId,
      tokenId,
      fiatAmount: product.priceUsd,
      currency: 'USD',
      amountExpected,
    });

    return NextResponse.json({
      paymentId: result.paymentId,
      address: result.address,
      amountExpected: result.amountExpected,
      expiresAt: result.expiresAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating storefront payment:', error);
    const message =
      error instanceof Error ? error.message : 'An internal error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
