import { ethers } from 'ethers';
import type { ChainAdapter, ChainType, TxStatus, IncomingTx } from './types';

/**
 * Minimal ERC-20 ABI covering the methods we need:
 *  - balanceOf(address) -> uint256
 *  - transfer(address, uint256) -> bool
 *  - Transfer(address indexed from, address indexed to, uint256 value) event
 */
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export class EvmChainAdapter implements ChainAdapter {
  public readonly chainType: ChainType = 'evm';
  public readonly chainId: string;
  private readonly provider: ethers.JsonRpcProvider;

  constructor(chainId: string, rpcUrl: string) {
    this.chainId = chainId;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  // ---- native balance ----

  async getBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address);
    return balance.toString();
  }

  // ---- ERC-20 token balance ----

  async getTokenBalance(
    address: string,
    tokenContract: string,
  ): Promise<string> {
    const contract = new ethers.Contract(tokenContract, ERC20_ABI, this.provider);
    const balance: bigint = await contract.balanceOf(address);
    return balance.toString();
  }

  // ---- transaction status ----

  async checkTransaction(txHash: string): Promise<TxStatus> {
    const receipt = await this.provider.getTransactionReceipt(txHash);

    if (!receipt || receipt.status === null) {
      return { confirmed: false, confirmations: 0 };
    }

    const currentBlock = await this.provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber + 1;

    return {
      confirmed: receipt.status === 1,
      confirmations,
      blockNumber: receipt.blockNumber,
    };
  }

  // ---- incoming ERC-20 transfers ----

  async getIncomingTokenTransfers(
    address: string,
    tokenContract: string,
    fromBlock: number = 0,
  ): Promise<IncomingTx[]> {
    const contract = new ethers.Contract(tokenContract, ERC20_ABI, this.provider);

    // Build a filter for Transfer events where `to` is the target address
    const filter = contract.filters.Transfer(null, address);
    const events = await contract.queryFilter(filter, fromBlock, 'latest');

    return events.map((event) => {
      const log = event as ethers.EventLog;
      return {
        txHash: log.transactionHash,
        from: log.args[0] as string,
        to: log.args[1] as string,
        amount: (log.args[2] as bigint).toString(),
        tokenContract,
        blockNumber: log.blockNumber,
      };
    });
  }

  // ---- sweep tokens from a deposit wallet ----

  async sweep(
    fromPrivateKey: string,
    toAddress: string,
    tokenContract: string,
    amount: string,
  ): Promise<string> {
    const wallet = new ethers.Wallet(fromPrivateKey, this.provider);
    const contract = new ethers.Contract(tokenContract, ERC20_ABI, wallet);

    const tx = await contract.transfer(toAddress, BigInt(amount));
    const receipt = await tx.wait();
    return receipt.hash as string;
  }

  // ---- estimate gas for an ERC-20 transfer ----

  async estimateSweepGas(
    from: string,
    to: string,
    tokenContract: string,
    amount: string,
  ): Promise<string> {
    const contract = new ethers.Contract(tokenContract, ERC20_ABI, this.provider);
    const gasEstimate = await contract.transfer.estimateGas(to, BigInt(amount), {
      from,
    });

    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? BigInt(0);
    const totalCost = gasEstimate * gasPrice;
    return totalCost.toString();
  }

  // ---- send native currency (ETH / MATIC / BNB) for gas funding ----

  async sendNative(
    fromPrivateKey: string,
    toAddress: string,
    amount: string,
  ): Promise<string> {
    const wallet = new ethers.Wallet(fromPrivateKey, this.provider);
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: BigInt(amount),
    });
    const receipt = await tx.wait();
    return receipt!.hash;
  }
}
