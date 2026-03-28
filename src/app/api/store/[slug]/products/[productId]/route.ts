import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ slug: string; productId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { slug, productId } = await params;

    const merchant = await prisma.merchant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        storeBannerColor: true,
        storeIsPublic: true,
        isActive: true,
      },
    });

    if (!merchant || !merchant.isActive || !merchant.storeIsPublic) {
      return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        description: true,
        priceUsd: true,
        merchantId: true,
        isActive: true,
      },
    });

    if (!product || product.merchantId !== merchant.id || !product.isActive) {
      return NextResponse.json(
        { error: 'Product not found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        priceUsd: product.priceUsd,
      },
      merchant: {
        name: merchant.name,
        slug: merchant.slug,
        storeBannerColor: merchant.storeBannerColor,
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'An internal error occurred.' },
      { status: 500 },
    );
  }
}
