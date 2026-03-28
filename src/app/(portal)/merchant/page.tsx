'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface MerchantData {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  stats: {
    productsCount: number;
    paymentsCount: number;
    totalVolume: number;
  };
}

export default function MerchantDashboard() {
  const { data: session } = useSession();
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMerchant() {
      const merchantId = (session?.user as { merchantId?: string })?.merchantId;
      if (!merchantId) {
        setError('No merchant assigned to your account.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/merchants/${merchantId}`);
        if (!res.ok) throw new Error('Failed to fetch merchant data');
        const data = await res.json();
        setMerchant(data.merchant);
      } catch (err) {
        console.error('Error fetching merchant:', err);
        setError('Failed to load merchant data.');
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchMerchant();
    }
  }, [session]);

  if (loading) {
    return <div className="text-muted text-sm">Loading...</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-error/20 bg-error/5 p-5">
        <p className="text-sm text-error">{error}</p>
      </div>
    );
  }

  if (!merchant) return null;

  const statCards = [
    { label: 'Products', value: merchant.stats.productsCount },
    { label: 'Payments', value: merchant.stats.paymentsCount },
    {
      label: 'Total Volume',
      value: `$${merchant.stats.totalVolume.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    },
  ];

  const quickActions = [
    {
      label: 'Manage Products',
      description: 'Add, edit, or deactivate your products',
      href: '/merchant/products',
      primary: true,
    },
    {
      label: 'View Payments',
      description: 'See your payment history and status',
      href: '/merchant/payments',
      primary: false,
    },
    {
      label: 'Configure Wallets',
      description: 'Set up withdrawal wallet addresses per chain',
      href: '/merchant/wallets',
      primary: false,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{merchant.name}</h1>
        <p className="mt-1 text-sm text-muted">/{merchant.slug}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`rounded-lg border p-5 transition-colors ${
                action.primary
                  ? 'border-primary/20 bg-primary/5 hover:bg-primary/10'
                  : 'border-border bg-surface hover:bg-surface-alt'
              }`}
            >
              <div
                className={`text-sm font-medium ${
                  action.primary ? 'text-primary' : 'text-foreground'
                }`}
              >
                {action.label}
              </div>
              <div className="mt-1 text-xs text-muted">{action.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
