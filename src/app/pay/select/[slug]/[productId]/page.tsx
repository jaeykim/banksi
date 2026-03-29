'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ChainIcon } from '@/components/chain-icon';
import { TokenIcon } from '@/components/token-icon';
import { usePaymentStatus } from '@/hooks/use-payment-status';

// ─── Types ──────────────────────────────────────────

interface ProductInfo {
  id: string;
  name: string;
  description: string | null;
  priceUsd: number;
  imageUrl: string | null;
}

interface MerchantInfo {
  name: string;
  slug: string;
  storeBannerColor: string | null;
}

interface ChainData {
  id: string;
  name: string;
  isEvm: boolean;
  tokens: { id: string; symbol: string; name: string; decimals: number; contractAddress: string }[];
}

interface PaymentData {
  paymentId: string;
  address: string;
  amountExpected: string;
  expiresAt: string;
}

// ─── EVM helpers ────────────────────────────────────

const CHAIN_ID_MAP: Record<string, number> = {
  ethereum: 1, polygon: 137, bsc: 56, arbitrum: 42161,
};

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

function buildErc20TransferData(to: string, amount: string, decimals: number): string {
  const amountBig = BigInt(Math.round(parseFloat(amount) * (10 ** decimals)));
  const toHex = to.toLowerCase().replace('0x', '').padStart(64, '0');
  const amountHex = amountBig.toString(16).padStart(64, '0');
  return '0xa9059cbb' + toHex + amountHex;
}

interface WalletDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  getDeepLink: (p: {
    chainId: number; to: string; tokenContract?: string;
    amount: string; decimals: number; pageUrl: string;
  }) => string | null;
}

const WALLETS: WalletDef[] = [
  {
    id: 'metamask', name: 'MetaMask', icon: '🦊', color: '#E2761B',
    getDeepLink: ({ pageUrl }) =>
      `metamask://dapp/${pageUrl.replace(/^https?:\/\//, '')}`,
  },
  {
    id: 'coinbase', name: 'Coinbase', icon: '🔵', color: '#0052FF',
    getDeepLink: ({ pageUrl }) =>
      `cbwallet://dapp?url=${encodeURIComponent(pageUrl)}`,
  },
  {
    id: 'trust', name: 'Trust', icon: '🛡️', color: '#3375BB',
    getDeepLink: ({ to, tokenContract, amount, decimals, chainId }) => {
      if (tokenContract) {
        const data = buildErc20TransferData(to, amount, decimals);
        return `trust://send?asset=c${chainId}&to=${tokenContract}&data=${data}`;
      }
      const weiAmount = BigInt(Math.round(parseFloat(amount) * 1e18));
      return `trust://send?asset=c${chainId}&to=${to}&amount=${weiAmount.toString()}`;
    },
  },
  {
    id: 'rainbow', name: 'Rainbow', icon: '🌈', color: '#001E59',
    getDeepLink: ({ pageUrl }) =>
      `rainbow://dapp?url=${encodeURIComponent(pageUrl)}`,
  },
];

// ─── Spinner ────────────────────────────────────────

function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Step type ──────────────────────────────────────

type Step = 'select' | 'pay';

// ─── Main Component ─────────────────────────────────

