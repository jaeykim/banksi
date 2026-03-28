export const CHAINS = {
  ethereum: {
    id: 1,
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
  },
  bsc: {
    id: 56,
    name: 'BNB Smart Chain',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
  },
  tron: {
    id: null,
    name: 'Tron',
    rpcUrl: 'https://api.trongrid.io',
    explorerUrl: 'https://tronscan.org',
  },
  solana: {
    id: null,
    name: 'Solana',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://explorer.solana.com',
  },
} as const;

export const SUPPORTED_TOKENS = {
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    addresses: {
      ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      bsc: '0x55d398326f99059fF775485246999027B3197955',
      arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      tron: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      solana: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    },
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    addresses: {
      ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      bsc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      tron: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
      solana: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    },
  },
} as const;

export type ChainKey = keyof typeof CHAINS;
export type TokenSymbol = keyof typeof SUPPORTED_TOKENS;
