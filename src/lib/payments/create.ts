import { prisma } from '@/lib/prisma';
import { decryptMnemonic, encryptMnemonic } from '@/lib/crypto/encryption';
import { deriveAddress, generateMnemonic } from '@/lib/crypto/hd-wallet';
import type { ChainType } from '@/lib/chains/types';

interface CreatePaymentInput {
  merchantId: string;
  productId?: string;
  chainId: string;
  tokenId: string;
  fiatAmount: number;
  currency?: string;
  amountExpected: string; // token amount as string
  metadata?: string;
}

export async function createPayment(input: CreatePaymentInput) {
  const {
    merchantId,
    productId,
    chainId,
    tokenId,
    fiatAmount,
    currency = 'USD',
    amountExpected,
    metadata,
  } = input;

  // 1. Get or auto-create merchant's HD wallet config
  let hdConfig = await prisma.hdWalletConfig.findUnique({
    where: { merchantId },
  });

  if (!hdConfig) {
    const mnemonic = generateMnemonic();
    const encrypted = encryptMnemonic(mnemonic);
    hdConfig = await prisma.hdWalletConfig.create({
      data: {
        merchantId,
        encryptedMnemonic: encrypted.ciphertext,
        encryptionIv: encrypted.iv,
        encryptionTag: encrypted.tag,
      },
    });
  }

  // 2. Validate chain and token
  const chain = await prisma.chain.findUnique({
    where: { id: chainId },
  });

  if (!chain || !chain.isActive) {
    throw new Error(`Chain "${chainId}" not found or inactive`);
  }

  const token = await prisma.token.findUnique({
    where: { id: tokenId },
  });

  if (!token || token.chainId !== chainId || !token.isActive) {
    throw new Error(`Token "${tokenId}" not found or inactive on chain "${chainId}"`);
  }

  // 3. Try to reuse a swept or expired/failed address before deriving a new one
  const reusableAddress = await prisma.derivedAddress.findFirst({
    where: {
      merchantId,
      chainId,
      paymentId: { not: null },
      OR: [
        { isSwept: true },
        { payment: { status: { in: ['EXPIRED', 'FAILED'] } } },
      ],
    },
    include: { payment: true },
  });

  const expiryMinutes = parseInt(process.env.PAYMENT_EXPIRY_MINUTES || '30');
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  let result: { payment: { id: string; amountExpected: string; chainId: string; tokenId: string; currency: string; fiatAmount: number; status: string; expiresAt: Date; createdAt: Date }; derivedAddress: { address: string; derivationPath: string } };

  if (reusableAddress) {
    // Reuse this address — unlink from old payment, link to new one
    result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          merchantId,
          productId: productId || null,
          chainId,
          tokenId,
          amountExpected,
          currency,
          fiatAmount,
          status: 'PENDING',
          expiresAt,
          metadata: metadata || null,
        },
      });

      const derivedAddress = await tx.derivedAddress.update({
        where: { id: reusableAddress.id },
        data: {
          paymentId: payment.id,
          isSwept: false,
        },
      });

      return { payment, derivedAddress };
    });
  } else {
    // 4. Decrypt mnemonic and derive a new address
    const mnemonic = decryptMnemonic(
      hdConfig.encryptedMnemonic,
      hdConfig.encryptionIv,
      hdConfig.encryptionTag,
    );

    // Determine chain type from the chain ID format (evm:*, tron:*, solana:*)
    let chainType: ChainType;
    if (chainId.startsWith('evm:')) {
      chainType = 'evm';
    } else if (chainId.startsWith('tron:')) {
      chainType = 'tron';
    } else if (chainId.startsWith('solana:')) {
      chainType = 'solana';
    } else {
      chainType = chain.isEvm ? 'evm' : 'solana';
    }

    const derivationIndex = hdConfig.nextDerivationIndex;
    const { address, derivationPath } = deriveAddress(mnemonic, chainType, derivationIndex);

    // Atomically: increment nextDerivationIndex, create DerivedAddress, create Payment
    result = await prisma.$transaction(async (tx) => {
      // Increment derivation index
      await tx.hdWalletConfig.update({
        where: { id: hdConfig.id },
        data: { nextDerivationIndex: derivationIndex + 1 },
      });

      // Create Payment first to get its ID for the DerivedAddress link
      const payment = await tx.payment.create({
        data: {
          merchantId,
          productId: productId || null,
          chainId,
          tokenId,
          amountExpected,
          currency,
          fiatAmount,
          status: 'PENDING',
          expiresAt,
          metadata: metadata || null,
        },
      });

      // Create DerivedAddress linked to the payment
      const derivedAddress = await tx.derivedAddress.create({
        data: {
          merchantId,
          chainId,
          address,
          derivationIndex,
          derivationPath,
          paymentId: payment.id,
        },
      });

      return { payment, derivedAddress };
    });
  }

  // 6. Return payment with derived address info
  return {
    paymentId: result.payment.id,
    address: result.derivedAddress.address,
    derivationPath: result.derivedAddress.derivationPath,
    amountExpected: result.payment.amountExpected,
    chainId: result.payment.chainId,
    chainName: chain.name,
    tokenId: result.payment.tokenId,
    tokenSymbol: token.symbol,
    currency: result.payment.currency,
    fiatAmount: result.payment.fiatAmount,
    status: result.payment.status,
    expiresAt: result.payment.expiresAt,
    createdAt: result.payment.createdAt,
  };
}
