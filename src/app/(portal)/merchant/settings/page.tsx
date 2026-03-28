'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface MerchantInfo {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
}

export default function MerchantSettingsPage() {
  const { data: session } = useSession();
  const merchantId = (session?.user as { merchantId?: string })?.merchantId;

  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMerchant() {
      if (!merchantId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/merchants/${merchantId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setMerchant(data.merchant);
      } catch (err) {
        console.error('Error fetching merchant:', err);
      } finally {
        setLoading(false);
      }
    }

    if (session) fetchMerchant();
  }, [session, merchantId]);

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

  if (!merchant) {
    return <div className="text-error text-sm">Merchant not found.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>

      {/* Merchant info */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <h2 className="text-lg font-medium text-foreground">Merchant Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-muted">Name</div>
            <div className="mt-1 text-sm text-foreground">{merchant.name}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted">Slug</div>
            <div className="mt-1 text-sm text-foreground font-mono">
              /{merchant.slug}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted">Status</div>
            <div className="mt-1">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  merchant.isActive
                    ? 'bg-success/10 text-success'
                    : 'bg-error/10 text-error'
                }`}
              >
                {merchant.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted">Merchant ID</div>
            <div className="mt-1 text-sm text-muted font-mono text-xs">
              {merchant.id}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted">Created</div>
            <div className="mt-1 text-sm text-foreground">
              {new Date(merchant.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder for future settings */}
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <div className="mx-auto max-w-md space-y-3">
          <h2 className="text-lg font-medium text-foreground">
            Additional Settings
          </h2>
          <p className="text-sm text-muted">
            More configuration options such as webhook URLs, notification
            preferences, and API keys will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
