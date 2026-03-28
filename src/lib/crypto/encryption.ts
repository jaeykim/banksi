import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKek(): Buffer {
  const key = process.env.MNEMONIC_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('MNEMONIC_ENCRYPTION_KEY must be a 64-char hex string');
  }
  return Buffer.from(key, 'hex');
}

export function encryptMnemonic(plaintext: string): {
  ciphertext: string;
  iv: string;
  tag: string;
} {
  const kek = getKek();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, kek, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptMnemonic(
  ciphertext: string,
  iv: string,
  tag: string
): string {
  const kek = getKek();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    kek,
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
