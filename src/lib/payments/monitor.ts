import { prisma } from '@/lib/prisma';
import { getChainAdapter } from '@/lib/chains/registry';

async function getRequiredConfirmations(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'required_confirmations' } });
  return setting ? parseInt(setting.value) : parseInt(process.env.REQUIRED_CONFIRMATIONS || '3');
}

/**
 * Monitor all PENDING payments that haven't expired.
 * - For each pending payment, query the blockchain for incoming token transfers.
 * - If a matching transfer is found, update status to CONFIRMING and store txHash.
 * - For payments already in CONFIRMING state, check confirmation count.
 * - After enough confirmations, update status to CONFIRMED.
 * - Expired PENDING payments are marked as EXPIRED.
 */
export async function monitorPendingPayments(): Promise<{
  checked: number;
  confirmed: number;
  expired: number;
  errors: string[];
}> {
  const stats = { checked: 0, confirmed: 0, expired: 0, errors: [] as string[] };
  const now = new Date();
  const REQUIRED_CONFIRMATIONS = await getRequiredConfirmations();

  // 1. Mark expired payments
  const expiredResult = await prisma.payment.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now },
    },
    data: { status: 'EXPIRED' },
  });
  stats.expired = expiredResult.count;

  // 2. Fetch all active payments (PENDING or CONFIRMING)
  const activePayments = await prisma.payment.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMING'] },
      expiresAt: { gte: now },
    },
    include: {
      token: { select: { contractAddress: true, decimals: true } },
      derivedAddress: { select: { address: true } },
    },
  });

  // 3. Check each payment
  for (const payment of activePayments) {
    stats.checked++;
    try {
      if (!payment.derivedAddress?.address) {
        stats.errors.push(`Payment ${payment.id}: no derived address`);
        continue;
      }

      const adapter = getChainAdapter(payment.chainId);
      const address = payment.derivedAddress.address;
      const tokenContract = payment.token.contractAddress;

      if (payment.status === 'PENDING') {
        // Look for incoming transfers
        const transfers = await adapter.getIncomingTokenTransfers(address, tokenContract);

        if (transfers.length > 0) {
          // Take the first matching transfer
          const tx = transfers[0];
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'CONFIRMING',
              txHash: tx.txHash,
              amountReceived: tx.amount,
            },
          });
        }
      } else if (payment.status === 'CONFIRMING' && payment.txHash) {
        // Check confirmation count
        const txStatus = await adapter.checkTransaction(payment.txHash);

        if (txStatus.confirmed && txStatus.confirmations >= REQUIRED_CONFIRMATIONS) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'CONFIRMED',
              paidAt: new Date(),
            },
          });

          // Mark derived address as funded
          if (payment.derivedAddress) {
            await prisma.derivedAddress.update({
              where: { paymentId: payment.id },
              data: { isFunded: true },
            });
          }

          stats.confirmed++;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stats.errors.push(`Payment ${payment.id}: ${message}`);
    }
  }

  return stats;
}

/**
 * Check a single payment's status on-chain.
 * Useful for on-demand status checks via the API.
 */
export async function checkPaymentStatus(paymentId: string): Promise<{
  status: string;
  txHash: string | null;
  amountReceived: string | null;
  confirmations: number;
}> {
  const REQUIRED_CONFIRMATIONS = await getRequiredConfirmations();

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      token: { select: { contractAddress: true } },
      derivedAddress: { select: { address: true } },
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  // If already in a terminal state, return as-is
  if (['CONFIRMED', 'EXPIRED', 'SWEPT'].includes(payment.status)) {
    return {
      status: payment.status,
      txHash: payment.txHash,
      amountReceived: payment.amountReceived,
      confirmations: payment.status === 'CONFIRMED' ? REQUIRED_CONFIRMATIONS : 0,
    };
  }

  // Check expiry
  if (payment.status === 'PENDING' && payment.expiresAt < new Date()) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'EXPIRED' },
    });
    return { status: 'EXPIRED', txHash: null, amountReceived: null, confirmations: 0 };
  }

  if (!payment.derivedAddress?.address) {
    return {
      status: payment.status,
      txHash: payment.txHash,
      amountReceived: payment.amountReceived,
      confirmations: 0,
    };
  }

  const adapter = getChainAdapter(payment.chainId);
  const address = payment.derivedAddress.address;
  const tokenContract = payment.token.contractAddress;

  if (payment.status === 'PENDING') {
    // Look for incoming transfers
    const transfers = await adapter.getIncomingTokenTransfers(address, tokenContract);

    if (transfers.length > 0) {
      const tx = transfers[0];
      const txStatus = await adapter.checkTransaction(tx.txHash);

      if (txStatus.confirmed && txStatus.confirmations >= REQUIRED_CONFIRMATIONS) {
        // Directly confirmed with enough confirmations
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: 'CONFIRMED',
            txHash: tx.txHash,
            amountReceived: tx.amount,
            paidAt: new Date(),
          },
        });
        await prisma.derivedAddress.update({
          where: { paymentId },
          data: { isFunded: true },
        });
        return {
          status: 'CONFIRMED',
          txHash: tx.txHash,
          amountReceived: tx.amount,
          confirmations: txStatus.confirmations,
        };
      }

      // Not enough confirmations yet
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'CONFIRMING',
          txHash: tx.txHash,
          amountReceived: tx.amount,
        },
      });
      return {
        status: 'CONFIRMING',
        txHash: tx.txHash,
        amountReceived: tx.amount,
        confirmations: txStatus.confirmations,
      };
    }

    return { status: 'PENDING', txHash: null, amountReceived: null, confirmations: 0 };
  }

  // CONFIRMING -- check confirmation count
  if (payment.status === 'CONFIRMING' && payment.txHash) {
    const txStatus = await adapter.checkTransaction(payment.txHash);

    if (txStatus.confirmed && txStatus.confirmations >= REQUIRED_CONFIRMATIONS) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'CONFIRMED',
          paidAt: new Date(),
        },
      });
      await prisma.derivedAddress.update({
        where: { paymentId },
        data: { isFunded: true },
      });
      return {
        status: 'CONFIRMED',
        txHash: payment.txHash,
        amountReceived: payment.amountReceived,
        confirmations: txStatus.confirmations,
      };
    }

    return {
      status: 'CONFIRMING',
      txHash: payment.txHash,
      amountReceived: payment.amountReceived,
      confirmations: txStatus.confirmations,
    };
  }

  return {
    status: payment.status,
    txHash: payment.txHash,
    amountReceived: payment.amountReceived,
    confirmations: 0,
  };
}
