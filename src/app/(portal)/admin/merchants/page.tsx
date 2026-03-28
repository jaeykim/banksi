'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Merchant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  hdWalletConfig?: { id: string } | null;
  users?: { id: string }[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchMerchants() {
    try {
      const res = await fetch('/api/admin/merchants');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMerchants(data.merchants || []);
    } catch (err) {
      console.error('Error fetching merchants:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMerchants();
  }, []);

  function handleNameChange(name: string) {
    setFormName(name);
    setFormSlug(slugify(name));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          slug: formSlug,
          ...(formEmail && formPassword
            ? { user: { name: formName, email: formEmail, password: formPassword } }
            : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create merchant');
      }
      setFormName('');
      setFormSlug('');
      setFormEmail('');
      setFormPassword('');
      setShowForm(false);
      await fetchMerchants();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create merchant');
    } finally {
      setCreating(false);
    }
  }

  async function handleGenerateMnemonic(merchantId: string) {
    setGeneratingId(merchantId);
    try {
      const res = await fetch('/api/admin/mnemonics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to generate mnemonic');
      }
      await fetchMerchants();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to generate mnemonic');
    } finally {
      setGeneratingId(null);
    }
  }

  if (loading) {
    return <div className="text-muted text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Merchants</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors"
        >
          {showForm ? 'Cancel' : 'Create Merchant'}
        </button>
      </div>

      {/* Create merchant form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-border bg-surface p-5 space-y-4"
        >
          <h2 className="text-lg font-medium text-foreground">New Merchant</h2>
          {error && (
            <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
              placeholder="Merchant name"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Slug
            </label>
            <input
              type="text"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              required
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-muted bg-surface-alt focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </div>
          <div className="border-t border-border pt-4 mt-2">
            <h3 className="text-sm font-medium text-foreground mb-3">Merchant Login Account</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
                  placeholder="merchant@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
                  placeholder="Min 8 characters"
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      {/* Merchants table */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left">
              <th className="px-4 py-3 font-medium text-muted">Name</th>
              <th className="px-4 py-3 font-medium text-muted">Slug</th>
              <th className="px-4 py-3 font-medium text-muted">Status</th>
              <th className="px-4 py-3 font-medium text-muted">HD Wallet</th>
              <th className="px-4 py-3 font-medium text-muted">Users</th>
              <th className="px-4 py-3 font-medium text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {merchants.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No merchants yet.
                </td>
              </tr>
            )}
            {merchants.map((m) => (
              <tr
                key={m.id}
                className="border-b border-border hover:bg-surface-alt transition-colors"
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {m.name}
                </td>
                <td className="px-4 py-3 text-muted">{m.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.isActive
                        ? 'bg-success/10 text-success'
                        : 'bg-error/10 text-error'
                    }`}
                  >
                    {m.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {m.hdWalletConfig ? (
                    <span className="text-xs text-success">Provisioned</span>
                  ) : (
                    <span className="text-xs text-muted">None</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">
                  {m.users?.length ?? 0}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/merchants/${m.id}`}
                      className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-alt transition-colors"
                    >
                      View
                    </Link>
                    <Link
                      href={`/store/${m.slug}`}
                      target="_blank"
                      className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-alt transition-colors"
                    >
                      Store
                    </Link>
                    {!m.hdWalletConfig && (
                      <button
                        onClick={() => handleGenerateMnemonic(m.id)}
                        disabled={generatingId === m.id}
                        className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-light transition-colors disabled:opacity-50"
                      >
                        {generatingId === m.id
                          ? 'Generating...'
                          : 'Generate Mnemonic'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
