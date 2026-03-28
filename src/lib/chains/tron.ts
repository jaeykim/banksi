import { TronWeb } from 'tronweb';
import type { ChainAdapter, ChainType, TxStatus, IncomingTx } from './types';

/**
 * Tron chain adapter.
 *
 * Uses TronWeb for all RPC communication.  Some methods (e.g. event queries)
 * require an API key when targeting public mainnet / shasta nodes.
 */
export class TronChainAdapter implements ChainAdapter {
  public readonly chainType: ChainType = 'tron';
  public readonly chainId: string;
  private readonly tronWeb: TronWeb;

  constructor(
    chainId: string,
    fullHost: string,
    apiKey?: string,
  ) {
    this.chainId = chainId;

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['TRON-PRO-API-KEY'] = apiKey;
    }

    this.tronWeb = new TronWeb({ fullHost, headers });
  }

  // ---- native TRX balance ----

  async getBalance(address: string): Promise<string> {
    const balanceSun: number = await this.tronWeb.trx.getBalance(address);
    return balanceSun.toString();
  }

  // ---- TRC-20 token balance ----

  async getTokenBalance(
    address: string,
    tokenContract: string,
  ): Promise<string> {
    this.tronWeb.setAddress(address);
    const contract = await this.tronWeb.contract([], tokenContract);
    const balance = await (contract as any).methods.balanceOf(address).call();
    return balance.toString();
  }

  // ---- transaction status ----

  async checkTransaction(txHash: string): Promise<TxStatus> {
    try {
      const info = await this.tronWeb.trx.getTransactionInfo(txHash);

      if (!info || !(info as any).blockNumber) {
        return { confirmed: false, confirmations: 0 };
      }

      const infoAny = info as any;

      // Tron considers a tx confirmed once it appears in a solidified block.
      // The receipt.result field is 'SUCCESS' on success.
      const confirmed =
        infoAny.receipt?.result === 'SUCCESS' || infoAny.result === 'SUCCESS';

      // Tron does not expose a simple confirmation count; use block delta.
      const currentBlock = await this.tronWeb.trx.getCurrentBlock();
      const currentNumber: number =
        (currentBlock as any)?.block_header?.raw_data?.number ?? infoAny.blockNumber;
      const confirmations = currentNumber - infoAny.blockNumber;

      return {
        confirmed: !!confirmed,
        confirmations,
        blockNumber: infoAny.blockNumber,
      };
    } catch {
      return { confirmed: false, confirmations: 0 };
    }
  }

  // ---- incoming TRC-20 transfers ----
  // NOTE: This relies on TronGrid event API. A paid API key is recommended for
  // production use.

  async getIncomingTokenTransfers(
    address: string,
    tokenContract: string,
    _fromBlock?: number,
  ): Promise<IncomingTx[]> {
    try {
      const events = await this.tronWeb.getEventResult(tokenContract, {
        eventName: 'Transfer',
        limit: 200,
        onlyConfirmed: true,
      });

      if (!Array.isArray(events)) return [];

      return events
        .filter((e: any) => {
          const to = e.result?.to || e.result?._to;
          return (
            to &&
            TronWeb.address.fromHex(to).toLowerCase() ===
              address.toLowerCase()
          );
        })
        .map((e: any) => ({
          txHash: e.transaction as string,
          from: TronWeb.address.fromHex(e.result?.from || e.result?._from),
          to: TronWeb.address.fromHex(e.result?.to || e.result?._to),
          amount: (e.result?.value || e.result?._value || '0').toString(),
          tokenContract,
          blockNumber: e.block as number,
          timestamp: e.timestamp ? Math.floor(e.timestamp / 1000) : undefined,
        }));
    } catch {
      return [];
    }
  }

  // ---- sweep TRC-20 tokens ----

  async sweep(
    fromPrivateKey: string,
    toAddress: string,
    tokenContract: string,
    amount: string,
  ): Promise<string> {
    // Build a temporary TronWeb instance keyed to the sender
    const senderTronWeb = new TronWeb({
      fullHost: this.tronWeb.fullNode.host,
      privateKey: fromPrivateKey,
    });

    const { transaction } = await senderTronWeb.transactionBuilder.triggerSmartContract(
      tokenContract,
      'transfer(address,uint256)',
      { feeLimit: 100_000_000 },
      [
        { type: 'address', value: toAddress },
        { type: 'uint256', value: amount },
      ],
      senderTronWeb.defaultAddress.hex as string,
    );

    const signed = await senderTronWeb.trx.sign(transaction);
    const result = await senderTronWeb.trx.sendRawTransaction(signed);

    if (!(result as any).result) {
      throw new Error(`Tron sweep failed: ${JSON.stringify(result)}`);
    }

    return (result as any).txid as string;
  }

  // ---- estimate sweep cost ----
  // Tron uses an energy / bandwidth model rather than gas.
  // We return a rough estimate in SUN (1 TRX = 1 000 000 SUN).

  async estimateSweepGas(
    _from: string,
    _to: string,
    _tokenContract: string,
    _amount: string,
  ): Promise<string> {
    // TRC-20 transfers typically cost ~15-30 TRX worth of energy.
    // A precise estimate would require calling
    // tronWeb.transactionBuilder.triggerConstantContract and computing
    // energy * sun-per-energy. For now return a safe upper bound.
    const estimatedSun = 30_000_000; // 30 TRX
    return estimatedSun.toString();
  }

  // ---- send native TRX for gas / energy funding ----

  async sendNative(
    fromPrivateKey: string,
    toAddress: string,
    amount: string,
  ): Promise<string> {
    const senderTronWeb = new TronWeb({
      fullHost: this.tronWeb.fullNode.host,
      privateKey: fromPrivateKey,
    });

    const tx = await senderTronWeb.trx.sendTransaction(
      toAddress,
      Number(amount),
    );

    if (!(tx as any).result) {
      throw new Error(`Tron native send failed: ${JSON.stringify(tx)}`);
    }

    return (tx as any).txid as string;
  }
}
