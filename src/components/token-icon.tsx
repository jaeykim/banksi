const TOKEN_LOGOS: Record<string, string> = {
  USDT: '/assets/tokens/usdt.svg',
  USDC: '/assets/tokens/usdc.svg',
};

interface TokenIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

export function TokenIcon({ symbol, size = 20, className = '' }: TokenIconProps) {
  const src = TOKEN_LOGOS[symbol.toUpperCase()];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={symbol}
      width={size}
      height={size}
      className={`inline-block flex-shrink-0 ${className}`}
    />
  );
}
