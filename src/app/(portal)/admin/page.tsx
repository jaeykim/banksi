'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChainIcon } from '@/components/chain-icon';

interface Merchant {
  id: string;
  name: string;
  isActive: boolean;
  payments?: { amount: number; status: string }[];
}

interface Stats {
  totalMerchants: number;
  activeMerchants: number;
  totalPayments: number;
  totalSwept: number;
}

interface FunderBalance {
  chainId: string;
  chainName: string;
  nativeSymbol: string;
  balanceFormatted: string;
  minRecommended: number;
  status: 'ok' | 'low' | 'empty' | 'error';
  error?: string;
}

interface FunderData {
  configured: boolean;
  funderAddress?: string;
  alert?: boolean;
  message?: string;
  balances: FunderBalance[];
}

interface DaemonStatus {
  monitorRunning: boolean;
  autoSweepEnabled: boolean;
  sweepIntervalMinutes: number;
  pendingPayments: number;
  confirmedAwaitingSweep: number;
  lastPaymentUpdate: string | null;
  lastSweepJob: { status: string; createdAt: string } | null;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ok: { bg: 'bg-success/10', text: 'text-success', label: 'OK' },
  low: { bg: 'bg-warning/10', text: 'text-warning', label: 'Low' },
  empty: { bg: 'bg-error/10', text: 'text-error', label: 'Empty' },
  error: { bg: 'bg-surface-alt', text: 'text-muted', label: 'Error' },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalMerchants: 0,
    activeMerchants: 0,
    totalPayments: 0,
    totalSwept: 0,
  });
  const [funder, setFunder] = useState<FunderData | null>(null);
  const [daemon, setDaemon] = useState<DaemonStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [merchantRes, funderRes, daemonRes] = await Promise.all([
          fetch('/api/admin/merchants'),
          fetch('/api/admin/funder'),
          fetch('/api/admin/daemon'),
        ]);

        if (merchantRes.ok) {
          const data = await merchantRes.json();
          const merchants: Merchant[] = data.merchants || [];
          const totalMerchants = merchants.length;
          const activeMerchants = merchants.filter((m) => m.isActive).length;
          let totalPayments = 0;
          let totalSwept = 0;
          for (const m of merchants) {
            if (m.payments) {
              totalPayments += m.payments.length;
              totalSwept += m.payments
                .filter((p) => p.status === 'SWEPT')
                .reduce((sum, p) => sum + p.amount, 0);
            }
          }
          setStats({ totalMerchants, activeMerchants, totalPayments, totalSwept });
        }

        if (funderRes.ok) {
          setFunder(await funderRes.json());
        }

        if (daemonRes.ok) {
          setDaemon(await daemonRes.json());
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-muted text-sm">Loading...</div>;
  }

  const statCards = [
    { label: 'Total Merchants', value: stats.totalMerchants },
    { label: 'Active Merchants', value: stats.activeMerchants },
    { label: 'Total Payments', value: stats.totalPayments },
    {
      label: 'Total Swept',
      value: `$${(stats.totalSwept / 100).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    },
  ];

  const hasAlert = funder?.alert || funder?.balances.some((b) => b.status !== 'ok');

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-surface p-5"
          >
            <div className="text-sm text-muted">{card.label}</div>
            <div className="mt-1 text-2xl font-semibold text-foreground">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Daemon Status */}
      {daemon && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">Background Daemon</h2>
          <div className="rounded-lg border border-border bg-surface p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs text-muted">Payment Monitor</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  <span className="text-sm font-medium text-success">Running (15s)</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Auto Sweep</div>
                <div className="mt-1 flex items-center gap-1.5">
                  {daemon.autoSweepEnabled ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                      </span>
                      <span className="text-sm font-medium text-success">
                        Every {daemon.sweepIntervalMinutes}m
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex h-2 w-2 rounded-full bg-muted/40" />
                      <span className="text-sm font-medium text-muted">Disabled</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Pending Payments</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {daemon.pendingPayments}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Awaiting Sweep</div>
                <div className={`mt-1 text-sm font-semibold ${daemon.confirmedAwaitingSweep > 0 ? 'text-warning' : 'text-foreground'}`}>
                  {daemon.confirmedAwaitingSweep}
                </div>
              </div>
            </div>
            {daemon.lastSweepJob && (
              <div className="mt-3 pt-3 border-t border-border text-xs text-muted">
                Last sweep: {daemon.lastSweepJob.status} at{' '}
                {new Date(daemon.lastSweepJob.createdAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gas Funder Wallet */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">
            Gas Funder Wallet
            {hasAlert && (
              <span className="ml-2 inline-flex items-center rounded-full bg-warning/10 border border-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
                Needs Attention
              </span>
            )}
          </h2>
        </div>

        {!funder || !funder.configured ? (
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-5">
            <p className="text-sm font-medium text-warning">Gas Funder Not Configured</p>
            <p className="mt-1 text-xs text-muted">
              Set the <code className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-xs">GAS_FUNDER_PRIVATE_KEY</code> environment variable to enable automated sweep gas funding.
            </p>
          </div>
        ) : (
          <>
            {funder.funderAddress && (
              <p className="text-xs text-muted">
                EVM Address:{' '}
                <span className="font-mono text-foreground">{funder.funderAddress}</span>
              </p>
            )}

            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-alt text-left">
                    <th className="px-4 py-3 font-medium text-muted">Chain</th>
                    <th className="px-4 py-3 font-medium text-muted">Balance</th>
                    <th className="px-4 py-3 font-medium text-muted">Min Recommended</th>
                    <th className="px-4 py-3 font-medium text-muted">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {funder.balances.map((b) => {
                    const style = STATUS_STYLES[b.status] || STATUS_STYLES.error;
                    return (
                      <tr
                        key={b.chainId}
                        className="border-b border-border last:border-0 hover:bg-surface-alt/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 font-medium text-foreground">
                            <ChainIcon chainId={b.chainId} size={18} />
                            {b.chainName}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-foreground">
                          {b.status === 'error' ? (
                            <span className="text-xs text-muted">{b.error || 'N/A'}</span>
                          ) : (
                            <>
                              {b.balanceFormatted} <span className="text-muted">{b.nativeSymbol}</span>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {b.minRecommended} {b.nativeSymbol}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
                          >
                            {style.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasAlert && (
              <div className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-3">
                <p className="text-sm text-warning font-medium">
                  Some chains have low or empty funder balances. Sweep operations may fail on those chains.
                </p>
                <p className="mt-1 text-xs text-muted">
                  Transfer native tokens to the funder address above to ensure smooth sweep operations.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick links */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">Quick Links</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/merchants"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors"
          >
            Manage Merchants
          </Link>
          <Link
            href="/admin/payments"
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-alt transition-colors"
          >
            View Payments
          </Link>
          <Link
            href="/admin/sweep"
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-alt transition-colors"
          >
            Sweep Funds
          </Link>
          <Link
            href="/admin/settings"
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-alt transition-colors"
          >
            System Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
