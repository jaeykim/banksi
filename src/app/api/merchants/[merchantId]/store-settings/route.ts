import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ merchantId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
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
    const session = await getServerSession(authOptions);
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
    const { storeDescription, storeLogo, storeBannerColor, storeIsPublic } = body;

    const data: Record<string, unknown> = {};
    if (typeof storeDescription === 'string') data.storeDescription = storeDescription;
    if (typeof storeLogo === 'string') data.storeLogo = storeLogo;
    if (typeof storeBannerColor === 'string') data.storeBannerColor = storeBannerColor;
    if (typeof storeIsPublic === 'boolean') data.storeIsPublic = storeIsPublic;

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

    return NextResponse.json({ storeSettings: merchant });
  } catch (error) {
    console.error('Error updating store settings:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
