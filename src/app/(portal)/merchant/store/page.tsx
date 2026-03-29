'use client';

import { useSession } from '@/components/providers';
import { useEffect, useState } from 'react';

interface StoreSettings {
  storeDescription: string | null;
  storeLogo: string | null;
  storeBannerColor: string | null;
  storeIsPublic: boolean;
  slug: string;
}

export default function MerchantStorePage() {
  const { data: session } = useSession();
  const merchantId = session?.user?.merchantId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [description, setDescription] = useState('');
  const [bannerColor, setBannerColor] = useState('#3730a3');
  const [isPublic, setIsPublic] = useState(true);
  const [slug, setSlug] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      if (!merchantId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/merchants/${merchantId}/store-settings`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const s = data.storeSettings;
        setDescription(s.storeDescription || '');
        setBannerColor(s.storeBannerColor || '#3730a3');
        setIsPublic(s.storeIsPublic);
        setSlug(s.slug);
      } catch (err) {
        console.error('Error fetching store settings:', err);
        setError('Failed to load store settings.');
      } finally {
        setLoading(false);
      }
    }

    if (session) fetchSettings();
  }, [session, merchantId]);

  async function handleSave() {
    if (!merchantId) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/merchants/${merchantId}/store-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeDescription: description,
          storeBannerColor: bannerColor,
          storeIsPublic: isPublic,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');
      setSuccess('Store settings saved.');
    } catch {
      setError('Failed to save store settings.');
    } finally {
      setSaving(false);
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/store/${slug}`;
    navigator.clipboard.writeText(url);
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

  if (loading) {
    return <div className="text-muted text-sm">Loading...</div>;
  }

  const storeUrl = `/store/${slug}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Store Settings</h1>

      {error && (
        <div className="rounded-lg border border-error/20 bg-error/5 p-3">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-success/20 bg-success/5 p-3">
          <p className="text-sm text-success">{success}</p>
        </div>
      )}

      {/* Store Link */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-3">
        <h2 className="text-lg font-medium text-foreground">Store Link</h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-surface-alt px-3 py-2.5 text-xs font-mono text-foreground truncate">
            {typeof window !== 'undefined' ? `${window.location.origin}${storeUrl}` : storeUrl}
          </code>
          <button onClick={handleCopyLink}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-alt transition-colors flex-shrink-0">
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <a href={storeUrl} target="_blank" rel="noopener noreferrer"
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary-light transition-colors flex-shrink-0 inline-flex items-center gap-1">
            Open Store
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
          </a>
        </div>
      </div>

      {/* Settings Form */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-5">
        <h2 className="text-lg font-medium text-foreground">Configuration</h2>

        <div className="space-y-4">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Store Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Tell customers about your store..."
            />
          </div>

          {/* Banner Color */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Banner Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={bannerColor}
                onChange={(e) => setBannerColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded border border-border"
              />
              <span className="text-sm text-muted font-mono">{bannerColor}</span>
            </div>
          </div>

          {/* Public Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="storePublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50"
            />
            <label htmlFor="storePublic" className="text-sm font-medium text-foreground">
              Store is public
            </label>
            <span className="text-xs text-muted">
              (Uncheck to hide your store from the public)
            </span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-3">
        <h2 className="text-lg font-medium text-foreground">Preview</h2>
        <div className="rounded-lg overflow-hidden border border-border">
          {/* Banner */}
          <div
            className="px-6 py-8"
            style={{ backgroundColor: bannerColor }}
          >
            <h3 className="text-xl font-bold text-white">
              {(session?.user as { name?: string })?.name || 'Your Store'}
            </h3>
            {description && (
              <p className="mt-2 text-sm text-white/80">{description}</p>
            )}
          </div>
          {/* Body preview */}
          <div className="bg-surface-alt p-6">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-surface p-4 space-y-2"
                >
                  <div className="h-4 w-3/4 rounded bg-border" />
                  <div className="h-3 w-1/2 rounded bg-border" />
                  <div className="h-3 w-1/4 rounded bg-border" />
                  <div
                    className="mt-2 h-8 w-full rounded text-xs font-medium text-white flex items-center justify-center"
                    style={{ backgroundColor: bannerColor }}
                  >
                    Pay
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center text-xs text-muted">
              Powered by Banksi
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
