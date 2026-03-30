'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { usePaymentStatus } from '@/hooks/use-payment-status';
import { ChainIcon } from '@/components/chain-icon';
import { TokenIcon } from '@/components/token-icon';

interface PaymentData {
  id: string;
  status: string;
  address: string | null;
  amountExpected: string;
  fiatAmount: number;
  currency: string;
  chain: { id: string; name: string };
  token: { id: string; symbol: string; name: string; decimals: number; contractAddress?: string };
  merchant: { name: string };
  product: { name: string; description: string | null; imageUrl?: string | null } | null;
  txHash: string | null;
  expiresAt: string;
}

const CHAIN_ID_MAP: Record<string, number> = {
  ethereum: 1, polygon: 137, bsc: 56, arbitrum: 42161, base: 8453,
};

function buildErc20TransferData(to: string, amount: string, decimals: number): string {
  const amountBig = BigInt(Math.round(parseFloat(amount) * (10 ** decimals)));
  const toHex = to.toLowerCase().replace('0x', '').padStart(64, '0');
  const amountHex = amountBig.toString(16).padStart(64, '0');
  return '0xa9059cbb' + toHex + amountHex;
}

interface WalletDef {
  id: string; name: string; icon: string; color: string;
  getDeepLink: (p: { chainId: number; to: string; tokenContract?: string; amount: string; decimals: number; pageUrl: string }) => string | null;
}

const WALLETS: WalletDef[] = [
  { id: 'metamask', name: 'MetaMask', icon: '🦊', color: '#E2761B',
    getDeepLink: ({ pageUrl }) => `metamask://dapp/${pageUrl.replace(/^https?:\/\//, '')}` },
  { id: 'coinbase', name: 'Coinbase', icon: '🔵', color: '#0052FF',
    getDeepLink: ({ pageUrl }) => `cbwallet://dapp?url=${encodeURIComponent(pageUrl)}` },
  { id: 'trust', name: 'Trust', icon: '🛡️', color: '#3375BB',
    getDeepLink: ({ to, tokenContract, amount, decimals, chainId }) => {
      if (tokenContract) { const data = buildErc20TransferData(to, amount, decimals); return `trust://send?asset=c${chainId}&to=${tokenContract}&data=${data}`; }
      const weiAmount = BigInt(Math.round(parseFloat(amount) * 1e18));
      return `trust://send?asset=c${chainId}&to=${to}&amount=${weiAmount.toString()}`;
    } },
  { id: 'rainbow', name: 'Rainbow', icon: '🌈', color: '#001E59',
    getDeepLink: ({ pageUrl }) => `rainbow://dapp?url=${encodeURIComponent(pageUrl)}` },
];

