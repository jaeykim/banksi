import { prisma } from '@/lib/prisma';
import { generateMnemonic } from '@/lib/crypto/hd-wallet';
import { encryptMnemonic } from '@/lib/crypto/encryption';
import crypto from 'crypto';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function generateApiKey(): string {
  return 'bks_' + crypto.randomBytes(24).toString('hex');
}

/**
 * Create a merchant with HD wallet and API key in a single transaction.
 */
export async function createMerchantWithWallet(opts: {
  name: string;
  slug?: string;
  userId?: string;
  userEmail?: string;
  userPasswordHash?: string;
  userName?: string;
  firebaseUid?: string;
}) {
  let slug = opts.slug || slugify(opts.name);
  const existing = await prisma.merchant.findUnique({ where: { slug } });
  if (existing) {
    slug = slug + '-' + crypto.randomBytes(3).toString('hex');
  }

  const apiKey = generateApiKey();
  const mnemonic = generateMnemonic();
  const encrypted = encryptMnemonic(mnemonic);

  const merchant = await prisma.$transaction(async (tx) => {
    const m = await tx.merchant.create({
      data: {
        name: opts.name,
        slug,
        apiKey,
        storeIsPublic: true,
        storeBannerColor: '#4f46e5',
      },
    });

    await tx.hdWalletConfig.create({
      data: {
        merchantId: m.id,
        encryptedMnemonic: encrypted.ciphertext,
        encryptionIv: encrypted.iv,
        encryptionTag: encrypted.tag,
      },
    });

    if (opts.userId) {
      await tx.user.update({
        where: { id: opts.userId },
        data: { merchantId: m.id, role: 'MERCHANT' },
      });
    } else if (opts.userEmail) {
      await tx.user.create({
        data: {
          email: opts.userEmail,
          passwordHash: opts.userPasswordHash || null,
          firebaseUid: opts.firebaseUid || null,
          name: opts.userName || opts.name,
          role: 'MERCHANT',
          merchantId: m.id,
        },
      });
    }

    return m;
  });

  return { merchant, apiKey, slug };
}
