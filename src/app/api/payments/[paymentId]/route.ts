import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ paymentId: string }> };

// GET /api/payments/[paymentId] - Public endpoint for payment page
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { paymentId } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        chain: {
          select: { id: true, name: true, explorerUrl: true },
        },
        token: {
          select: { id: true, symbol: true, name: true, decimals: true, contractAddress: true },
        },
        derivedAddress: {
          select: { address: true },
        },
        merchant: {
          select: { name: true, slug: true },
        },
        product: {
          select: { id: true, name: true, description: true, priceUsd: true, imageUrl: true },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Auto-expire PENDING payments past their expiry
    if (payment.status === 'PENDING' && payment.expiresAt < new Date()) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'EXPIRED' },
      });
      payment.status = 'EXPIRED';
    }

    // Build explorer URL for transaction if available
    let txExplorerUrl: string | null = null;
    if (payment.txHash && payment.chain.explorerUrl) {
      const base = payment.chain.explorerUrl.replace(/\/$/, '');
      txExplorerUrl = `${base}/tx/${payment.txHash}`;
    }

    // Build explorer URL for the deposit address
    let addressExplorerUrl: string | null = null;
    if (payment.derivedAddress?.address && payment.chain.explorerUrl) {
      const base = payment.chain.explorerUrl.replace(/\/$/, '');
      addressExplorerUrl = `${base}/address/${payment.derivedAddress.address}`;
    }

    return NextResponse.json({
      payment: {
        id: payment.id,
        status: payment.status,
        address: payment.derivedAddress?.address ?? null,
        amountExpected: payment.amountExpected,
        amountReceived: payment.amountReceived,
        currency: payment.currency,
        fiatAmount: payment.fiatAmount,
        chain: {
          id: payment.chain.id,
          name: payment.chain.name,
        },
        token: {
          id: payment.token.id,
          symbol: payment.token.symbol,
          name: payment.token.name,
          decimals: payment.token.decimals,
          contractAddress: payment.token.contractAddress,
        },
        merchant: {
          name: payment.merchant.name,
        },
        product: payment.product
          ? {
              id: payment.product.id,
              name: payment.product.name,
              description: payment.product.description,
              imageUrl: payment.product.imageUrl,
            }
          : null,
        txHash: payment.txHash,
        txExplorerUrl,
        addressExplorerUrl,
        paidAt: payment.paidAt,
        expiresAt: payment.expiresAt,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
