import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ merchantId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { merchantId } = await params;
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        products: { orderBy: { createdAt: 'desc' } },
        merchantWallets: {
          include: { chain: { select: { id: true, name: true, isEvm: true } } },
        },
        hdWalletConfig: {
          select: {
            id: true,
            derivationPathPrefix: true,
            nextDerivationIndex: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        users: { select: { id: true, email: true, name: true, role: true } },
        _count: { select: { payments: true } },
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found.' }, { status: 404 });
    }

    return NextResponse.json({ merchant });
  } catch (error) {
    console.error('Error fetching merchant:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { merchantId } = await params;
    const body = await request.json();
    const { name, isActive } = body;

    const data: Record<string, unknown> = {};
    if (typeof name === 'string') data.name = name;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const merchant = await prisma.merchant.update({
      where: { id: merchantId },
      data,
    });

    return NextResponse.json({ merchant });
  } catch (error) {
    console.error('Error updating merchant:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { merchantId } = await params;
    const merchant = await prisma.merchant.update({
      where: { id: merchantId },
      data: { isActive: false },
    });

    return NextResponse.json({
      message: 'Merchant deactivated.',
      merchant: { id: merchant.id, name: merchant.name, isActive: merchant.isActive },
    });
  } catch (error) {
    console.error('Error deactivating merchant:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
