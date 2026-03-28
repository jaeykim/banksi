import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateMnemonic } from '@/lib/crypto/hd-wallet';
import { encryptMnemonic } from '@/lib/crypto/encryption';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { merchantId } = body;

    if (!merchantId) {
      return NextResponse.json(
        { error: 'merchantId is required.' },
        { status: 400 }
      );
    }

    // Verify merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) {
      return NextResponse.json(
        { error: 'Merchant not found.' },
        { status: 404 }
      );
    }

    // Check if merchant already has an HD wallet config
    const existingConfig = await prisma.hdWalletConfig.findUnique({
      where: { merchantId },
    });
    if (existingConfig) {
      return NextResponse.json(
        { error: 'Merchant already has an HD wallet configuration.' },
        { status: 409 }
      );
    }

    // Generate and encrypt mnemonic
    const mnemonic = generateMnemonic();
    const { ciphertext, iv, tag } = encryptMnemonic(mnemonic);

    // Save encrypted mnemonic to database
    await prisma.hdWalletConfig.create({
      data: {
        merchantId,
        encryptedMnemonic: ciphertext,
        encryptionIv: iv,
        encryptionTag: tag,
      },
    });

    return NextResponse.json(
      { message: 'Mnemonic generated and saved successfully.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating mnemonic:', error);
    return NextResponse.json(
      { error: 'An internal error occurred.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const merchants = await prisma.merchant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        hdWalletConfig: {
          select: {
            id: true,
            nextDerivationIndex: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = merchants.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      isActive: m.isActive,
      hasMnemonic: !!m.hdWalletConfig,
      nextDerivationIndex: m.hdWalletConfig?.nextDerivationIndex ?? null,
      hdWalletConfigCreatedAt: m.hdWalletConfig?.createdAt ?? null,
    }));

    return NextResponse.json({ merchants: result });
  } catch (error) {
    console.error('Error listing mnemonic status:', error);
    return NextResponse.json(
      { error: 'An internal error occurred.' },
      { status: 500 }
    );
  }
}
