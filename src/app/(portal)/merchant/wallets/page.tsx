'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface Chain {
  id: string;
  name: string;
  isEvm: boolean;
}

interface Wallet {
  id: string;
  address: string;
  isActive: boolean;
  chain: {
    id: string;
    name: string;
    isEvm: boolean;
    isActive: boolean;
  };
}

export default function MerchantWalletsPage() {
  const { data: session } = useSession();
  const merchantId = (session?.user as { merchantId?: string })?.merchantId;

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [chains, setChains] = useState<Chain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedChainId, setSelectedChainId] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    if (!merchantId) return;
    try {
      const [walletsRes, chainsRes] = await Promise.all([
        fetch(`/api/merchants/${merchantId}/wallets`),
        fetch('/api/chains'),
      ]);
      if (!walletsRes.ok) throw new Error('Failed to fetch wallets');
      if (!chainsRes.ok) throw new Error('Failed to fetch chains');

      const walletsData = await walletsRes.json();
      const chainsData = await chainsRes.json();

      setWallets(walletsData.wallets);
      setChains(chainsData.chains);

      // Default to first chain if none selected
      if (!selectedChainId && chainsData.chains.length > 0) {
        setSelectedChainId(chainsData.chains[0].id);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load wallet data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (merchantId) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  async function handleSaveWallet(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/merchants/${merchantId}/wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainId: selectedChainId, address: walletAddress }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save wallet');
      }
      setWalletAddress('');
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save wallet');
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Withdrawal Wallets</h1>
      <p className="text-sm text-muted">
        Configure the wallet addresses where funds will be swept after payment confirmation.
        Set one address per chain.
      </p>

      {error && (
        <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      {/* Current wallets */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <h2 className="text-lg font-medium text-foreground">Configured Wallets</h2>

        {wallets.length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt text-left">
                  <th className="px-4 py-3 font-medium text-muted">Chain</th>
                  <th className="px-4 py-3 font-medium text-muted">Address</th>
                  <th className="px-4 py-3 font-medium text-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((w) => (
                  <tr
                    key={w.id}
                    className="border-b border-border hover:bg-surface-alt transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {w.chain.name}
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">
                      {w.address}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          w.isActive
                            ? 'bg-success/10 text-success'
                            : 'bg-error/10 text-error'
                        }`}
                      >
                        {w.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">
            No wallets configured yet. Add your first withdrawal wallet below.
          </p>
        )}
      </div>

      {/* Add / update wallet form */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <h2 className="text-lg font-medium text-foreground">
          Add or Update Wallet
        </h2>
        <p className="text-xs text-muted">
          If a wallet already exists for the selected chain, it will be updated with the new address.
        </p>
        <form onSubmit={handleSaveWallet} className="flex items-end gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted">Chain</label>
            <select
              value={selectedChainId}
              onChange={(e) => setSelectedChainId(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
            >
              {chains.length === 0 && <option value="">No chains available</option>}
              {chains.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1">
            <label className="block text-xs font-medium text-muted">
              Wallet Address
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              required
              placeholder="0x..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !selectedChainId}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Wallet'}
          </button>
        </form>
      </div>
    </div>
  );
}