export default function PaymentSelectPage() {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();

  // Data
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [chains, setChains] = useState<ChainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selection
  const [selectedChain, setSelectedChain] = useState('');
  const [selectedToken, setSelectedToken] = useState('');

  // Payment state
  const [step, setStep] = useState<Step>('select');
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  // Wallet
  const [walletStatus, setWalletStatus] = useState<'idle' | 'connecting' | 'sending' | 'sent' | 'error'>('idle');
  const [walletError, setWalletError] = useState('');

  // UI
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [showQr, setShowQr] = useState(false);

  // Live status polling
  const { status: liveStatus, txHash } = usePaymentStatus(
    payment?.paymentId ?? ''
  );

  // ─── Fetch initial data ───────────────────────────

  // Demo product data
  const DEMO_PRODUCTS: Record<string, { name: string; description: string; priceUsd: number; imageUrl: string }> = {
    'demo-1': { name: 'Americano', description: 'Classic black coffee', priceUsd: 4.50, imageUrl: '/uploads/products/americano.svg' },
    'demo-2': { name: 'Cafe Latte', description: 'Espresso with steamed milk', priceUsd: 5.50, imageUrl: '/uploads/products/cafe-latte.svg' },
    'demo-3': { name: 'Matcha Latte', description: 'Premium Japanese matcha', priceUsd: 6.50, imageUrl: '/uploads/products/matcha-latte.svg' },
    'demo-4': { name: 'Croissant', description: 'Freshly baked butter croissant', priceUsd: 3.50, imageUrl: '/uploads/products/croissant.svg' },
  };

  useEffect(() => {
    async function fetchData() {
      try {
        // Handle demo products
        const isDemoProduct = productId.startsWith('demo-');
        const demoData = DEMO_PRODUCTS[productId];

        const chainsRes = await fetch('/api/chains');
        if (chainsRes.ok) {
          const chainsData = await chainsRes.json();
          setChains(chainsData.chains);
        }

        if (isDemoProduct && demoData) {
          setProduct({ id: productId, name: demoData.name, description: demoData.description, priceUsd: demoData.priceUsd, imageUrl: demoData.imageUrl });
          // Try to get merchant info
          try {
            const storeRes = await fetch(`/api/store/${slug}`);
            if (storeRes.ok) {
              const storeData = await storeRes.json();
              setMerchant(storeData.merchant);
            } else {
              setMerchant({ name: slug, slug, storeBannerColor: '#d97706' });
            }
          } catch {
            setMerchant({ name: slug, slug, storeBannerColor: '#d97706' });
          }
        } else {
          const productRes = await fetch(`/api/store/${slug}/products/${productId}`);
          if (!productRes.ok) { setError('Product not found.'); return; }
          const productData = await productRes.json();
          setProduct(productData.product);
          setMerchant(productData.merchant);
        }
      } catch {
        setError('Failed to load payment page.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug, productId]);

  // ─── Timer ────────────────────────────────────────

  useEffect(() => {
    if (!payment?.expiresAt) return;
    function tick() {
      const diff = new Date(payment!.expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    }
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [payment?.expiresAt]);

  // ─── Derived state ────────────────────────────────

  const selectedChainData = chains.find((c) => c.id === selectedChain);
  const selectedTokenData = selectedChainData?.tokens.find((t) => t.id === selectedToken);
  const bannerColor = merchant?.storeBannerColor || '#4f46e5';
  const isEvmChain = !!CHAIN_ID_MAP[selectedChain];
  const hasInjectedWallet = typeof window !== 'undefined' && !!(window as unknown as { ethereum?: unknown }).ethereum;
  const currentStatus = liveStatus || 'PENDING';
  const isSuccess = ['CONFIRMING', 'CONFIRMED', 'SWEPT'].includes(currentStatus);
  const isExpired = currentStatus === 'EXPIRED';
  const canSelect = step === 'select' && !payLoading;

  // ─── Handlers ─────────────────────────────────────

  function handleChainSelect(chainId: string) {
    if (!canSelect) return;
    setSelectedChain(chainId);
    setSelectedToken('');
  }

  const handleTokenSelectAndPay = useCallback(async (tokenId: string) => {
    setSelectedToken(tokenId);
    setPayLoading(true);
    setPayError('');
    try {
      let res;
      if (productId.startsWith('demo-')) {
        // Demo: use x402 pay API with merchantSlug + amount
        res = await fetch('/api/x402/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantSlug: slug, chainId: selectedChain, tokenId, amount: product?.priceUsd || 0 }),
        });
      } else {
        res = await fetch(`/api/store/${slug}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, chainId: selectedChain, tokenId }),
        });
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Payment failed');
      }
      const data = await res.json();
      setPayment(data);
      setStep('pay');
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Payment failed.');
    } finally {
      setPayLoading(false);
    }
  }, [slug, productId, selectedChain]);

  async function handleCopy() {
    if (!payment?.address) return;
    await navigator.clipboard.writeText(payment.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleInjectedWalletPay() {
    if (!payment?.address || !selectedTokenData) return;
    const ethereum = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    if (!ethereum) { setWalletError('No wallet detected.'); return; }

    setWalletStatus('connecting');
    setWalletError('');
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (!accounts?.length) throw new Error('No account selected');
      const from = accounts[0];
      const chainId = CHAIN_ID_MAP[selectedChain];

      if (chainId) {
        const currentHex = await ethereum.request({ method: 'eth_chainId' }) as string;
        const targetHex = '0x' + chainId.toString(16);
        if (currentHex !== targetHex) {
          try {
            await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetHex }] });
          } catch {
            setWalletError(`Please switch to ${selectedChainData?.name} in your wallet.`);
            setWalletStatus('idle');
            return;
          }
        }
      }

      setWalletStatus('sending');
      const tokenContract = selectedTokenData.contractAddress;
      const decimals = selectedTokenData.decimals;
      const amountFloat = parseFloat(payment.amountExpected);

      if (tokenContract) {
        const amountBig = BigInt(Math.round(amountFloat * (10 ** decimals)));
        const amountHex = '0x' + amountBig.toString(16).padStart(64, '0');
        const toHex = payment.address.toLowerCase().replace('0x', '').padStart(64, '0');
        const data = '0xa9059cbb' + toHex + amountHex;
        await ethereum.request({
          method: 'eth_sendTransaction',
          params: [{ from, to: tokenContract, data, value: '0x0' }],
        });
      } else {
        const amountWei = BigInt(Math.round(amountFloat * 1e18));
        await ethereum.request({
          method: 'eth_sendTransaction',
          params: [{ from, to: payment.address, value: '0x' + amountWei.toString(16) }],
        });
      }
      setWalletStatus('sent');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      setWalletError(msg.includes('rejected') || msg.includes('denied') ? 'Transaction rejected.' : msg);
      setWalletStatus('error');
    }
  }

  function handleMobileWalletOpen(walletId: string) {
    if (!payment?.address || !selectedTokenData) return;
    const chainId = CHAIN_ID_MAP[selectedChain] || 1;
    const wallet = WALLETS.find(w => w.id === walletId);
    if (!wallet) return;
    const link = wallet.getDeepLink({
      chainId, to: payment.address, tokenContract: selectedTokenData.contractAddress,
      amount: payment.amountExpected, decimals: selectedTokenData.decimals, pageUrl: window.location.href,
    });
    if (link) window.location.href = link;
    else handleInjectedWalletPay();
  }

  function handleBack() {
    setStep('select');
    setPayment(null);
    setSelectedToken('');
    setWalletStatus('idle');
    setWalletError('');
    setShowQr(false);
  }

  // ─── Loading / Error ──────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  if (error || !product || !merchant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg shadow-slate-200/50">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Not Found</h1>
          <p className="mt-1 text-sm text-gray-500">{error || 'This product or store is unavailable.'}</p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: bannerColor }}>
              <span className="text-xs font-bold text-white">{merchant.name[0]}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{merchant.name}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-lg space-y-5">

          {/* ── Product Card ─────────────────────── */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm shadow-slate-200/50">
            {product.imageUrl && (
              <div className="h-36 bg-slate-100">
                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 truncate">{product.name}</h2>
                  {product.description && (
                    <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">{product.description}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-gray-900">${product.priceUsd.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">USD</p>
                </div>
              </div>

              {/* Selected chain+token badge */}
              {selectedChainData && selectedToken && selectedTokenData && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <ChainIcon chainId={selectedChainData.id} size={16} />
                  <span className="text-xs font-medium text-gray-600">{selectedChainData.name}</span>
                  <span className="text-gray-300">/</span>
                  <TokenIcon symbol={selectedTokenData.symbol} size={16} />
                  <span className="text-xs font-medium text-gray-600 flex-1">
                    {product.priceUsd.toFixed(2)} {selectedTokenData.symbol}
                  </span>
                  {step === 'pay' && !isSuccess && !isExpired && (
                    <button
                      onClick={handleBack}
                      className="rounded-md bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:border-slate-300 transition-colors"
                    >
                      Change
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Demo donation notice */}
          {productId.startsWith('demo-') && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-center">
              <p className="text-xs text-amber-700">This is a live demo. Payments made here are donations to the developer. Thank you!</p>
            </div>
          )}

          {/* ── STEP: Select ─────────────────────── */}
          {step === 'select' && (
            <>
              {/* Network */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-1">
                  Network
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {chains.map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => handleChainSelect(chain.id)}
                      disabled={payLoading}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 transition-all ${
                        selectedChain === chain.id
                          ? 'border-indigo-500 bg-indigo-50 shadow-sm shadow-indigo-100'
                          : 'border-transparent bg-white shadow-sm shadow-slate-100 hover:border-slate-200'
                      } disabled:opacity-50`}
                    >
                      <ChainIcon chainId={chain.id} size={28} />
                      <span className={`text-xs font-medium ${
                        selectedChain === chain.id ? 'text-indigo-700' : 'text-gray-600'
                      }`}>
                        {chain.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Token — selecting a token triggers payment creation */}
              {selectedChain && selectedChainData && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-1">
                    Pay with
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedChainData.tokens.map((token) => (
                      <button
                        key={token.id}
                        onClick={() => handleTokenSelectAndPay(token.id)}
                        disabled={payLoading}
                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 transition-all ${
                          selectedToken === token.id
                            ? 'border-indigo-500 bg-indigo-50 shadow-sm shadow-indigo-100'
                            : 'border-transparent bg-white shadow-sm shadow-slate-100 hover:border-slate-200'
                        } disabled:opacity-50`}
                      >
                        <TokenIcon symbol={token.symbol} size={28} />
                        <div className="text-left">
                          <div className={`text-sm font-semibold ${
                            selectedToken === token.id ? 'text-indigo-700' : 'text-gray-900'
                          }`}>{token.symbol}</div>
                          <div className="text-xs text-gray-400">{token.name}</div>
                        </div>
                        {payLoading && selectedToken === token.id && (
                          <Spinner className="ml-auto h-4 w-4 text-indigo-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {payError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">{payError}</p>
                </div>
              )}

              {/* Hint */}
              {!selectedChain && (
                <p className="text-center text-xs text-gray-400 pt-2">
                  Select a network to continue
                </p>
              )}
            </>
          )}

          {/* ── STEP: Pay ────────────────────────── */}
          {step === 'pay' && payment && (
            <>
              {/* Success state */}
              {(isSuccess || walletStatus === 'sent') && (
                <div className="rounded-2xl bg-gradient-to-b from-emerald-50 to-white border border-emerald-200 p-6 text-center space-y-3">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-emerald-700">
                    {walletStatus === 'sent' ? 'Transaction Sent' : currentStatus === 'CONFIRMING' ? 'Payment Detected' : 'Payment Confirmed!'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {walletStatus === 'sent' ? 'Waiting for blockchain confirmation...'
                      : currentStatus === 'CONFIRMING' ? 'Confirming on the blockchain...'
                      : 'Thank you for your purchase!'}
                  </p>
                  {txHash && (
                    <p className="text-xs text-gray-400 font-mono break-all bg-slate-50 rounded-lg px-3 py-2">
                      TX: {txHash}
                    </p>
                  )}
                </div>
              )}

              {/* Expired */}
              {isExpired && (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center space-y-3">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                    <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-700">Payment Expired</h2>
                  <p className="text-sm text-gray-500">This payment has timed out.</p>
                  <button
                    onClick={handleBack}
                    className="mt-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: bannerColor }}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Active payment */}
              {currentStatus === 'PENDING' && walletStatus !== 'sent' && (
                <>
                  {/* Timer bar */}
                  <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm shadow-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                      </span>
                      <span className="text-sm text-gray-500">Waiting for payment</span>
                    </div>
                    <span className="text-sm font-mono font-semibold text-gray-900 tabular-nums">{timeLeft}</span>
                  </div>

                  {/* Wallet pay (EVM) */}
                  {isEvmChain && (
                    <div className="space-y-2">
                      {hasInjectedWallet && (
                        <button
                          onClick={handleInjectedWalletPay}
                          disabled={walletStatus === 'connecting' || walletStatus === 'sending'}
                          className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 shadow-lg"
                          style={{ backgroundColor: bannerColor, boxShadow: `0 8px 24px -4px ${bannerColor}40` }}
                        >
                          {(walletStatus === 'connecting' || walletStatus === 'sending') ? (
                            <><Spinner className="h-4 w-4 text-white/80" /> Connecting...</>
                          ) : (
                            <>
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Pay with Browser Wallet
                            </>
                          )}
                        </button>
                      )}

                      <div className="grid grid-cols-4 gap-1.5">
                        {WALLETS.map((wallet) => (
                          <button
                            key={wallet.id}
                            onClick={() => handleMobileWalletOpen(wallet.id)}
                            className="flex flex-col items-center gap-1 rounded-xl bg-white px-2 py-2.5 shadow-sm shadow-slate-100 hover:shadow-md transition-shadow"
                          >
                            <span
                              className="flex h-9 w-9 items-center justify-center rounded-xl text-white text-base"
                              style={{ backgroundColor: wallet.color }}
                            >
                              {wallet.icon}
                            </span>
                            <span className="text-[10px] font-medium text-gray-500">{wallet.name}</span>
                          </button>
                        ))}
                      </div>

                      {walletError && (
                        <p className="text-xs text-red-500 text-center">{walletError}</p>
                      )}

                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                        <div className="relative flex justify-center">
                          <span className="bg-gradient-to-br from-slate-50 to-slate-100 px-3 text-xs text-gray-400">or send manually</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* QR + Address */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-100 space-y-4">
                    {/* Toggle QR */}
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => setShowQr(!showQr)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <svg className={`h-4 w-4 transition-transform ${showQr ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                        {showQr ? 'Hide QR Code' : 'Show QR Code'}
                      </button>
                    </div>

                    {showQr && (
                      <div className="flex justify-center py-2">
                        <div className="rounded-2xl border border-slate-100 bg-white p-4">
                          <QRCodeSVG
                            value={typeof window !== 'undefined' ? window.location.href : payment.address}
                            size={160}
                            level="M"
                            bgColor="#ffffff"
                            fgColor="#0f172a"
                          />
                        </div>
                      </div>
                    )}

                    {/* Amount label */}
                    <div className="text-center">
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                        Send exactly
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-lg font-bold text-gray-900">
                        <TokenIcon symbol={selectedTokenData?.symbol ?? ''} size={20} />
                        {payment.amountExpected} {selectedTokenData?.symbol}
                      </p>
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400 text-center">
                        To this address
                      </p>
                      <button
                        onClick={handleCopy}
                        className="group w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-xs text-gray-800 break-all hover:bg-slate-100 transition-colors relative"
                      >
                        {payment.address}
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {copied ? (
                            <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </span>
                      </button>
                      <p className="text-center text-[11px] text-gray-400">
                        {copied ? <span className="text-emerald-600 font-medium">Copied!</span> : 'Tap to copy address'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-5 text-center">
        <p className="text-xs text-gray-400">
          Powered by <span className="font-semibold text-gray-500">Banksi</span>
        </p>
      </footer>
    </div>
  );
}
