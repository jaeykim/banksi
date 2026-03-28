import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    return NextResponse.json({ chains });
  } catch (error) {
    console.error('Error listing chains:', error);
    return NextResponse.json(
      { error: 'An internal error occurred.' },
      { status: 500 }
    );
  }
}
