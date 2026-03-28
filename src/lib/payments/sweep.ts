import { prisma } from '@/lib/prisma';
import { decryptMnemonic } from '@/lib/crypto/encryption';
import { derivePrivateKey } from '@/lib/crypto/hd-wallet';
import { getChainAdapter } from '@/lib/chains/registry';
import type { ChainType } from '@/lib/chains/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SweepResult {
  paymentId: string;
  sweepJobId: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  merchantAmount: string;
  feeAmount: string | null;
  feePercent: number | null;
  chainId: string;
  txHash: string | null;
  feeTxHash: string | null;
  status: 'SUBMITTED' | 'FAILED';
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveChainType(chainId: string, isEvm: boolean, chainName?: string): ChainType {
  if (isEvm) return 'evm';
  if (chainId === 'tron' || chainId.startsWith('tron:') || chainName?.toLowerCase().includes('tron')) return 'tron';
  return 'solana';
}

async function getSweepFeePercent(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'sweep_fee_percent' } });
  return setting ? parseFloat(setting.value) : 0;
}

async function getSweepFeeAddress(): Promise<string | null> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'sweep_fee_address' } });
  return setting?.value || null;
}

// ---------------------------------------------------------------------------
// Sweep a single payment
// ---------------------------------------------------------------------------

export async function sweepPayment(paymentId: string): Promise<SweepResult> {
  // 1. Load the payment with its derived address, chain, and token
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      derivedAddress: true,
      chain: true,
      token: true,
    },
  });

  if (!payment) {
    throw new Error(`Payment "${paymentId}" not found`);
  }

  if (payment.status !== 'CONFIRMED') {
    throw new Error(
      `Payment "${paymentId}" is not CONFIRMED (current status: ${payment.status})`,
    );
  }

  const derivedAddr = payment.derivedAddress;
  if (!derivedAddr) {
    throw new Error(`Payment "${paymentId}" has no derived address`);
  }

  if (derivedAddr.isSwept) {
    throw new Error(`Payment "${paymentId}" has already been swept`);
  }

  // 2. Get merchant wallet for this chain (withdrawal destination)
  const merchantWallet = await prisma.merchantWallet.findUnique({
    where: {
      merchantId_chainId: {
        merchantId: payment.merchantId,
        chainId: payment.chainId,
      },
    },
  });

  if (!merchantWallet) {
    throw new Error(
      `No merchant wallet found for merchant "${payment.merchantId}" on chain "${payment.chainId}"`,
    );
  }

  // 3. Get HD wallet config and decrypt mnemonic
  const hdConfig = await prisma.hdWalletConfig.findUnique({
    where: { merchantId: payment.merchantId },
  });

  if (!hdConfig) {
    throw new Error(
      `No HD wallet config found for merchant "${payment.merchantId}"`,
    );
  }

  const mnemonic = decryptMnemonic(
    hdConfig.encryptedMnemonic,
    hdConfig.encryptionIv,
    hdConfig.encryptionTag,
  );

  // 4. Derive private key
  const chainType = resolveChainType(payment.chainId, payment.chain.isEvm, payment.chain.name);
  const { privateKey, address: derivedAddress } = derivePrivateKey(
    mnemonic,
    chainType,
    derivedAddr.derivationIndex,
  );

  // Verify derived address matches
  if (derivedAddress !== derivedAddr.address) {
    throw new Error(
      `Derived address mismatch: expected ${derivedAddr.address}, got ${derivedAddress}`,
    );
  }

  const adapter = getChainAdapter(payment.chainId);
  const toAddress = merchantWallet.address;

  // 5. Check token balance on derived address
  const balance = await adapter.getTokenBalance(
    derivedAddr.address,
    payment.token.contractAddress,
  );

  if (balance === '0') {
    throw new Error(
      `No token balance on derived address ${derivedAddr.address}`,
    );
  }

  // Use the actual balance for the sweep
  const sweepAmount = balance;

  // 6. Calculate fee split upfront
  const feePercent = await getSweepFeePercent();
  const feeAddress = await getSweepFeeAddress();
  const decimals = payment.token.decimals;

  let merchantAmount = sweepAmount;
  let feeAmount = '0';

  if (feePercent > 0 && feeAddress) {
    const totalRaw = BigInt(Math.round(parseFloat(sweepAmount) * (10 ** decimals)));
    const feeRaw = totalRaw * BigInt(Math.round(feePercent * 100)) / BigInt(10000);
    const merchantRaw = totalRaw - feeRaw;

    if (feeRaw > BigInt(0)) {
      feeAmount = (Number(feeRaw) / (10 ** decimals)).toString();
      merchantAmount = (Number(merchantRaw) / (10 ** decimals)).toString();
    }
  }

  // Create sweep job with fee info
  const sweepJob = await prisma.sweepJob.create({
    data: {
      merchantId: payment.merchantId,
      chainId: payment.chainId,
      fromAddress: derivedAddr.address,
      toAddress,
      amount: sweepAmount,
      merchantAmount,
      feeAmount: feeAmount !== '0' ? feeAmount : null,
      feePercent: feePercent > 0 ? feePercent : null,
      feeAddress: feeAmount !== '0' ? feeAddress : null,
      status: 'PENDING',
    },
  });

  try {
    // 7. Gas funding: send native token from funder wallet to cover gas
    const gasFunderKey = process.env.GAS_FUNDER_PRIVATE_KEY;
    if (!gasFunderKey) {
      throw new Error('GAS_FUNDER_PRIVATE_KEY is not configured');
    }

    const estimatedGas = await adapter.estimateSweepGas(
      derivedAddr.address,
      toAddress,
      payment.token.contractAddress,
      sweepAmount,
    );

    // Send gas funding — add extra buffer if we need 2 txs (merchant + fee)
    const gasBI = BigInt(estimatedGas);
    const multiplier = feeAmount !== '0' ? BigInt(3) : BigInt(1); // 3x for 2 transfers + margin
    const gasWithBuffer = gasBI * multiplier;
    await adapter.sendNative(
      gasFunderKey,
      derivedAddr.address,
      gasWithBuffer.toString(),
    );

    await prisma.derivedAddress.update({
      where: { id: derivedAddr.id },
      data: { isFunded: true },
    });

    // 8. Sweep to merchant first (critical path)
    const txHash = await adapter.sweep(
      privateKey,
      toAddress,
      payment.token.contractAddress,
      merchantAmount,
    );

    // 9. Fee transfer (best-effort — merchant already got paid)
    let feeTxHash: string | null = null;
    let feeError: string | null = null;

    if (feeAmount !== '0' && feeAddress) {
      try {
        feeTxHash = await adapter.sweep(
          privateKey,
          feeAddress,
          payment.token.contractAddress,
          feeAmount,
        );
      } catch (err) {
        feeError = err instanceof Error ? err.message : 'Fee transfer failed';
        console.error(`[sweep] Fee transfer failed for payment ${payment.id}: ${feeError}`);
      }
    }

    // 10. Update records
    const errorNote = feeError ? `Fee transfer failed: ${feeError}` : null;

    await prisma.$transaction([
      prisma.sweepJob.update({
        where: { id: sweepJob.id },
        data: {
          status: 'SUBMITTED',
          txHash,
          feeTxHash,
          errorMessage: errorNote,
        },
      }),
      prisma.derivedAddress.update({
        where: { id: derivedAddr.id },
        data: { isSwept: true },
      }),
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'SWEPT' },
      }),
    ]);

    return {
      paymentId: payment.id,
      sweepJobId: sweepJob.id,
      fromAddress: derivedAddr.address,
      toAddress,
      amount: sweepAmount,
      merchantAmount,
      feeAmount: feeAmount !== '0' ? feeAmount : null,
      feePercent: feePercent > 0 ? feePercent : null,
      chainId: payment.chainId,
      txHash,
      feeTxHash,
      status: 'SUBMITTED',
    };
  } catch (err) {
    // Record the failure
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown sweep error';

    await prisma.sweepJob.update({
      where: { id: sweepJob.id },
      data: { status: 'FAILED', errorMessage },
    });

    return {
      paymentId: payment.id,
      sweepJobId: sweepJob.id,
      fromAddress: derivedAddr.address,
      toAddress,
      amount: sweepAmount,
      merchantAmount,
      feeAmount: feeAmount !== '0' ? feeAmount : null,
      feePercent: feePercent > 0 ? feePercent : null,
      chainId: payment.chainId,
      txHash: null,
      feeTxHash: null,
      status: 'FAILED',
      error: errorMessage,
    };
  }
}

