export type ChainType = 'evm' | 'tron' | 'solana';

export interface TxStatus {
  confirmed: boolean;
  confirmations: number;
  blockNumber?: number;
}

export interface IncomingTx {
  txHash: string;
  from: string;
  to: string;
  amount: string; // in smallest unit as string
  tokenContract: string;
  blockNumber: number;
  timestamp?: number;
}

export interface ChainAdapter {
  chainId: string;
  chainType: ChainType;

  getBalance(address: string): Promise<string>;
  getTokenBalance(address: string, tokenContract: string): Promise<string>;
  checkTransaction(txHash: string): Promise<TxStatus>;
  getIncomingTokenTransfers(
    address: string,
    tokenContract: string,
    fromBlock?: number,
  ): Promise<IncomingTx[]>;
  sweep(
    fromPrivateKey: string,
    toAddress: string,
    tokenContract: string,
    amount: string,
  ): Promise<string>;
  estimateSweepGas(
    from: string,
    to: string,
    tokenContract: string,
    amount: string,
  ): Promise<string>;
  sendNative(
    fromPrivateKey: string,
    toAddress: string,
    amount: string,
  ): Promise<string>;
}
