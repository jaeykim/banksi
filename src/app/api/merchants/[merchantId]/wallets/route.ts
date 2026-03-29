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
      select: { id: true, name: true },
    });
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found.' }, { status: 404 });
    }

    const wallets = await prisma.merchantWallet.findMany({
      where: { merchantId },
      include: {
        chain: { select: { id: true, name: true, isEvm: true, isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ merchantId: merchant.id, wallets });
  } catch (error) {
    console.error('Error fetching merchant wallets:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
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
    const { chainId, address } = body;

    if (!chainId || !address) {
      return NextResponse.json({ error: 'chainId and address are required.' }, { status: 400 });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true },
    });
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found.' }, { status: 404 });
    }

    const chain = await prisma.chain.findUnique({ where: { id: chainId } });
    if (!chain) {
      return NextResponse.json({ error: 'Chain not found.' }, { status: 404 });
    }
    if (!chain.isActive) {
      return NextResponse.json({ error: 'Chain is not active.' }, { status: 400 });
    }

    const wallet = await prisma.merchantWallet.upsert({
      where: { merchantId_chainId: { merchantId, chainId } },
      update: { address, isActive: true },
      create: { merchantId, chainId, address },
      include: { chain: { select: { id: true, name: true, isEvm: true } } },
    });

    return NextResponse.json({ wallet }, { status: 201 });
  } catch (error) {
    console.error('Error setting merchant wallet:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
