import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateApiKey } from '@/lib/merchants/create';

type RouteContext = { params: Promise<{ merchantId: string }> };

// POST /api/merchants/[merchantId]/api-key — Regenerate API key
export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { merchantId } = await params;
    const isAdmin = session.user.role === 'ADMIN';
    const isMerchant = session.user.role === 'MERCHANT' && session.user.merchantId === merchantId;

    if (!isAdmin && !isMerchant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const newKey = generateApiKey();
    await prisma.merchant.update({
      where: { id: merchantId },
      data: { apiKey: newKey },
    });

    return NextResponse.json({ apiKey: newKey });
  } catch (error) {
    console.error('Error regenerating API key:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
