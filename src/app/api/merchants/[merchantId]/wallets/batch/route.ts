import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ merchantId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
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
    const { chainIds, address } = body as { chainIds: string[]; address: string };

    if (!chainIds || !Array.isArray(chainIds) || chainIds.length === 0 || !address) {
      return NextResponse.json(
        { error: 'chainIds (array) and address are required.' },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true },
    });
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found.' }, { status: 404 });
    }

    const chains = await prisma.chain.findMany({
      where: { id: { in: chainIds }, isActive: true },
    });
    if (chains.length === 0) {
      return NextResponse.json({ error: 'No valid active chains found.' }, { status: 400 });
    }

    const wallets = await prisma.$transaction(
      chains.map((chain) =>
        prisma.merchantWallet.upsert({
          where: { merchantId_chainId: { merchantId, chainId: chain.id } },
          update: { address, isActive: true },
          create: { merchantId, chainId: chain.id, address },
          include: { chain: { select: { id: true, name: true, isEvm: true } } },
        })
      )
    );

    return NextResponse.json({ wallets }, { status: 201 });
  } catch (error) {
    console.error('Error batch-setting merchant wallets:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
