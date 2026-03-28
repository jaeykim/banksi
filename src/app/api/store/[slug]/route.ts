import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    const merchant = await prisma.merchant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        storeDescription: true,
        storeLogo: true,
        storeBannerColor: true,
        storeIsPublic: true,
        isActive: true,
        products: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            priceUsd: true,
            imageUrl: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!merchant || !merchant.isActive || !merchant.storeIsPublic) {
      return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    }

    return NextResponse.json({
      merchant: {
        name: merchant.name,
        slug: merchant.slug,
        storeDescription: merchant.storeDescription,
        storeBannerColor: merchant.storeBannerColor,
        storeLogo: merchant.storeLogo,
      },
      products: merchant.products,
    });
  } catch (error) {
    console.error('Error fetching storefront:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
