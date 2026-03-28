'use client';

import { useEffect, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SweepStats {
  totalSwept: number;
  pendingSweep: number;
  failedSweeps: number;
}

interface SweepJob {
  id: string;
  merchantId: string;
  chainId: string;
  chainName: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  merchantAmount: string | null;
  feeAmount: string | null;
  feePercent: number | null;
  feeTxHash: string | null;
  txHash: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Merchant {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Status badge component
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-warning/10 text-warning border-warning/20',
    SUBMITTED: 'bg-primary/10 text-primary border-primary/20',
    CONFIRMED: 'bg-success/10 text-success border-success/20',
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

// ---------------------------------------------------------------------------
// Address truncation
// ---------------------------------------------------------------------------

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AdminSweepPage() {
  const [stats, setStats] = useState<SweepStats>({
    totalSwept: 0,
    pendingSweep: 0,
    failedSweeps: 0,
  });
  const [jobs, setJobs] = useState<SweepJob[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch sweep data
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [sweepRes, merchantRes] = await Promise.all([
        fetch('/api/admin/sweep'),
        fetch('/api/admin/merchants'),
      ]);

      if (!sweepRes.ok) throw new Error('Failed to fetch sweep data');
      if (!merchantRes.ok) throw new Error('Failed to fetch merchants');

      const sweepData = await sweepRes.json();
      const merchantData = await merchantRes.json();

      setStats(sweepData.stats);
      setJobs(sweepData.jobs);
      setMerchants(
        (merchantData.merchants || []).map((m: Merchant) => ({
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

  // Sweep all confirmed
  async function handleSweepAll() {
    setSweeping(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Sweep failed');
      }

      setSuccessMsg(
        `Sweep complete: ${data.swept} swept, ${data.failed} failed`,
      );
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sweep failed');
    } finally {
      setSweeping(false);
    }
  }

  // Sweep by merchant
  async function handleSweepMerchant() {
    if (!selectedMerchant) return;

    setSweeping(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: selectedMerchant }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Sweep failed');
      }

      setSuccessMsg(
        `Merchant sweep complete: ${data.swept} swept, ${data.failed} failed`,
      );
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sweep failed');
    } finally {
      setSweeping(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted">Loading sweep data...</div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Swept', value: stats.totalSwept, color: 'text-success' },
    {
      label: 'Pending Sweep',
      value: stats.pendingSweep,
      color: 'text-warning',
    },
    { label: 'Failed Sweeps', value: stats.failedSweeps, color: 'text-error' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">
        Fund Sweeping
      </h1>

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

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-surface p-5"
          >
            <div className="text-sm text-muted">{card.label}</div>
            <div className={`mt-1 text-2xl font-semibold ${card.color}`}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {/* Sweep All */}
        <div>
          <button
            onClick={handleSweepAll}
            disabled={sweeping || stats.pendingSweep === 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sweeping ? 'Sweeping...' : 'Sweep All Confirmed'}
          </button>
        </div>

        {/* Sweep by Merchant */}
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Merchant
            </label>
            <select
              value={selectedMerchant}
              onChange={(e) => setSelectedMerchant(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Select merchant...</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSweepMerchant}
            disabled={sweeping || !selectedMerchant}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-alt transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sweep Merchant
          </button>
        </div>
      </div>

      {/* Sweep Jobs Table */}
      <div className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">
            Recent Sweep Jobs
          </h2>
        </div>

        {jobs.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted">
            No sweep jobs yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">From</th>
                  <th className="px-4 py-3 font-medium">To</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Merchant</th>
                  <th className="px-4 py-3 font-medium">Fee</th>
                  <th className="px-4 py-3 font-medium">Chain</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tx Hash</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-border last:border-0 hover:bg-surface-alt/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {truncateAddress(job.fromAddress)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {truncateAddress(job.toAddress)}
                    </td>
                    <td className="px-4 py-3 text-foreground">{job.amount}</td>
                    <td className="px-4 py-3 text-foreground">
                      {job.merchantAmount || job.amount}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {job.feeAmount ? (
                        <span title={job.feeTxHash ? `Fee TX: ${job.feeTxHash}` : 'Fee pending'}>
                          {job.feeAmount}
                          <span className="text-xs ml-1">({job.feePercent}%)</span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{job.chainName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {job.txHash ? truncateAddress(job.txHash) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(job.createdAt).toLocaleString()}
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
