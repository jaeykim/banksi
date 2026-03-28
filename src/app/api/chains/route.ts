import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { corsHeaders, corsOptionsResponse } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS() { return corsOptionsResponse(); }

export async function GET() {
  try {
    const chains = await prisma.chain.findMany({
      where: { isActive: true },
      include: {
        tokens: {
          where: { isActive: true },
          select: {
            id: true,
            symbol: true,
            name: true,
            contractAddress: true,
            decimals: true,
          },
          orderBy: { symbol: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return corsHeaders(NextResponse.json({ chains }));
  } catch (error) {
    console.error('Error listing chains:', error);
    return NextResponse.json(
      { error: 'An internal error occurred.' },
      { status: 500 }
    );
  }
}
