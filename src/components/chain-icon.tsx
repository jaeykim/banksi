const CHAIN_LOGOS: Record<string, string> = {
  ethereum: '/assets/chains/ethereum.svg',
  bsc: '/assets/chains/bsc.svg',
  arbitrum: '/assets/chains/arbitrum.svg',
  base: '/assets/chains/base.svg',
  tron: '/assets/chains/tron.svg',
  solana: '/assets/chains/solana.svg',
};

interface ChainIconProps {
  chainId: string;
  size?: number;
  className?: string;
}

export function ChainIcon({ chainId, size = 20, className = '' }: ChainIconProps) {
  const src = CHAIN_LOGOS[chainId];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={chainId}
      width={size}
      height={size}
      className={`inline-block flex-shrink-0 ${className}`}
    />
  );
}
