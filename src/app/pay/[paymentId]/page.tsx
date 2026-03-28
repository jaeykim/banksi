'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { usePaymentStatus } from '@/hooks/use-payment-status';

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
  product: { name: string; description: string | null } | null;
  txHash: string | null;
  expiresAt: string;
}

const CHAIN_ID_MAP: Record<string, number> = {
  ethereum: 1, polygon: 137, bsc: 56, arbitrum: 42161,
};

// Build ERC-20 transfer deeplink data
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
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    color: 'bg-orange-500',
    getDeepLink: ({ to, tokenContract, amount, decimals, pageUrl }) => {
      // MetaMask mobile deeplink: open dapp browser with current page
      // The page will then use window.ethereum to send the tx
      return `metamask://dapp/${pageUrl.replace(/^https?:\/\//, '')}`;
    },
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    color: 'bg-blue-500',
    getDeepLink: ({ pageUrl }) => {
      return `cbwallet://dapp?url=${encodeURIComponent(pageUrl)}`;
    },
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '🛡️',
    color: 'bg-blue-700',
    getDeepLink: ({ to, tokenContract, amount, decimals, chainId }) => {
      // Trust Wallet uses WalletConnect or transfer deeplinks
      if (tokenContract) {
        const data = buildErc20TransferData(to, amount, decimals);
        return `trust://send?asset=c${chainId}&to=${tokenContract}&data=${data}`;
      }
      const weiAmount = BigInt(Math.round(parseFloat(amount) * 1e18));
      return `trust://send?asset=c${chainId}&to=${to}&amount=${weiAmount.toString()}`;
    },
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    icon: '🌈',
    color: 'bg-purple-500',
    getDeepLink: ({ pageUrl }) => {
      return `rainbow://dapp?url=${encodeURIComponent(pageUrl)}`;
    },
  },
];

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
  const [showManual, setShowManual] = useState(false);

  const { status: liveStatus, txHash } = usePaymentStatus(paymentId);

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
    function updateTimer() {
      const diff = new Date(payment!.expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    }
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
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
    if (!ethereum) {
      setWalletError('No wallet detected. Install MetaMask or Rabby.');
      return;
    }

    setWalletStatus('connecting');
    setWalletError('');

    try {
      const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (!accounts?.length) throw new Error('No account selected');
      const from = accounts[0];
      const chainId = CHAIN_ID_MAP[payment.chain.id];

      if (chainId) {
        const currentChainId = await ethereum.request({ method: 'eth_chainId' }) as string;
        const targetHex = '0x' + chainId.toString(16);
        if (currentChainId !== targetHex) {
          try {
            await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetHex }] });
          } catch {
            setWalletError(`Please switch to ${payment.chain.name} in your wallet.`);
            setWalletStatus('idle');
            return;
          }
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
    if (!payment?.address) return;
    const chainId = CHAIN_ID_MAP[payment.chain.id] || 1;
    const wallet = WALLETS.find(w => w.id === walletId);
    if (!wallet) return;

    const link = wallet.getDeepLink({
      chainId,
      to: payment.address,
      tokenContract: payment.token.contractAddress,
      amount: payment.amountExpected,
      decimals: payment.token.decimals,
      pageUrl: window.location.href,
    });

    if (link) {
      window.location.href = link;
    } else {
      handleInjectedWalletPay();
    }
  }

  const currentStatus = liveStatus || payment?.status || 'PENDING';
  const isSuccess = ['CONFIRMING', 'CONFIRMED', 'SWEPT'].includes(currentStatus);
  const isExpired = currentStatus === 'EXPIRED';
  const isFailed = currentStatus === 'FAILED';
  const isEvmChain = payment ? !!CHAIN_ID_MAP[payment.chain.id] : false;
  const hasInjectedWallet = typeof window !== 'undefined' && !!(window as unknown as { ethereum?: unknown }).ethereum;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading payment...</div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Payment Not Found</h1>
          <p className="text-sm text-gray-500">{error || 'This payment does not exist.'}</p>
        </div>
      </div>
    );
  }

  // QR encodes this page's URL so scanning opens the wallet selection page
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-8">
      {/* Branding */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center">
          <span className="text-sm font-bold text-white">B</span>
        </div>
        <span className="text-lg font-semibold text-gray-900">Banksi</span>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* Amount Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
          <p className="text-sm text-gray-500 mb-1">Pay {payment.merchant.name}</p>
          {payment.product && (
            <p className="text-xs text-gray-400 mb-2">{payment.product.name}</p>
          )}
          <p className="text-3xl font-bold text-gray-900">
            {payment.amountExpected} {payment.token.symbol}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            ${Number(payment.fiatAmount || 0).toFixed(2)} {payment.currency} on {payment.chain.name}
          </p>
        </div>

        {/* Success */}
        {(isSuccess || walletStatus === 'sent') && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-green-700">
              {walletStatus === 'sent' ? 'Transaction Sent' : currentStatus === 'CONFIRMING' ? 'Payment Detected' : 'Payment Confirmed'}
            </h2>
            <p className="text-sm text-gray-500">
              {walletStatus === 'sent' ? 'Waiting for blockchain confirmation...'
                : currentStatus === 'CONFIRMING' ? 'Confirming on the blockchain...'
                : 'Payment confirmed. Thank you!'}
            </p>
            {txHash && <p className="text-xs text-gray-400 font-mono break-all">TX: {txHash}</p>}
          </div>
        )}

        {isExpired && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-700">Payment Expired</h2>
            <p className="text-sm text-gray-500 mt-1">Please request a new payment.</p>
          </div>
        )}

        {isFailed && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <h2 className="text-lg font-semibold text-red-700">Payment Failed</h2>
            <p className="text-sm text-gray-500 mt-1">Please contact the merchant.</p>
          </div>
        )}

        {/* Active Payment */}
        {currentStatus === 'PENDING' && walletStatus !== 'sent' && (
          <>
            {/* Wallet Selection */}
            {isEvmChain && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide text-center">
                  Choose Wallet
                </p>

                {/* Injected wallet (desktop) */}
                {hasInjectedWallet && (
                  <button
                    onClick={handleInjectedWalletPay}
                    disabled={walletStatus === 'connecting' || walletStatus === 'sending'}
                    className="w-full flex items-center gap-3 rounded-lg border-2 border-indigo-500 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-white text-lg">
                      🌐
                    </span>
                    <div className="text-left flex-1">
                      <div className="font-semibold">Browser Wallet</div>
                      <div className="text-xs font-normal text-gray-500">MetaMask, Rabby, Coinbase, etc.</div>
                    </div>
                    {(walletStatus === 'connecting' || walletStatus === 'sending') && (
                      <svg className="animate-spin h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Mobile wallet buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {WALLETS.map((wallet) => (
                    <button
                      key={wallet.id}
                      onClick={() => handleMobileWalletOpen(wallet.id)}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${wallet.color} text-white text-base`}>
                        {wallet.icon}
                      </span>
                      <span className="text-xs">{wallet.name}</span>
                    </button>
                  ))}
                </div>

                {walletError && (
                  <p className="text-xs text-red-600 text-center">{walletError}</p>
                )}
              </div>
            )}

            {/* Manual transfer toggle */}
            <button
              onClick={() => setShowManual(!showManual)}
              className="w-full text-center text-sm text-indigo-600 hover:text-indigo-500 font-medium py-2"
            >
              {showManual ? 'Hide manual transfer' : 'Send manually instead'}
            </button>

            {showManual && (
              <>
                {/* QR Code - encodes this page URL */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col items-center">
                  <div className="rounded-xl bg-white p-3">
                    <QRCodeSVG value={pageUrl || `${payment.address}`} size={180} level="M" bgColor="#ffffff" fgColor="#0f172a" />
                  </div>
                  <p className="mt-2 text-xs text-gray-400">Scan to open payment page</p>
                </div>

                {/* Address */}
                {payment.address && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Send {payment.amountExpected} {payment.token.symbol} to
                    </p>
                    <button
                      onClick={handleCopy}
                      className="w-full text-left rounded-lg bg-gray-50 px-3 py-2.5 font-mono text-xs text-gray-900 break-all hover:bg-gray-100 transition-colors"
                    >
                      {payment.address}
                    </button>
                    <p className="text-xs text-center text-gray-400">
                      {copied ? <span className="text-green-600 font-medium">Copied!</span> : 'Tap to copy'}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Timer */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                </span>
                <span className="text-sm text-gray-500">Waiting for payment</span>
              </div>
              <div className="text-sm font-mono font-medium text-gray-900">{timeLeft}</div>
            </div>
          </>
        )}
      </div>

      <p className="mt-8 text-xs text-gray-400">Powered by Banksi</p>
    </div>
  );
}

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}
