'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { PaymentStatusBadge } from '@/components/payment/payment-status';
import { QrDisplay } from '@/components/payment/qr-display';

interface Chain {
  id: string;
  name: string;
  tokens: Token[];
}

interface Token {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
}

interface Product {
  id: string;
  name: string;
  priceUsd: number;
}

interface Payment {
  id: string;
  amountExpected: string;
  fiatAmount: number;
  currency: string;
  status: string;
  chainName: string;
  tokenSymbol: string;
  derivedAddress: string;
  createdAt: string;
  expiresAt: string;
}

export default function MerchantPaymentsPage() {
  const { data: session } = useSession();
  const merchantId = (session?.user as { merchantId?: string })?.merchantId;

  const [payments, setPayments] = useState<Payment[]>([]);
  const [chains, setChains] = useState<Chain[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedChainId, setSelectedChainId] = useState('');
  const [selectedTokenId, setSelectedTokenId] = useState('');
  const [fiatAmount, setFiatAmount] = useState('');
  const [creating, setCreating] = useState(false);

  // QR modal
  const [qrPayment, setQrPayment] = useState<Payment | null>(null);

  const selectedChain = chains.find((c) => c.id === selectedChainId);
  const filteredTokens = selectedChain?.tokens || [];

  const fetchPayments = useCallback(async () => {
    if (!merchantId) return;
    try {
      const res = await fetch(`/api/merchants/${merchantId}/payments`);
      if (!res.ok) throw new Error('Failed to fetch payments');
      const data = await res.json();
      setPayments(data.payments || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  const fetchChains = useCallback(async () => {
    try {
      const res = await fetch('/api/chains');
      if (!res.ok) throw new Error('Failed to fetch chains');
      const data = await res.json();
      setChains(data.chains || []);
    } catch (err) {
      console.error('Error fetching chains:', err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!merchantId) return;
    try {
      const res = await fetch(`/api/merchants/${merchantId}/products`);
      if (!res.ok) return;
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }, [merchantId]);

  useEffect(() => {
    if (merchantId) {
      fetchPayments();
      fetchChains();
      fetchProducts();
    }
  }, [merchantId, fetchPayments, fetchChains, fetchProducts]);

  // Auto-fill amount when product selected
  useEffect(() => {
    if (selectedProductId) {
      const product = products.find((p) => p.id === selectedProductId);
      if (product) {
        setFiatAmount(product.priceUsd.toString());
      }
    }
  }, [selectedProductId, products]);

  // Reset token when chain changes
  useEffect(() => {
    setSelectedTokenId('');
  }, [selectedChainId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!merchantId) return;
    setCreating(true);
    setError(null);

    try {
      const amount = parseFloat(fiatAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }
      if (!selectedChainId) throw new Error('Please select a chain');
      if (!selectedTokenId) throw new Error('Please select a token');

      const res = await fetch(`/api/merchants/${merchantId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: selectedChainId,
          tokenId: selectedTokenId,
          fiatAmount: amount,
          productId: selectedProductId || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create payment');
      }

      // Reset form
      setSelectedProductId('');
      setSelectedChainId('');
      setSelectedTokenId('');
      setFiatAmount('');
      setShowForm(false);
      await fetchPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment');
    } finally {
      setCreating(false);
    }
  }

  function shortId(id: string) {
    return id.length > 10 ? `${id.slice(0, 4)}...${id.slice(-4)}` : id;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (!merchantId) {
    return (
      <div className="rounded-lg border border-error/20 bg-error/5 p-5">
        <p className="text-sm text-error">No merchant assigned to your account.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-muted text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Payments</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors"
        >
          {showForm ? 'Cancel' : 'Create Payment'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
      )}

      {/* Create payment form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-border bg-surface p-5 space-y-4"
        >
          <h2 className="text-lg font-medium text-foreground">New Payment</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Product (optional) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Product (optional)
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
              >
                <option value="">Custom amount</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - ${p.priceUsd.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Amount (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={fiatAmount}
                onChange={(e) => setFiatAmount(e.target.value)}
                required
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
                placeholder="0.00"
              />
            </div>

            {/* Chain */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Chain</label>
              <select
                value={selectedChainId}
                onChange={(e) => setSelectedChainId(e.target.value)}
                required
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
              >
                <option value="">Select chain</option>
                {chains.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Token */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Token</label>
              <select
                value={selectedTokenId}
                onChange={(e) => setSelectedTokenId(e.target.value)}
                required
                disabled={!selectedChainId}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light disabled:opacity-50"
              >
                <option value="">
                  {selectedChainId ? 'Select token' : 'Select a chain first'}
                </option>
                {filteredTokens.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.symbol} - {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Token amount preview */}
          {fiatAmount && selectedTokenId && (
            <div className="rounded-lg bg-surface-alt px-4 py-3">
              <p className="text-sm text-muted">
                Token amount:{' '}
                <span className="font-medium text-foreground">
                  {parseFloat(fiatAmount).toFixed(2)}{' '}
                  {filteredTokens.find((t) => t.id === selectedTokenId)?.symbol}
                </span>
                <span className="ml-1 text-xs text-muted">(1:1 stablecoin rate)</span>
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {creating ? 'Generating...' : 'Generate Payment'}
          </button>
        </form>
      )}

      {/* Payments table */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left">
              <th className="px-4 py-3 font-medium text-muted">ID</th>
              <th className="px-4 py-3 font-medium text-muted">Amount</th>
              <th className="px-4 py-3 font-medium text-muted">Chain</th>
              <th className="px-4 py-3 font-medium text-muted">Token</th>
              <th className="px-4 py-3 font-medium text-muted">Status</th>
              <th className="px-4 py-3 font-medium text-muted">Created</th>
              <th className="px-4 py-3 font-medium text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No payments yet. Create your first payment above.
                </td>
              </tr>
            )}
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="border-b border-border hover:bg-surface-alt transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-foreground">
                  {shortId(payment.id)}
                </td>
                <td className="px-4 py-3 text-foreground">
                  <div>
                    {payment.amountExpected} {payment.tokenSymbol}
                  </div>
                  <div className="text-xs text-muted">
                    ${payment.fiatAmount.toFixed(2)} {payment.currency}
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground">{payment.chainName}</td>
                <td className="px-4 py-3 text-foreground">{payment.tokenSymbol}</td>
                <td className="px-4 py-3">
                  <PaymentStatusBadge status={payment.status} />
                </td>
                <td className="px-4 py-3 text-muted text-xs">
                  {formatDate(payment.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQrPayment(payment)}
                      className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-alt transition-colors"
                    >
                      View QR
                    </button>
                    <a
                      href={`/pay/${payment.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                    >
                      Open
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* QR Modal */}
      {qrPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 px-4"
          onClick={() => setQrPayment(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-surface p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Payment QR Code</h3>
              <button
                onClick={() => setQrPayment(null)}
                className="rounded-lg p-1 text-muted hover:bg-surface-alt transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-center space-y-1">
              <p className="text-2xl font-bold text-foreground">
                {qrPayment.amountExpected} {qrPayment.tokenSymbol}
              </p>
              <p className="text-sm text-muted">
                ${qrPayment.fiatAmount.toFixed(2)} on {qrPayment.chainName}
              </p>
            </div>

            <div className="flex justify-center">
              <QrDisplay
                paymentUri={`${window.location.origin}/pay/${qrPayment.id}`}
                size={200}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted">Address</p>
              <p className="rounded-lg bg-surface-alt px-3 py-2 font-mono text-xs text-foreground break-all">
                {qrPayment.derivedAddress}
              </p>
            </div>

            <div className="flex justify-center">
              <PaymentStatusBadge status={qrPayment.status} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
