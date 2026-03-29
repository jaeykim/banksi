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
  const [loading, setLoading] = useState(false);

  const banksiUrl = config.baseUrl || 'https://banksi.vercel.app';

  useEffect(() => {
    if (step === 'select' && chains.length === 0) {
      client.listChains().then(setChains).catch(() => setError('Failed to load chains'));
    }
  }, [step, chains.length, client]);

  // Poll for confirmation
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  }, [client, amount, onPaymentCreated]);

  const handleTokenSelect = useCallback((tid: string) => {
    setSelectedToken(tid);
    handleCreateAndOpen(selectedChain, tid);
  }, [selectedChain, handleCreateAndOpen]);

  const handleClose = useCallback(() => {
    if (step === 'done') {
      setStep('idle');
      setPayment(null);
      setSelectedChain(chainId || '');
      setSelectedToken(tokenId || '');
    } else {
      setStep('idle');
    }
  }, [step, chainId, tokenId]);

  // Idle — just the button
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
  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 99999,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };
  const backdropStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    transition: 'opacity 0.2s',
  };
  const sheetStyle: React.CSSProperties = {
    position: 'relative', width: '100%', maxWidth: 480,
    maxHeight: '90vh', background: '#fff',
    borderRadius: '16px 16px 0 0', overflow: 'hidden',
    boxShadow: '0 -4px 40px rgba(0,0,0,0.15)',
    animation: 'banksi-slide-up 0.3s ease',
  };

  return (
    <>
      <style>{`@keyframes banksi-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      <div style={overlayStyle}>
        <div style={backdropStyle} onClick={handleClose} />

        <div style={sheetStyle}>
          {/* Handle bar */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#d1d5db' }} />
          </div>

          {/* Select chain & token */}
          {step === 'select' && (
            <div style={{ padding: '12px 20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>Pay ${amount.toFixed(2)}</span>
                <button onClick={handleClose} style={{ fontSize: 20, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
              </div>

              {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error}</p>}

              <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Network</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {chains.length === 0 && <span style={{ fontSize: 12, color: '#9ca3af' }}>Loading...</span>}
                {chains.map((c) => (
                  <button key={c.id} onClick={() => { setSelectedChain(c.id); setSelectedToken(''); }}
                    style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: `2px solid ${selectedChain === c.id ? '#6366f1' : '#e5e7eb'}`, background: selectedChain === c.id ? '#eef2ff' : '#fff', color: selectedChain === c.id ? '#4338ca' : '#6b7280', cursor: 'pointer' }}>
                    {c.name}
                  </button>
                ))}
              </div>

              {selectedChainData && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Token</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {selectedChainData.tokens.map((tk) => (
                      <button key={tk.id} onClick={() => handleTokenSelect(tk.id)} disabled={loading}
                        style={{ padding: '10px 20px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: `2px solid ${selectedToken === tk.id ? '#6366f1' : '#e5e7eb'}`, background: selectedToken === tk.id ? '#eef2ff' : '#fff', color: selectedToken === tk.id ? '#4338ca' : '#6b7280', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
                        {tk.symbol}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {loading && (
                <p style={{ fontSize: 12, color: '#6366f1', textAlign: 'center', marginTop: 16 }}>Creating payment...</p>
              )}
            </div>
          )}

          {/* Payment page in iframe */}
          {step === 'paying' && payment && (
            <div style={{ height: 'min(80vh, 600px)' }}>
              <iframe
                src={`${banksiUrl}/pay/${payment.paymentId}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Banksi Payment"
              />
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#15803d' }}>Payment Confirmed!</p>
              <button onClick={handleClose} style={{ marginTop: 16, padding: '10px 32px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer' }}>Done</button>
            </div>
          )}

          {/* Powered by */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, padding: '8px 0 12px' }}>
            <span style={{ fontSize: 9, color: '#d1d5db' }}>Powered by</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af' }}>Banksi</span>
          </div>
        </div>
      </div>
    </>
  );
}

export { BanksiClient } from './client';
