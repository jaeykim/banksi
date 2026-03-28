'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChainIcon } from '@/components/chain-icon';
import { TokenIcon } from '@/components/token-icon';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Payment {
  id: string;
  merchantId: string;
  merchantName: string;
  amountExpected: string;
  amountReceived: string | null;
  fiatAmount: number;
  currency: string;
  chainId: string;
  chainName: string;
  tokenSymbol: string;
  status: string;
  txHash: string | null;
  createdAt: string;
  paidAt: string | null;
}

interface Merchant {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-warning/10 text-warning border-warning/20',
    CONFIRMED: 'bg-success/10 text-success border-success/20',
    SWEPT: 'bg-primary/10 text-primary border-primary/20',
    EXPIRED: 'bg-surface-alt text-muted border-border',
    FAILED: 'bg-error/10 text-error border-error/20',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        styles[status] || 'bg-surface-alt text-muted border-border'
      }`}
    >
      {status}
    </span>
  );
}

function truncateHash(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMerchant, setFilterMerchant] = useState('');
  const [loading, setLoading] = useState(true);
  const [sweepingId, setSweepingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [paymentsRes, merchantsRes] = await Promise.all([
        fetch('/api/admin/payments'),
        fetch('/api/admin/merchants'),
      ]);

      if (!paymentsRes.ok) throw new Error('Failed to fetch payments');
      if (!merchantsRes.ok) throw new Error('Failed to fetch merchants');

      const paymentsData = await paymentsRes.json();
      const merchantsData = await merchantsRes.json();

      setPayments(paymentsData.payments || []);
      setMerchants(
        (merchantsData.merchants || []).map((m: Merchant) => ({
          id: m.id,
          name: m.name,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSweepPayment(paymentId: string) {
    setSweepingId(paymentId);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Sweep failed');
      }

      if (data.result?.status === 'FAILED') {
        throw new Error(data.result.error || 'Sweep failed');
      }

      setSuccessMsg(`Payment ${paymentId.slice(0, 8)}... swept successfully`);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sweep failed');
    } finally {
      setSweepingId(null);
    }
  }

  // Apply filters
  const filtered = payments.filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterMerchant && p.merchantId !== filterMerchant) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted">Loading payments...</div>
      </div>
    );
  }

  const statuses = ['PENDING', 'CONFIRMED', 'SWEPT', 'EXPIRED', 'FAILED'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">All Payments</h1>

      {/* Alerts */}
      {error && (
        <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
          {successMsg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Merchant
          </label>
          <select
            value={filterMerchant}
            onChange={(e) => setFilterMerchant(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">All Merchants</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <span className="text-xs text-muted py-2">
            {filtered.length} payment{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-lg border border-border bg-surface">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted">
            No payments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Merchant</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Fiat</th>
                  <th className="px-4 py-3 font-medium">Chain</th>
                  <th className="px-4 py-3 font-medium">Token</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tx Hash</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-0 hover:bg-surface-alt/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {p.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {p.merchantName}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {p.amountExpected}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      ${p.fiatAmount.toFixed(2)} {p.currency}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <ChainIcon chainId={p.chainId} size={16} />
                        {p.chainName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <TokenIcon symbol={p.tokenSymbol} size={16} />
                        {p.tokenSymbol}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {p.txHash ? truncateHash(p.txHash) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleSweepPayment(p.id)}
                          disabled={sweepingId === p.id}
                          className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-light transition-colors disabled:opacity-50"
                        >
                          {sweepingId === p.id ? 'Sweeping...' : 'Sweep'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