// ---------------------------------------------------------------------------
// Sweep all confirmed payments for a given merchant
// ---------------------------------------------------------------------------

export async function sweepMerchantFunds(
  merchantId: string,
): Promise<SweepResult[]> {
  const payments = await prisma.payment.findMany({
    where: {
      merchantId,
      status: 'CONFIRMED',
      derivedAddress: {
        isSwept: false,
      },
    },
    select: { id: true },
  });

  const results: SweepResult[] = [];

  for (const payment of payments) {
    try {
      const result = await sweepPayment(payment.id);
      results.push(result);
    } catch (err) {
      results.push({
        paymentId: payment.id,
        sweepJobId: '',
        fromAddress: '',
        toAddress: '',
        amount: '0',
        merchantAmount: '0',
        feeAmount: null,
        feePercent: null,
        chainId: '',
        txHash: null,
        feeTxHash: null,
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Sweep all confirmed payments across all merchants
// ---------------------------------------------------------------------------

export async function sweepAllConfirmed(): Promise<{
  swept: number;
  failed: number;
  results: SweepResult[];
}> {
  const payments = await prisma.payment.findMany({
    where: {
      status: 'CONFIRMED',
      derivedAddress: {
        isSwept: false,
      },
    },
    select: { id: true },
  });

  const results: SweepResult[] = [];
  let swept = 0;
  let failed = 0;

  for (const payment of payments) {
    try {
      const result = await sweepPayment(payment.id);
      results.push(result);

      if (result.status === 'SUBMITTED') {
        swept++;
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
      results.push({
        paymentId: payment.id,
        sweepJobId: '',
        fromAddress: '',
        toAddress: '',
        amount: '0',
        merchantAmount: '0',
        feeAmount: null,
        feePercent: null,
        chainId: '',
        txHash: null,
        feeTxHash: null,
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return { swept, failed, results };
}
