import type { ChainAdapter } from './types';
import { EvmChainAdapter } from './evm';
import { TronChainAdapter } from './tron';
import { SolanaChainAdapter } from './solana';

// ---------------------------------------------------------------------------
// Default chain configurations
// ---------------------------------------------------------------------------

interface ChainConfig {
  type: 'evm' | 'tron' | 'solana';
  /** Environment variable name that holds the RPC URL */
  rpcEnv: string;
  /** Fallback RPC URL (public endpoint, rate-limited) */
  rpcFallback: string;
  /** Environment variable name for an optional API key */
  apiKeyEnv?: string;
}

const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  // Ethereum mainnet
  'evm:1': {
    type: 'evm',
    rpcEnv: 'ETH_RPC_URL',
    rpcFallback: 'https://eth.llamarpc.com',
  },
  // Ethereum Sepolia (testnet)
  'evm:11155111': {
    type: 'evm',
    rpcEnv: 'ETH_SEPOLIA_RPC_URL',
    rpcFallback: 'https://rpc.sepolia.org',
  },
  // Polygon mainnet
  'evm:137': {
    type: 'evm',
    rpcEnv: 'POLYGON_RPC_URL',
    rpcFallback: 'https://polygon-rpc.com',
  },
  // BNB Smart Chain
  'evm:56': {
    type: 'evm',
    rpcEnv: 'BSC_RPC_URL',
    rpcFallback: 'https://bsc-dataseed.binance.org',
  },
  // Arbitrum One
  'evm:42161': {
    type: 'evm',
    rpcEnv: 'ARBITRUM_RPC_URL',
    rpcFallback: 'https://arb1.arbitrum.io/rpc',
  },
  // Base
  'evm:8453': {
    type: 'evm',
    rpcEnv: 'BASE_RPC_URL',
    rpcFallback: 'https://mainnet.base.org',
  },
  // Tron mainnet
  'tron:mainnet': {
    type: 'tron',
    rpcEnv: 'TRON_RPC_URL',
    rpcFallback: 'https://api.trongrid.io',
    apiKeyEnv: 'TRON_API_KEY',
  },
  // Tron Shasta (testnet)
  'tron:shasta': {
    type: 'tron',
    rpcEnv: 'TRON_SHASTA_RPC_URL',
    rpcFallback: 'https://api.shasta.trongrid.io',
  },
  // Solana mainnet
  'solana:mainnet': {
    type: 'solana',
    rpcEnv: 'SOLANA_RPC_URL',
    rpcFallback: 'https://api.mainnet-beta.solana.com',
  },
  // Solana devnet
  'solana:devnet': {
    type: 'solana',
    rpcEnv: 'SOLANA_DEVNET_RPC_URL',
    rpcFallback: 'https://api.devnet.solana.com',
  },
};

// ---------------------------------------------------------------------------
// Adapter cache (lazy-initialized singletons)
// ---------------------------------------------------------------------------

const adapterCache = new Map<string, ChainAdapter>();

// ---------------------------------------------------------------------------
// DB chain ID → registry chain ID mapping
// ---------------------------------------------------------------------------

const DB_CHAIN_ALIASES: Record<string, string> = {
  ethereum: 'evm:1',
  polygon: 'evm:137',
  bsc: 'evm:56',
  arbitrum: 'evm:42161',
  base: 'evm:8453',
  tron: 'tron:mainnet',
  solana: 'solana:mainnet',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a ChainAdapter for the given chain ID.
 *
 * Accepts both registry format (`evm:1`) and DB format (`ethereum`).
 * Adapters are cached so the same instance is reused across calls.
 */
export function getChainAdapter(chainId: string): ChainAdapter {
  const resolvedId = DB_CHAIN_ALIASES[chainId] || chainId;

  const cached = adapterCache.get(resolvedId);
  if (cached) return cached;

  const config = CHAIN_CONFIGS[resolvedId];
  if (!config) {
    throw new Error(
      `Unknown chain "${chainId}". Supported chains: ${Object.keys(CHAIN_CONFIGS).join(', ')}`,
    );
  }

  const rpcUrl = process.env[config.rpcEnv] || config.rpcFallback;
  let adapter: ChainAdapter;

  switch (config.type) {
    case 'evm': {
      // For EVM chains the numeric chain ID is the part after "evm:"
      adapter = new EvmChainAdapter(chainId, rpcUrl);
      break;
    }
    case 'tron': {
      const apiKey = config.apiKeyEnv
        ? process.env[config.apiKeyEnv]
        : undefined;
      adapter = new TronChainAdapter(chainId, rpcUrl, apiKey);
      break;
    }
    case 'solana': {
      adapter = new SolanaChainAdapter(chainId, rpcUrl);
      break;
    }
    default:
      throw new Error(`Unsupported chain type: ${config.type}`);
  }

  adapterCache.set(resolvedId, adapter);
  // Also cache under the original key for fast lookup next time
  if (resolvedId !== chainId) adapterCache.set(chainId, adapter);
  return adapter;
}

/**
 * Returns all registered chain IDs.
 */
export function getSupportedChains(): string[] {
  return Object.keys(CHAIN_CONFIGS);
}

/**
 * Clears the adapter cache. Useful for testing or when RPC URLs change.
 */
export function clearAdapterCache(): void {
  adapterCache.clear();
}
