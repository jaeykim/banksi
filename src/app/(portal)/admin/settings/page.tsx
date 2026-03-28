'use client';

import { useEffect, useState, useCallback } from 'react';

interface Settings {
  sweep_fee_percent: string;
  sweep_fee_address: string;
  auto_sweep_enabled: string;
  auto_sweep_interval_minutes: string;
  payment_expiry_minutes: string;
  required_confirmations: string;
}

const LABELS: Record<keyof Settings, { label: string; description: string }> = {
  sweep_fee_percent: {
    label: 'Sweep Fee (%)',
    description: 'Platform fee deducted from each sweep. e.g. 1.5 means 1.5%',
  },
  sweep_fee_address: {
    label: 'Fee Collection Address',
    description: 'Wallet address where platform fees are sent (EVM 0x... format)',
  },
  auto_sweep_enabled: {
    label: 'Auto Sweep',
    description: 'Automatically sweep confirmed payments on a schedule',
  },
  auto_sweep_interval_minutes: {
    label: 'Auto Sweep Interval (min)',
    description: 'How often to run auto sweep, in minutes',
  },
  payment_expiry_minutes: {
    label: 'Payment Expiry (min)',
    description: 'How long a payment stays active before expiring',
  },
  required_confirmations: {
    label: 'Required Confirmations',
    description: 'Blockchain confirmations needed before marking payment as confirmed',
  },
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      setSettings(data.settings);
      setDraft(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  function handleChange(key: keyof Settings, value: string) {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
    setSuccess(null);
  }

  function hasChanges(): boolean {
    if (!settings || !draft) return false;
    return Object.keys(settings).some(
      (k) => settings[k as keyof Settings] !== draft[k as keyof Settings]
    );
  }

  async function handleSave() {
    if (!draft || !settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Only send changed values
    const changed: Partial<Settings> = {};
    for (const k of Object.keys(draft) as (keyof Settings)[]) {
      if (draft[k] !== settings[k]) {
        changed[k] = draft[k];
      }
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: changed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save');
      }
      setSuccess('Settings saved successfully.');
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-muted text-sm">Loading settings...</div>;
  }

  if (!draft) {
    return (
      <div className="rounded-lg border border-error/20 bg-error/5 p-5">
        <p className="text-sm text-error">Failed to load settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">System Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      {/* Fee Settings */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-5">
        <h2 className="text-lg font-medium text-foreground">Sweep & Fee</h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Sweep Fee Percent */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {LABELS.sweep_fee_percent.label}
            </label>
            <p className="text-xs text-muted">{LABELS.sweep_fee_percent.description}</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={draft.sweep_fee_percent}
                onChange={(e) => handleChange('sweep_fee_percent', e.target.value)}
                className="w-32 border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
              <span className="text-sm text-muted">%</span>
            </div>
          </div>

          {/* Fee Address */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {LABELS.sweep_fee_address.label}
            </label>
            <p className="text-xs text-muted">{LABELS.sweep_fee_address.description}</p>
            <input
              type="text"
              value={draft.sweep_fee_address}
              onChange={(e) => handleChange('sweep_fee_address', e.target.value)}
              placeholder="0x..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Auto Sweep */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {LABELS.auto_sweep_enabled.label}
            </label>
            <p className="text-xs text-muted">{LABELS.auto_sweep_enabled.description}</p>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.auto_sweep_enabled === 'true'}
                onChange={(e) =>
                  handleChange('auto_sweep_enabled', e.target.checked ? 'true' : 'false')
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary-light"
              />
              <span className="text-sm text-foreground">
                {draft.auto_sweep_enabled === 'true' ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>

          {/* Auto Sweep Interval */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {LABELS.auto_sweep_interval_minutes.label}
            </label>
            <p className="text-xs text-muted">{LABELS.auto_sweep_interval_minutes.description}</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={draft.auto_sweep_interval_minutes}
                onChange={(e) => handleChange('auto_sweep_interval_minutes', e.target.value)}
                className="w-32 border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
              <span className="text-sm text-muted">min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Settings */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-5">
        <h2 className="text-lg font-medium text-foreground">Payment</h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Payment Expiry */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {LABELS.payment_expiry_minutes.label}
            </label>
            <p className="text-xs text-muted">{LABELS.payment_expiry_minutes.description}</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={draft.payment_expiry_minutes}
                onChange={(e) => handleChange('payment_expiry_minutes', e.target.value)}
                className="w-32 border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
              <span className="text-sm text-muted">min</span>
            </div>
          </div>

          {/* Required Confirmations */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {LABELS.required_confirmations.label}
            </label>
            <p className="text-xs text-muted">{LABELS.required_confirmations.description}</p>
            <input
              type="number"
              min="1"
              value={draft.required_confirmations}
              onChange={(e) => handleChange('required_confirmations', e.target.value)}
              className="w-32 border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
