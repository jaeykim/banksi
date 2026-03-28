'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Merchant {
  id: string;
  name: string;
  isActive: boolean;
  hdWalletConfig?: { id: string } | null;
  users?: { id: string }[];
  payments?: { amount: number; status: string }[];
}

interface Stats {
  totalMerchants: number;
  activeMerchants: number;
  totalPayments: number;
  totalSwept: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalMerchants: 0,
    activeMerchants: 0,
    totalPayments: 0,
    totalSwept: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/merchants');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
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
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-muted text-sm">Loading...</div>;
  }

  const cards = [
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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
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

      {/* Quick links */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">Quick Links</h2>
        <div className="flex gap-3">
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
        </div>
      </div>
    </div>
  );
}
