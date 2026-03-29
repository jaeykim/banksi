import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import { generateApiKey } from '@/lib/merchants/create';

type RouteContext = { params: Promise<{ merchantId: string }> };

// POST /api/merchants/[merchantId]/api-key — Regenerate API key
export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getSession();
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
