import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { generateMnemonic } from '@/lib/crypto/hd-wallet';
import { encryptMnemonic } from '@/lib/crypto/encryption';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const merchants = await prisma.merchant.findMany({
      include: {
        hdWalletConfig: {
          select: {
            id: true,
            nextDerivationIndex: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = merchants.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      isActive: m.isActive,
      hasHdWalletConfig: !!m.hdWalletConfig,
      nextDerivationIndex: m.hdWalletConfig?.nextDerivationIndex ?? null,
      userCount: m._count.users,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    return NextResponse.json({ merchants: result });
  } catch (error) {
    console.error('Error listing merchants:', error);
    return NextResponse.json(
      { error: 'An internal error occurred.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, user } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required.' },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase alphanumeric with hyphens only.' },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    const existing = await prisma.merchant.findUnique({
      where: { slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A merchant with this slug already exists.' },
        { status: 409 }
      );
    }

    // Create merchant, optionally with a user
    const merchant = await prisma.merchant.create({
      data: {
        name,
        slug,
        ...(user && user.email && user.password
          ? {
              users: {
                create: {
                  name: user.name || name,
                  email: user.email.toLowerCase(),
                  passwordHash: await hash(user.password, 12),
                  role: 'MERCHANT',
                },
              },
            }
          : {}),
      },
      include: {
        users: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    });

    // Auto-generate HD wallet mnemonic
    const mnemonic = generateMnemonic();
    const encrypted = encryptMnemonic(mnemonic);
    await prisma.hdWalletConfig.create({
      data: {
        merchantId: merchant.id,
        encryptedMnemonic: encrypted.ciphertext,
        encryptionIv: encrypted.iv,
        encryptionTag: encrypted.tag,
      },
    });

    return NextResponse.json({ merchant }, { status: 201 });
  } catch (error) {
    console.error('Error creating merchant:', error);
    return NextResponse.json(
      { error: 'An internal error occurred.' },
      { status: 500 }
    );
  }
}
