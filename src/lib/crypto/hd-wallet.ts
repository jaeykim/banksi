import crypto from 'crypto';
import { ethers } from 'ethers';
import { Keypair } from '@solana/web3.js';

// ---------------------------------------------------------------------------
// Base58 encoding (Bitcoin alphabet) -- used for Tron address derivation
// ---------------------------------------------------------------------------

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(buffer: Buffer): string {
  const digits = [0];
  for (const byte of buffer) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  // Leading zeros
  let leadingZeros = '';
  for (const byte of buffer) {
    if (byte !== 0) break;
    leadingZeros += BASE58_ALPHABET[0];
  }

  return (
    leadingZeros +
    digits
      .reverse()
      .map((d) => BASE58_ALPHABET[d])
      .join('')
  );
}

function base58CheckEncode(payload: Buffer): string {
  const first = crypto.createHash('sha256').update(payload).digest();
  const second = crypto.createHash('sha256').update(first).digest();
  const checksum = second.subarray(0, 4);
  return base58Encode(Buffer.concat([payload, checksum]));
}

// ---------------------------------------------------------------------------
// Tron address helpers
// ---------------------------------------------------------------------------

/**
 * Convert a standard EVM hex address (0x...) to a Tron base58check address.
 * Tron addresses use the 0x41 prefix instead of 0x00.
 */
function evmAddressToTron(evmAddress: string): string {
  // Strip 0x, take last 40 hex chars (20 bytes), prepend 0x41
  const addressBytes = Buffer.from(evmAddress.replace(/^0x/, ''), 'hex');
  const payload = Buffer.concat([Buffer.from([0x41]), addressBytes]);
  return base58CheckEncode(payload);
}

// ---------------------------------------------------------------------------
// BIP-44 derivation paths
// ---------------------------------------------------------------------------

const DERIVATION_PATHS = {
  evm: (index: number) => `m/44'/60'/0'/0/${index}`,
  tron: (index: number) => `m/44'/195'/0'/0/${index}`,
  solana: (index: number) => `m/44'/501'/${index}'/0'`,
} as const;

// ---------------------------------------------------------------------------
// SLIP-10 ed25519 derivation (for Solana)
//
// Implements SLIP-0010 key derivation for the ed25519 curve so we can derive
// Solana keypairs from a BIP-39 mnemonic without extra dependencies.
// Only hardened derivation is supported (required by ed25519).
// ---------------------------------------------------------------------------

interface Slip10Result {
  key: Buffer;
  chainCode: Buffer;
}

function slip10DeriveChild(
  parentKey: Buffer,
  parentChainCode: Buffer,
  index: number
): Slip10Result {
  // Hardened child: index >= 0x80000000
  const hardenedIndex = index | 0x80000000;
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32BE(hardenedIndex >>> 0, 0);

  const data = Buffer.concat([Buffer.from([0x00]), parentKey, indexBuf]);
  const hmac = crypto.createHmac('sha512', parentChainCode).update(data).digest();

  return {
    key: hmac.subarray(0, 32),
    chainCode: hmac.subarray(32),
  };
}

function slip10DerivePath(
  seed: Buffer,
  path: string
): Slip10Result {
  // Master key
  const hmac = crypto
    .createHmac('sha512', Buffer.from('ed25519 seed'))
    .update(seed)
    .digest();
  let result: Slip10Result = {
    key: hmac.subarray(0, 32),
    chainCode: hmac.subarray(32),
  };

  // Parse path segments (e.g. m/44'/501'/0'/0')
  const segments = path
    .replace(/^m\//, '')
    .split('/')
    .map((s) => parseInt(s.replace("'", ''), 10));

  for (const seg of segments) {
    result = slip10DeriveChild(result.key, result.chainCode, seg);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a new BIP-39 mnemonic (128-bit entropy, 12 words).
 */
export function generateMnemonic(): string {
  const mnemonic = ethers.Mnemonic.entropyToPhrase(ethers.randomBytes(16));
  return mnemonic;
}

/**
 * Derive a blockchain address from a BIP-39 mnemonic.
 */
export function deriveAddress(
  mnemonic: string,
  chainType: 'evm' | 'tron' | 'solana',
  index: number
): { address: string; derivationPath: string } {
  const derivationPath = DERIVATION_PATHS[chainType](index);

  if (chainType === 'evm') {
    const mnemonicObj = ethers.Mnemonic.fromPhrase(mnemonic);
    const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonicObj, derivationPath);
    return { address: wallet.address, derivationPath };
  }

  if (chainType === 'tron') {
    const mnemonicObj = ethers.Mnemonic.fromPhrase(mnemonic);
    const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonicObj, derivationPath);
    const tronAddress = evmAddressToTron(wallet.address);
    return { address: tronAddress, derivationPath };
  }

  // Solana -- ed25519 via SLIP-10
  const seed = Buffer.from(
    ethers.Mnemonic.fromPhrase(mnemonic).computeSeed()
  );
  const derived = slip10DerivePath(seed, derivationPath);
  const keypair = Keypair.fromSeed(derived.key);
  return { address: keypair.publicKey.toBase58(), derivationPath };
}

/**
 * Derive a private key and address from a BIP-39 mnemonic.
 * WARNING: Only use server-side in secure contexts. Never expose private keys
 * to clients or logs.
 */
export function derivePrivateKey(
  mnemonic: string,
  chainType: 'evm' | 'tron' | 'solana',
  index: number
): { privateKey: string; address: string } {
  const derivationPath = DERIVATION_PATHS[chainType](index);

  if (chainType === 'evm') {
    const mnemonicObj = ethers.Mnemonic.fromPhrase(mnemonic);
    const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonicObj, derivationPath);
    return { privateKey: wallet.privateKey, address: wallet.address };
  }

  if (chainType === 'tron') {
    const mnemonicObj = ethers.Mnemonic.fromPhrase(mnemonic);
    const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonicObj, derivationPath);
    const tronAddress = evmAddressToTron(wallet.address);
    return { privateKey: wallet.privateKey, address: tronAddress };
  }

  // Solana -- ed25519 via SLIP-10
  const seed = Buffer.from(
    ethers.Mnemonic.fromPhrase(mnemonic).computeSeed()
  );
  const derived = slip10DerivePath(seed, derivationPath);
  const keypair = Keypair.fromSeed(derived.key);
  return {
    privateKey: Buffer.from(keypair.secretKey).toString('hex'),
    address: keypair.publicKey.toBase58(),
  };
}
