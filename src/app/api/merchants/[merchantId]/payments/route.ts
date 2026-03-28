import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPayment } from '@/lib/payments/create';

type RouteContext = { params: Promise<{ merchantId: string }> };

// GET /api/merchants/[merchantId]/payments - List payments with pagination & filters
export async function GET(request: NextRequest, { params }: RouteContext) {
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

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { merchantId };
    if (status) {
      where.status = status.toUpperCase();
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          chain: { select: { id: true, name: true } },
          token: { select: { id: true, symbol: true, name: true } },
          product: { select: { id: true, name: true } },
          derivedAddress: { select: { address: true, derivationPath: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing payments:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}

// POST /api/merchants/[merchantId]/payments - Create a new payment
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
    const { productId, chainId, tokenId, fiatAmount, amountExpected, currency, metadata } = body;

    // Validate required fields
    if (!chainId || !tokenId || fiatAmount == null || !amountExpected) {
      return NextResponse.json(
        { error: 'Missing required fields: chainId, tokenId, fiatAmount, amountExpected' },
        { status: 400 },
      );
    }

    if (typeof fiatAmount !== 'number' || fiatAmount <= 0) {
      return NextResponse.json(
        { error: 'fiatAmount must be a positive number' },
        { status: 400 },
      );
    }

    const result = await createPayment({
      merchantId,
      productId,
      chainId,
      tokenId,
      fiatAmount,
      amountExpected: String(amountExpected),
      currency,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });

    return NextResponse.json(
      {
        paymentId: result.paymentId,
        address: result.address,
        amountExpected: result.amountExpected,
        chainId: result.chainId,
        tokenSymbol: result.tokenSymbol,
        expiresAt: result.expiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating payment:', error);
    const message =
      error instanceof Error ? error.message : 'An internal error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
