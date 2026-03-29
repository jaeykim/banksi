'use client';

import { useState, useEffect, useCallback } from 'react';
import { BanksiClient, type BanksiConfig, type PaymentResult, type Chain, type ChainToken } from './client';

type EthProvider = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

const CHAIN_HEX: Record<string, string> = {
  ethereum: '0x1', bsc: '0x38', arbitrum: '0xa4b1', polygon: '0x89',
};

function buildErc20Transfer(to: string, amount: string, decimals: number): string {
  const amt = BigInt(Math.round(parseFloat(amount) * (10 ** decimals)));
  const toHex = to.toLowerCase().replace('0x', '').padStart(64, '0');
  const amtHex = amt.toString(16).padStart(64, '0');
  return '0xa9059cbb' + toHex + amtHex;
}

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
  const [open, setOpen] = useState(false);
  const [chains, setChains] = useState<Chain[]>([]);
  const [step, setStep] = useState<'select' | 'pay' | 'done'>('select');
  const [selChain, setSelChain] = useState(chainId || '');
  const [selToken, setSelToken] = useState(tokenId || '');
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletSent, setWalletSent] = useState(false);
  const [selTokenData, setSelTokenData] = useState<ChainToken | null>(null);

  const banksiUrl = config.baseUrl || 'https://banksi.vercel.app';

  // Prefetch chains on mount (not on open)
  useEffect(() => {
    client.listChains().then(setChains).catch(() => {});
  }, [client]);

  // Poll for confirmation
  useEffect(() => {
    if (!payment || step !== 'pay') return;
    const iv = setInterval(async () => {
      try {
        if (await client.isPaymentConfirmed(payment.paymentId)) {
          setStep('done');
          onPaymentConfirmed?.(payment.paymentId);
          clearInterval(iv);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(iv);
  }, [payment, step, client, onPaymentConfirmed]);

  const handleOpen = () => {
    setOpen(true);
    setStep('select');
    setSelChain(chainId || '');
    setSelToken(tokenId || '');
    setPayment(null);
    setError('');
  };

  const handleClose = () => {
    setOpen(false);
    if (step === 'done') {
      setStep('select');
      setPayment(null);
    }
  };

  const handleTokenSelect = useCallback(async (chain: string, token: string) => {
    setError('');
    setLoading(true);
    setWalletSent(false);
    // Find token data for wallet tx
    const chainObj = chains.find((c) => c.id === chain);
    const tokenObj = chainObj?.tokens.find((t) => t.id === token);
    setSelTokenData(tokenObj || null);
    try {
      const result = await client.createPayment({ chainId: chain, tokenId: token, amount });
      setPayment(result);
      setStep('pay');
      onPaymentCreated?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  }, [client, amount, chains, onPaymentCreated]);

  const handleCopy = async () => {
    if (!payment) return;
    await navigator.clipboard.writeText(payment.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWalletPay = async () => {
    if (!payment || !selTokenData) return;
    const ethereum = (window as unknown as { ethereum?: EthProvider }).ethereum;
    if (!ethereum) {
      setError('No wallet detected. Install MetaMask or similar.');
      return;
    }
    setWalletLoading(true);
    setError('');
    try {
      // 1. Connect wallet
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (!accounts?.length) throw new Error('No account selected');
      const from = accounts[0];

      // 2. Switch chain if needed
      const targetHex = CHAIN_HEX[selChain];
      if (targetHex) {
        const currentChain = await ethereum.request({ method: 'eth_chainId' }) as string;
        if (currentChain !== targetHex) {
          try {
            await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetHex }] });
          } catch {
            setError(`Please switch to ${payment.chainName} in your wallet.`);
            setWalletLoading(false);
            return;
          }
        }
      }

      // 3. Build & send ERC-20 transfer directly
      const contractAddress = selTokenData.contractAddress;
      const decimals = selTokenData.decimals || 6;

      if (contractAddress) {
        const data = buildErc20Transfer(payment.address, payment.amountExpected, decimals);
        await ethereum.request({
          method: 'eth_sendTransaction',
          params: [{ from, to: contractAddress, data, value: '0x0' }],
        });
      } else {
        // Native token fallback
        const amountWei = BigInt(Math.round(parseFloat(payment.amountExpected) * 1e18));
        await ethereum.request({
          method: 'eth_sendTransaction',
          params: [{ from, to: payment.address, value: '0x' + amountWei.toString(16) }],
        });
      }

      setWalletSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      if (msg.includes('rejected') || msg.includes('denied')) {
        setError('Transaction rejected by user.');
      } else if (!msg.includes('cancelled')) {
        setError(msg);
      }
    } finally {
      setWalletLoading(false);
    }
  };

  const chainData = chains.find((c) => c.id === selChain);

  // ── Button ──
  if (!open) {
    return (
      <button onClick={handleOpen}
        className={className || 'rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors'}>
        {children || `Pay $${amount.toFixed(2)} with Crypto`}
      </button>
    );
  }

  // ── Overlay ──
  const S = {
    overlay: { position: 'fixed' as const, inset: 0, zIndex: 99999, display: 'flex', alignItems: 'flex-end' as const, justifyContent: 'center' as const, fontFamily: 'system-ui,-apple-system,sans-serif' },
    backdrop: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)' },
    sheet: { position: 'relative' as const, width: '100%', maxWidth: 420, maxHeight: '92vh', background: '#fff', borderRadius: '20px 20px 0 0', overflow: 'auto' as const, boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', animation: 'banksi-up .3s ease' },
    handle: { display: 'flex', justifyContent: 'center' as const, padding: '10px 0 6px' },
    bar: { width: 36, height: 4, borderRadius: 2, background: '#d1d5db' },
    head: { display: 'flex', justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: '4px 20px 12px' },
    close: { fontSize: 22, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' as const, lineHeight: 1 },
    body: { padding: '0 20px 24px' },
    label: { fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 },
    addr: { width: '100%', padding: '12px', fontSize: 11, fontFamily: 'monospace', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', textAlign: 'center' as const, wordBreak: 'break-all' as const, cursor: 'pointer' as const },
  };
  const chip = (active: boolean): React.CSSProperties => ({ padding: '10px 16px', fontSize: 12, fontWeight: 600, borderRadius: 10, border: `2px solid ${active ? '#6366f1' : '#e5e7eb'}`, background: active ? '#eef2ff' : '#fff', color: active ? '#4338ca' : '#6b7280', cursor: 'pointer' });
  const btnStyle = (bg: string): React.CSSProperties => ({ width: '100%', padding: '12px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', background: bg, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 });

  return (
    <>
      <style>{`@keyframes banksi-up{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <div style={S.overlay}>
        <div style={S.backdrop} onClick={handleClose} />
        <div style={S.sheet}>
          <div style={S.handle}><div style={S.bar} /></div>
          <div style={S.head}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
              {step === 'done' ? 'Payment Confirmed' : `Pay $${amount.toFixed(2)}`}
            </span>
            <button style={S.close} onClick={handleClose}>&times;</button>
          </div>

          <div style={S.body}>
            {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error}</p>}

            {/* ── Step: Select chain & token ── */}
            {step === 'select' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <p style={S.label}>Network</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {chains.length === 0 && <span style={{ fontSize: 12, color: '#9ca3af' }}>Loading...</span>}
                    {chains.map((c) => (
                      <button key={c.id} style={{ ...chip(selChain === c.id), display: 'flex', alignItems: 'center', gap: 6 }}
                        onClick={() => { setSelChain(c.id); setSelToken(''); }}>
                        <img src={`${banksiUrl}/assets/chains/${c.id}.svg`} alt="" width={16} height={16} style={{ flexShrink: 0 }} />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {chainData && (
                  <div>
                    <p style={S.label}>Token</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {chainData.tokens.map((tk) => (
                        <button key={tk.id} style={{ ...chip(selToken === tk.id), opacity: loading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
                          disabled={loading}
                          onClick={() => { setSelToken(tk.id); handleTokenSelect(selChain, tk.id); }}>
                          <img src={`${banksiUrl}/assets/tokens/${tk.symbol.toLowerCase()}.svg`} alt="" width={16} height={16} style={{ flexShrink: 0 }} />
                          {tk.symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {loading && <p style={{ fontSize: 12, color: '#6366f1', textAlign: 'center' }}>Creating payment...</p>}
              </div>
            )}

            {/* ── Step: Pay ── */}
            {step === 'pay' && payment && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Amount */}
                <div style={{ textAlign: 'center', padding: '4px 0' }}>
                  <p style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Send exactly</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: '#111', lineHeight: 1.2 }}>
                    {payment.amountExpected} {payment.tokenSymbol}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    ${amount.toFixed(2)} USD &middot; {payment.chainName}
                  </p>
                </div>

                {/* Wallet button — primary action */}
                {!walletSent ? (
                  <button style={btnStyle('#6366f1')} onClick={handleWalletPay} disabled={walletLoading}>
                    {walletLoading ? (
                      <span>Confirm in wallet...</span>
                    ) : (
                      <>
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Pay with Browser Wallet
                      </>
                    )}
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>Transaction sent! Waiting for confirmation...</span>
                  </div>
                )}

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>or scan / copy</span>
                  <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                </div>

                {/* QR Code */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ padding: 10, border: '1px solid #f1f5f9', borderRadius: 14, background: '#fff' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(payment.address)}`}
                      alt="QR Code"
                      width={160} height={160}
                      style={{ borderRadius: 6 }}
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <p style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 6 }}>Deposit address</p>
                  <div style={S.addr} onClick={handleCopy}>
                    {payment.address}
                  </div>
                  <p style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: 4 }}>
                    {copied ? '✓ Copied!' : 'Tap to copy'}
                  </p>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                  <span style={{ fontSize: 12, color: '#92400e' }}>Waiting for on-chain confirmation...</span>
                </div>

                {/* Change selection */}
                <button onClick={() => { setStep('select'); setPayment(null); setSelToken(''); }}
                  style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
                  ← Change network / token
                </button>
              </div>
            )}

            {/* ── Step: Done ── */}
            {step === 'done' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#15803d' }}>Payment Confirmed!</p>
                <button onClick={handleClose} style={{ ...btnStyle('#6366f1'), marginTop: 20, width: 'auto', padding: '10px 40px', display: 'inline-flex' }}>Done</button>
              </div>
            )}
          </div>

          {/* Powered by */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '4px 0 14px' }}>
            <span style={{ fontSize: 9, color: '#d1d5db' }}>Powered by</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af' }}>Banksi</span>
          </div>
        </div>
      </div>
    </>
  );
}

export { BanksiClient } from './client';
