'use client';

import { useState, useEffect, useCallback } from 'react';
import { BanksiClient, type BanksiConfig, type PaymentResult, type Chain } from './client';

interface BanksiPayButtonProps extends Partial<BanksiConfig> {
  amount: number;
  chainId?: string;
  tokenId?: string;
  onPaymentCreated?: (payment: PaymentResult) => void;
  onPaymentConfirmed?: (paymentId: string) => void;
  children?: React.ReactNode;
  className?: string;
}

export function BanksiPayButton({
  amount,
  chainId,
  tokenId,
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
  const [copied, setCopied] = useState(false);

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

  const handlePay = useCallback(async () => {
    if (!selectedChain || !selectedToken) return;
    setError('');
    try {
      const result = await client.createPayment({ chainId: selectedChain, tokenId: selectedToken, amount });
      setPayment(result);
      setStep('paying');
      onPaymentCreated?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    }
  }, [client, selectedChain, selectedToken, amount, onPaymentCreated]);

  const handleCopy = useCallback(async () => {
    if (!payment) return;
    await navigator.clipboard.writeText(payment.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [payment]);

  if (step === 'idle') {
    return (
      <button onClick={() => chainId && tokenId ? handlePay() : setStep('select')} className={className || 'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700'}>
        {children || `Pay $${amount.toFixed(2)}`}
      </button>
    );
  }

  const selectedChainData = chains.find((c) => c.id === selectedChain);

  return (
    <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {step === 'select' && (
        <>
          <p className="text-sm font-medium text-gray-700">Select network & token</p>
          <div className="flex flex-wrap gap-2">
            {chains.map((c) => (
              <button key={c.id} onClick={() => { setSelectedChain(c.id); setSelectedToken(''); }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${selectedChain === c.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>
                {c.name}
              </button>
            ))}
          </div>
          {selectedChainData && (
            <div className="flex gap-2">
              {selectedChainData.tokens.map((tk) => (
                <button key={tk.id} onClick={() => setSelectedToken(tk.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${selectedToken === tk.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>
                  {tk.symbol}
                </button>
              ))}
            </div>
          )}
          {selectedToken && (
            <button onClick={handlePay} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Pay ${amount.toFixed(2)}
            </button>
          )}
          <button onClick={() => setStep('idle')} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
        </>
      )}

      {step === 'paying' && payment && (
        <>
          <p className="text-sm text-gray-500">Send exactly</p>
          <p className="text-lg font-bold text-gray-900">{payment.amountExpected} {payment.tokenSymbol}</p>
          <p className="text-xs text-gray-500">on {payment.chainName}</p>
          <button onClick={handleCopy} className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 font-mono text-xs text-gray-800 break-all text-left hover:bg-gray-100">
            {payment.address}
          </button>
          <p className="text-xs text-center text-gray-400">{copied ? 'Copied!' : 'Tap to copy'}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" /><span className="relative h-2 w-2 rounded-full bg-amber-400" /></span>
            Waiting for payment...
          </div>
        </>
      )}

      {step === 'done' && (
        <div className="text-center py-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-3">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <p className="text-sm font-semibold text-green-700">Payment Confirmed</p>
        </div>
      )}
    </div>
  );
}

export { BanksiClient } from './client';