function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export default function PublicPaymentPage() {
  const params = useParams();
  const paymentId = params.paymentId as string;

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [walletStatus, setWalletStatus] = useState<'idle' | 'connecting' | 'sending' | 'sent' | 'error'>('idle');
  const [walletError, setWalletError] = useState('');
  const [showQr, setShowQr] = useState(false);

  const { status: liveStatus, txHash } = usePaymentStatus(paymentId);
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    try { setIsIframe(window.self !== window.top); } catch { setIsIframe(true); }
  }, []);

  const fetchPayment = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments/${paymentId}`);
      if (!res.ok) throw new Error('Payment not found');
      const data = await res.json();
      setPayment(data.payment || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => { fetchPayment(); }, [fetchPayment]);

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

  async function handleCopy() {
    if (!payment?.address) return;
    await navigator.clipboard.writeText(payment.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleInjectedWalletPay() {
    if (!payment?.address) return;
    const ethereum = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    if (!ethereum) { setWalletError('No wallet detected.'); return; }

    setWalletStatus('connecting');
    setWalletError('');
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (!accounts?.length) throw new Error('No account selected');
      const from = accounts[0];
      const chainId = CHAIN_ID_MAP[payment.chain.id];
      if (chainId) {
        const currentHex = await ethereum.request({ method: 'eth_chainId' }) as string;
        const targetHex = '0x' + chainId.toString(16);
        if (currentHex !== targetHex) {
          try { await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetHex }] }); }
          catch { setWalletError(`Please switch to ${payment.chain.name}.`); setWalletStatus('idle'); return; }
        }
      }
      setWalletStatus('sending');
      const tokenContract = payment.token.contractAddress;
      const decimals = payment.token.decimals;
      const amountFloat = parseFloat(payment.amountExpected);
      if (tokenContract && tokenContract !== '') {
        const amountBig = BigInt(Math.round(amountFloat * (10 ** decimals)));
        const amountHex = '0x' + amountBig.toString(16).padStart(64, '0');
        const toHex = payment.address.toLowerCase().replace('0x', '').padStart(64, '0');
        const data = '0xa9059cbb' + toHex + amountHex;
        await ethereum.request({ method: 'eth_sendTransaction', params: [{ from, to: tokenContract, data, value: '0x0' }] });
      } else {
        const amountWei = BigInt(Math.round(amountFloat * 1e18));
        await ethereum.request({ method: 'eth_sendTransaction', params: [{ from, to: payment.address, value: '0x' + amountWei.toString(16) }] });
      }
      setWalletStatus('sent');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      setWalletError(msg.includes('rejected') || msg.includes('denied') ? 'Transaction rejected.' : msg);
      setWalletStatus('error');
    }
  }

  function handleMobileWalletOpen(walletId: string) {
    if (!payment?.address) return;
    const chainId = CHAIN_ID_MAP[payment.chain.id] || 1;
    const wallet = WALLETS.find(w => w.id === walletId);
    if (!wallet) return;
    const link = wallet.getDeepLink({
      chainId, to: payment.address, tokenContract: payment.token.contractAddress,
      amount: payment.amountExpected, decimals: payment.token.decimals, pageUrl: window.location.href,
    });
    if (link) window.location.href = link;
    else handleInjectedWalletPay();
  }

  const currentStatus = liveStatus || payment?.status || 'PENDING';
  const isSuccess = ['CONFIRMING', 'CONFIRMED', 'SWEPT'].includes(currentStatus);
  const isExpired = currentStatus === 'EXPIRED';
  const isFailed = currentStatus === 'FAILED';
  const isEvmChain = payment ? !!CHAIN_ID_MAP[payment.chain.id] : false;
  const hasInjectedWallet = typeof window !== 'undefined' && !!(window as unknown as { ethereum?: unknown }).ethereum;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg shadow-slate-200/50">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Payment Not Found</h1>
          <p className="mt-1 text-sm text-gray-500">{error || 'This payment does not exist.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-lg items-center px-5 py-3.5 gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500">
            <span className="text-xs font-bold text-white">B</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">Banksi</span>
          <span className="text-slate-300">|</span>
          <span className="text-sm text-gray-600">{payment.merchant.name}</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-lg space-y-5">

          {/* Amount card */}
          <div className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/50 text-center space-y-1">
            {payment.product && (
              <p className="text-xs font-medium text-gray-400 mb-2">{payment.product.name}</p>
            )}
            <p className="inline-flex items-center justify-center gap-2 text-3xl font-bold text-gray-900">
              <TokenIcon symbol={payment.token.symbol} size={28} />
              {payment.amountExpected} {payment.token.symbol}
            </p>
            <p className="inline-flex items-center justify-center gap-1.5 text-sm text-gray-500">
              ${Number(payment.fiatAmount || 0).toFixed(2)} {payment.currency} on
              <ChainIcon chainId={payment.chain.id} size={16} />
              {payment.chain.name}
            </p>
          </div>

          {/* Success */}
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
                <p className="text-xs text-gray-400 font-mono break-all bg-slate-50 rounded-lg px-3 py-2">TX: {txHash}</p>
              )}
            </div>
          )}

          {/* Expired */}
          {isExpired && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center space-y-2">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-700">Payment Expired</h2>
              <p className="text-sm text-gray-500">This payment has timed out. Please request a new payment.</p>
            </div>
          )}

          {/* Failed */}
          {isFailed && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center space-y-2">
              <h2 className="text-lg font-semibold text-red-700">Payment Failed</h2>
              <p className="text-sm text-gray-500">Please contact the merchant.</p>
            </div>
          )}

          {/* Active payment */}
          {currentStatus === 'PENDING' && walletStatus !== 'sent' && (
            <>
              {/* Timer */}
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

              {/* Wallet buttons (EVM) — hidden in iframe */}
              {isEvmChain && !isIframe && (
                <div className="space-y-2">
                  {hasInjectedWallet && (
                    <button
                      onClick={handleInjectedWalletPay}
                      disabled={walletStatus === 'connecting' || walletStatus === 'sending'}
                      className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-indigo-500 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-600 disabled:opacity-60 shadow-lg shadow-indigo-200"
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
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white text-base" style={{ backgroundColor: wallet.color }}>
                          {wallet.icon}
                        </span>
                        <span className="text-[10px] font-medium text-gray-500">{wallet.name}</span>
                      </button>
                    ))}
                  </div>
                  {walletError && <p className="text-xs text-red-500 text-center">{walletError}</p>}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                    <div className="relative flex justify-center">
                      <span className="bg-gradient-to-br from-slate-50 to-slate-100 px-3 text-xs text-gray-400">or send manually</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Open in new tab — shown in iframe */}
              {isIframe && (
                <a
                  href={typeof window !== 'undefined' ? window.location.href : ''}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                  Open in new tab to connect wallet
                </a>
              )}

              {/* QR + Address — always visible in iframe, toggleable otherwise */}
              <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-100 space-y-4">
                {!isIframe && (
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
                )}
                {(showQr || isIframe) && (
                  <div className="flex justify-center py-2">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <QRCodeSVG
                        value={typeof window !== 'undefined' ? window.location.href : (payment.address || '')}
                        size={160} level="M" bgColor="#ffffff" fgColor="#0f172a"
                      />
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Send exactly</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-lg font-bold text-gray-900">
                    <TokenIcon symbol={payment.token.symbol} size={20} />
                    {payment.amountExpected} {payment.token.symbol}
                  </p>
                </div>
                {payment.address && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400 text-center">To this address</p>
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
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="py-5 text-center">
        <p className="text-xs text-gray-400">Powered by <span className="font-semibold text-gray-500">Banksi</span></p>
      </footer>
    </div>
  );
}
