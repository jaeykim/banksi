'use client';

import { useState, useEffect, useCallback } from 'react';
import { BanksiClient, type BanksiConfig, type PaymentResult, type Chain } from './client';

interface BanksiPayButtonProps extends Partial<BanksiConfig> {
  amount: number;
  chainId?: string;
  tokenId?: string;
  /** Open Banksi payment page in a popup window instead of inline UI */
  popup?: boolean;
  onPaymentCreated?: (payment: PaymentResult) => void;
  onPaymentConfirmed?: (paymentId: string) => void;
  children?: React.ReactNode;
  className?: string;
}

export function BanksiPayButton({
  amount,
  chainId,
  tokenId,
  popup = true,
  onPaymentCreated,
  onPaymentConfirmed,
  children,
  className,
  ...config
}: BanksiPayButtonProps) {
  const [client] = useState(() => new BanksiClient(config));
  const [chains, setChains] = useState<Chain[]>([]);
  const [step, setStep] = useState<'idle' | 'select' | 'paying' | 'done'>('idle');
  const [selectedChain, setSelectedChain] = useState(chainId || '');
  const [selectedToken, setSelectedToken] = useState(tokenId || '');
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const banksiUrl = config.baseUrl || process.env.NEXT_PUBLIC_BANKSI_URL || 'https://banksi.vercel.app';
  const merchantSlug = config.merchantSlug || process.env.NEXT_PUBLIC_BANKSI_MERCHANT_SLUG || '';

  useEffect(() => {
    if (step === 'select' && chains.length === 0) {
      client.listChains().then(setChains).catch(() => setError('Failed to load chains'));
    }
  }, [step, chains.length, client]);

  // Poll for payment confirmation
  useEffect(() => {
    if (!payment || step !== 'paying') return;
    const iv = setInterval(async () => {
      try {
        const confirmed = await client.isPaymentConfirmed(payment.paymentId);
        if (confirmed) {
          setStep('done');
          onPaymentConfirmed?.(payment.paymentId);
          clearInterval(iv);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(iv);
  }, [payment, step, client, onPaymentConfirmed]);

  const handleCreateAndOpen = useCallback(async (chain: string, token: string) => {
    setError('');
    setLoading(true);
    try {
      const result = await client.createPayment({ chainId: chain, tokenId: token, amount });
      setPayment(result);
      setStep('paying');
      onPaymentCreated?.(result);

      if (popup) {
        // Open Banksi payment page in popup
        const payUrl = `${banksiUrl}/pay/${result.paymentId}`;
        const w = 480;
        const h = 700;
        const left = (window.screen.width - w) / 2;
        const top = (window.screen.height - h) / 2;
        window.open(payUrl, 'banksi-pay', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  }, [client, amount, popup, banksiUrl, onPaymentCreated]);

  const handleTokenSelect = useCallback((tokenId: string) => {
    setSelectedToken(tokenId);
    handleCreateAndOpen(selectedChain, tokenId);
  }, [selectedChain, handleCreateAndOpen]);

  // Idle — show pay button
  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('select')}
        disabled={loading}
        className={className || 'rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50'}
      >
        {children || `Pay $${amount.toFixed(2)} with Crypto`}
      </button>
    );
  }

  const selectedChainData = chains.find((c) => c.id === selectedChain);

  return (
    <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg space-y-4" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Select chain & token */}
      {step === 'select' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Pay ${amount.toFixed(2)}</p>
            <button onClick={() => { setStep('idle'); setSelectedChain(''); setSelectedToken(''); }}
              className="text-xs text-gray-400 hover:text-gray-600">&times;</button>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Network</p>
            <div className="flex flex-wrap gap-1.5">
              {chains.length === 0 && <p className="text-xs text-gray-400">Loading chains...</p>}
              {chains.map((c) => (
                <button key={c.id} onClick={() => { setSelectedChain(c.id); setSelectedToken(''); }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${selectedChain === c.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {selectedChainData && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Token</p>
              <div className="flex gap-1.5">
                {selectedChainData.tokens.map((tk) => (
                  <button key={tk.id} onClick={() => handleTokenSelect(tk.id)} disabled={loading}
                    className={`rounded-lg border px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${selectedToken === tk.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {tk.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-2">
              <svg className="animate-spin h-4 w-4 text-indigo-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              <span className="text-xs text-gray-500">Creating payment...</span>
            </div>
          )}
        </>
      )}

      {/* Paying — waiting for confirmation */}
      {step === 'paying' && payment && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">{payment.amountExpected} {payment.tokenSymbol}</p>
            <span className="text-xs text-gray-400">on {payment.chainName}</span>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" /><span className="relative h-2 w-2 rounded-full bg-amber-500" /></span>
            <span className="text-xs text-amber-700">Waiting for on-chain confirmation...</span>
          </div>

          {/* Reopen payment page */}
          <button
            onClick={() => window.open(`${banksiUrl}/pay/${payment.paymentId}`, 'banksi-pay', 'width=480,height=700')}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Open Payment Page
          </button>

          <p className="text-[10px] text-gray-400 text-center">
            Payment page opened in a new window. Complete the payment there.
          </p>
        </>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="text-center py-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-3">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <p className="text-sm font-semibold text-green-700">Payment Confirmed!</p>
        </div>
      )}

      {/* Powered by */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        <span className="text-[9px] text-gray-300">Powered by</span>
        <span className="text-[9px] font-semibold text-gray-400">Banksi</span>
      </div>
    </div>
  );
}

export { BanksiClient } from './client';
