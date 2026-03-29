import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ merchantId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { merchantId } = await params;

    const isAdmin = session.user.role === 'ADMIN';
    const isMerchantMember =
      session.user.role === 'MERCHANT' && session.user.merchantId === merchantId;

    if (!isAdmin && !isMerchantMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        storeDescription: true,
        storeLogo: true,
        storeBannerColor: true,
        storeIsPublic: true,
        slug: true,
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found.' }, { status: 404 });
    }

    return NextResponse.json({ storeSettings: merchant });
  } catch (error) {
    console.error('Error fetching store settings:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { merchantId } = await params;

    const isAdmin = session.user.role === 'ADMIN';
    const isMerchantMember =
      session.user.role === 'MERCHANT' && session.user.merchantId === merchantId;

    if (!isAdmin && !isMerchantMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { storeDescription, storeLogo, storeBannerColor, storeIsPublic, slug } = body;

    const data: Record<string, unknown> = {};
    if (typeof storeDescription === 'string') data.storeDescription = storeDescription;
    if (typeof storeLogo === 'string') data.storeLogo = storeLogo;
    if (typeof storeBannerColor === 'string') data.storeBannerColor = storeBannerColor;
    if (typeof storeIsPublic === 'boolean') data.storeIsPublic = storeIsPublic;

    // Slug update with uniqueness check
    if (typeof slug === 'string' && slug.trim()) {
      const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-|-$/g, '');
      if (cleanSlug.length < 2) {
        return NextResponse.json({ error: 'Slug must be at least 2 characters.' }, { status: 400 });
      }
      const existing = await prisma.merchant.findUnique({ where: { slug: cleanSlug } });
      if (existing && existing.id !== merchantId) {
        return NextResponse.json({ error: 'This slug is already taken.' }, { status: 409 });
      }
      data.slug = cleanSlug;
    }

    const merchant = await prisma.merchant.update({
      where: { id: merchantId },
      data,
      select: {
        storeDescription: true,
        storeLogo: true,
        storeBannerColor: true,
        storeIsPublic: true,
        slug: true,
      },
    });

    return NextResponse.json({ merchant });
  } catch (error) {
    console.error('Error updating store settings:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
