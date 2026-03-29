'use client';

import { useSession } from '@/components/providers';
import { useEffect, useState } from 'react';

interface MerchantInfo {
  id: string;
  name: string;
  slug: string;
  apiKey: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function MerchantSettingsPage() {
  const { data: session } = useSession();
  const merchantId = session?.user?.merchantId;

  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchMerchant() {
      if (!merchantId) { setLoading(false); return; }
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

  async function handleRegenerate() {
    if (!merchantId || !confirm('Regenerate API key? The old key will stop working immediately.')) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/merchants/${merchantId}/api-key`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setNewKey(data.apiKey);
    } catch {
      alert('Failed to regenerate API key.');
    } finally {
      setRegenerating(false);
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!merchantId) {
    return (
      <div className="rounded-lg border border-error/20 bg-error/5 p-5">
        <p className="text-sm text-error">No merchant assigned to your account.</p>
      </div>
    );
  }

  if (loading) return <div className="text-muted text-sm">Loading...</div>;
  if (!merchant) return <div className="text-error text-sm">Merchant not found.</div>;

  const maskedKey = merchant.apiKey
    ? `bks_${'*'.repeat(40)}${merchant.apiKey.slice(-8)}`
    : 'Not generated';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>

      {/* Merchant info */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <h2 className="text-lg font-medium text-foreground">Project</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-muted">Name</div>
            <div className="mt-1 text-sm text-foreground">{merchant.name}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted">Slug</div>
            <div className="mt-1 text-sm text-foreground font-mono">{merchant.slug}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted">Status</div>
            <div className="mt-1">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${merchant.isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                {merchant.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted">Created</div>
            <div className="mt-1 text-sm text-foreground">{new Date(merchant.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* API Key */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">API Key</h2>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-alt transition-colors disabled:opacity-50"
          >
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>

        {newKey ? (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
            <p className="text-sm font-medium text-warning">New API key — save it now!</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-foreground/[0.05] border border-border px-3 py-2 font-mono text-xs text-foreground break-all select-all">{newKey}</code>
              <button onClick={() => handleCopy(newKey)} className="flex-shrink-0 rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-surface hover:bg-foreground/80 transition-colors">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-surface-alt px-3 py-2.5 font-mono text-xs text-muted">{maskedKey}</code>
            {merchant.apiKey && (
              <button onClick={() => handleCopy(merchant.apiKey!)} className="flex-shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-alt transition-colors">
                Copy
              </button>
            )}
          </div>
        )}

        <p className="text-xs text-muted">
          Use this key in your SDK: <code className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-xs">BANKSI_API_KEY=bks_xxx</code>
        </p>
      </div>

      {/* Quick start */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <h2 className="text-lg font-medium text-foreground">Quick Start</h2>
        <div className="rounded-lg bg-[#0f172a] p-4 overflow-x-auto">
          <pre className="text-xs font-mono text-white leading-relaxed"><code>{`npm install banksi

# .env
BANKSI_API_KEY=${newKey || merchant.apiKey || 'bks_your_key_here'}

# route.ts
import { createBanksiPaywall } from 'banksi/next';
const paywall = createBanksiPaywall({ amount: 0.10 });`}</code></pre>
        </div>
      </div>
    </div>
  );
}
