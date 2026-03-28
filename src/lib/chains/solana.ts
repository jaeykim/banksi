import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import type { ChainAdapter, ChainType, TxStatus, IncomingTx } from './types';

/**
 * Solana chain adapter.
 *
 * Solana's token model differs from EVM: tokens live in Associated Token
 * Accounts (ATAs) owned by the wallet, not in a single contract mapping.
 * This adapter bridges that model to the common ChainAdapter interface.
 */
export class SolanaChainAdapter implements ChainAdapter {
  public readonly chainType: ChainType = 'solana';
  public readonly chainId: string;
  private readonly connection: Connection;

  constructor(chainId: string, rpcUrl: string) {
    this.chainId = chainId;
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  // ---- native SOL balance (in lamports) ----

  async getBalance(address: string): Promise<string> {
    const pubkey = new PublicKey(address);
    const lamports = await this.connection.getBalance(pubkey);
    return lamports.toString();
  }

  // ---- SPL token balance ----

  async getTokenBalance(
    address: string,
    tokenContract: string,
  ): Promise<string> {
    const owner = new PublicKey(address);
    const mint = new PublicKey(tokenContract);

    const ata = await getAssociatedTokenAddress(mint, owner);

    try {
      const accountInfo = await this.connection.getTokenAccountBalance(ata);
      return accountInfo.value.amount; // raw amount as string
    } catch {
      // ATA does not exist yet -> balance is zero
      return '0';
    }
  }

  // ---- transaction status ----

  async checkTransaction(txHash: string): Promise<TxStatus> {
    const status = await this.connection.getSignatureStatus(txHash, {
      searchTransactionHistory: true,
    });

    if (!status.value) {
      return { confirmed: false, confirmations: 0 };
    }

    const confirmed =
      status.value.confirmationStatus === 'finalized' ||
      status.value.confirmationStatus === 'confirmed';

    return {
      confirmed,
      confirmations: status.value.confirmations ?? (confirmed ? 1 : 0),
      blockNumber: status.value.slot,
    };
  }

  // ---- incoming SPL token transfers ----
  // NOTE: Solana does not have a built-in event log query like EVM.
  // We check recent transaction signatures for the token account and parse them.
  // For production, an indexer (e.g. Helius, Triton) is recommended.

  async getIncomingTokenTransfers(
    address: string,
    tokenContract: string,
    _fromBlock?: number,
  ): Promise<IncomingTx[]> {
    const owner = new PublicKey(address);
    const mint = new PublicKey(tokenContract);
    const ata = await getAssociatedTokenAddress(mint, owner);

    try {
      const signatures = await this.connection.getSignaturesForAddress(ata, {
        limit: 100,
      });

      const results: IncomingTx[] = [];

      for (const sig of signatures) {
        const tx = await this.connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx?.meta || tx.meta.err) continue;

        // Walk through inner instructions looking for SPL token transfers to this ATA
        const postBalances = tx.meta.postTokenBalances ?? [];
        const preBalances = tx.meta.preTokenBalances ?? [];

        for (const post of postBalances) {
          if (post.mint !== tokenContract) continue;
          if (post.owner !== address) continue;

          const pre = preBalances.find(
            (p) => p.accountIndex === post.accountIndex,
          );
          const preAmount = BigInt(pre?.uiTokenAmount?.amount ?? '0');
          const postAmount = BigInt(post.uiTokenAmount?.amount ?? '0');

          if (postAmount > preAmount) {
            results.push({
              txHash: sig.signature,
              from: '', // Solana transfers don't map 1:1 to a "from" address easily
              to: address,
              amount: (postAmount - preAmount).toString(),
              tokenContract,
              blockNumber: sig.slot,
              timestamp: sig.blockTime ?? undefined,
            });
          }
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  // ---- sweep SPL tokens ----

  async sweep(
    fromPrivateKey: string,
    toAddress: string,
    tokenContract: string,
    amount: string,
  ): Promise<string> {
    const fromKeypair = Keypair.fromSecretKey(
      Buffer.from(fromPrivateKey, 'hex'),
    );
    const toPublicKey = new PublicKey(toAddress);
    const mint = new PublicKey(tokenContract);

    // Ensure both sender and receiver have Associated Token Accounts
    const fromAta = await getAssociatedTokenAddress(mint, fromKeypair.publicKey);
    const toAta = await getOrCreateAssociatedTokenAccount(
      this.connection,
      fromKeypair, // payer for ATA creation if needed
      mint,
      toPublicKey,
    );

    const transferIx = createTransferInstruction(
      fromAta,
      toAta.address,
      fromKeypair.publicKey,
      BigInt(amount),
    );

    const tx = new Transaction().add(transferIx);
    const signature = await sendAndConfirmTransaction(this.connection, tx, [
      fromKeypair,
    ]);

    return signature;
  }

  // ---- estimate sweep cost (in lamports) ----

  async estimateSweepGas(
    _from: string,
    _to: string,
    _tokenContract: string,
    _amount: string,
  ): Promise<string> {
    // Solana transaction fees are predictable: 5000 lamports base fee.
    // If the receiver ATA needs to be created, add rent-exempt minimum (~2 044 280 lamports).
    // Return a conservative estimate that covers ATA creation.
    const baseFee = 5_000;
    const rentExempt = 2_100_000; // slightly above minimum
    return (baseFee + rentExempt).toString();
  }

  // ---- send native SOL for gas funding ----

  async sendNative(
    fromPrivateKey: string,
    toAddress: string,
    amount: string,
  ): Promise<string> {
    const fromKeypair = Keypair.fromSecretKey(
      Buffer.from(fromPrivateKey, 'hex'),
    );
    const toPublicKey = new PublicKey(toAddress);

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: BigInt(amount),
      }),
    );

    const signature = await sendAndConfirmTransaction(this.connection, tx, [
      fromKeypair,
    ]);

    return signature;
  }
}
