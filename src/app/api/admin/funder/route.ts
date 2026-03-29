import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import { getChainAdapter } from '@/lib/chains/registry';

// DB chain ID → registry chain ID mapping
const CHAIN_REGISTRY_MAP: Record<string, string> = {
  ethereum: 'evm:1',
  bsc: 'evm:56',
  arbitrum: 'evm:42161',
  tron: 'tron:mainnet',
  solana: 'solana:mainnet',
};

// Native currency symbols
const NATIVE_SYMBOLS: Record<string, string> = {
  ethereum: 'ETH',
  bsc: 'BNB',
  arbitrum: 'ETH',
  tron: 'TRX',
  solana: 'SOL',
};

// Minimum recommended balance thresholds (in native units)
const MIN_BALANCE: Record<string, number> = {
  ethereum: 0.01,
  bsc: 0.01,
  arbitrum: 0.005,
  tron: 100,
  solana: 0.1,
};

interface FunderBalance {
  chainId: string;
  chainName: string;
  registryId: string;
  nativeSymbol: string;
  balance: string;
  balanceFormatted: string;
  minRecommended: number;
  status: 'ok' | 'low' | 'empty' | 'error';
  error?: string;
}

function formatBalance(raw: string, chainId: string): string {
  // EVM balances are in wei, Tron in sun, Solana in lamports
  let num: number;
  if (['ethereum', 'polygon', 'bsc', 'arbitrum'].includes(chainId)) {
    num = Number(BigInt(raw)) / 1e18;
  } else if (chainId === 'tron') {
    num = Number(BigInt(raw)) / 1e6;
  } else if (chainId === 'solana') {
    num = Number(BigInt(raw)) / 1e9;
  } else {
    num = parseFloat(raw);
  }
  return num.toFixed(6);
}

// GET /api/admin/funder — Check gas funder wallet balance across all chains
export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const funderKey = process.env.GAS_FUNDER_PRIVATE_KEY;
    if (!funderKey) {
      return NextResponse.json({
        configured: false,
        message: 'GAS_FUNDER_PRIVATE_KEY is not set.',
        balances: [],
      });
    }

    // Derive funder address from private key for EVM (all EVM chains share same address)
    let funderEvmAddress: string | null = null;
    try {
      const { ethers } = await import('ethers');
      const wallet = new ethers.Wallet(funderKey);
      funderEvmAddress = wallet.address;
    } catch {
      // If ethers fails, we'll handle per-chain
    }

    // Get active chains from DB
    const chains = await prisma.chain.findMany({
      where: { isActive: true },
      select: { id: true, name: true, isEvm: true },
    });

    const balances: FunderBalance[] = [];

    for (const chain of chains) {
      const registryId = CHAIN_REGISTRY_MAP[chain.id];
      if (!registryId) continue;

      const nativeSymbol = NATIVE_SYMBOLS[chain.id] || '???';
      const minBal = MIN_BALANCE[chain.id] || 0;

      const entry: FunderBalance = {
        chainId: chain.id,
        chainName: chain.name,
        registryId,
        nativeSymbol,
        balance: '0',
        balanceFormatted: '0.000000',
        minRecommended: minBal,
        status: 'error',
      };

      try {
        const adapter = getChainAdapter(registryId);

        // Determine the funder address for this chain
        let address: string;
        if (chain.isEvm && funderEvmAddress) {
          address = funderEvmAddress;
        } else if (chain.id === 'tron') {
          // For Tron, we'd need to derive a Tron address from the key
          // Skip for now if no dedicated Tron funder
          entry.status = 'error';
          entry.error = 'Tron funder address derivation not configured';
          balances.push(entry);
          continue;
        } else if (chain.id === 'solana') {
          entry.status = 'error';
          entry.error = 'Solana funder address derivation not configured';
          balances.push(entry);
          continue;
        } else {
          entry.status = 'error';
          entry.error = 'Cannot determine funder address';
          balances.push(entry);
          continue;
        }

        const rawBalance = await adapter.getBalance(address);
        entry.balance = rawBalance;
        entry.balanceFormatted = formatBalance(rawBalance, chain.id);

        const balNum = parseFloat(entry.balanceFormatted);
        if (balNum === 0) {
          entry.status = 'empty';
        } else if (balNum < minBal) {
          entry.status = 'low';
        } else {
          entry.status = 'ok';
        }
      } catch (err) {
        entry.status = 'error';
        entry.error = err instanceof Error ? err.message : 'Unknown error';
      }

      balances.push(entry);
    }

    const anyLow = balances.some((b) => b.status === 'low' || b.status === 'empty');

    return NextResponse.json({
      configured: true,
      funderAddress: funderEvmAddress,
      alert: anyLow,
      balances,
    });
  } catch (error) {
    console.error('Error checking funder balances:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
