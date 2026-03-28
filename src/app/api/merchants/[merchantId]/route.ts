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

    // Allow if user belongs to this merchant or is admin
    const isAdmin = session.user.role === 'ADMIN';
    const isMerchantMember =
      session.user.role === 'MERCHANT' && session.user.merchantId === merchantId;

    if (!isAdmin && !isMerchantMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        merchantWallets: {
          include: { chain: { select: { id: true, name: true, isEvm: true } } },
        },
        _count: {
          select: {
            products: { where: { isActive: true } },
            payments: true,
          },
        },
        payments: {
          select: { fiatAmount: true, status: true },
        },
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found.' }, { status: 404 });
    }

    // Compute stats
    const totalVolume = merchant.payments
      .filter((p) => p.status === 'CONFIRMED' || p.status === 'SWEPT')
      .reduce((sum, p) => sum + p.fiatAmount, 0);

    const { payments: _payments, ...merchantData } = merchant;

    return NextResponse.json({
      merchant: {
        ...merchantData,
        stats: {
          productsCount: merchant._count.products,
          paymentsCount: merchant._count.payments,
          totalVolume,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching merchant:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
