'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Payment {
  id: string;
  amount: number;
  status: string;
  chain: string;
  createdAt: string;
}

interface WithdrawalWallet {
  id: string;
  chain: string;
  address: string;
}

interface HdWalletConfig {
  id: string;
  nextDerivationIndex: number;
}

interface MerchantDetail {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  hdWalletConfig: HdWalletConfig | null;
  merchantWallets: WithdrawalWallet[];
  payments: Payment[];
  _count?: { payments: number };
}

export default function MerchantDetailPage() {
  const params = useParams();
  const merchantId = params.merchantId as string;

  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingMnemonic, setGeneratingMnemonic] = useState(false);

  // Withdrawal wallet form
  const [walletChain, setWalletChain] = useState('ethereum');
  const [walletAddress, setWalletAddress] = useState('');
  const [savingWallet, setSavingWallet] = useState(false);

  async function fetchMerchant() {
    try {
      const res = await fetch(`/api/admin/merchants/${merchantId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMerchant(data.merchant || data);
    } catch (err) {
      console.error('Error fetching merchant:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMerchant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  async function handleGenerateMnemonic() {
    setGeneratingMnemonic(true);
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
      await fetchMerchant();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to generate mnemonic');
    } finally {
      setGeneratingMnemonic(false);
    }
  }

  async function handleSaveWallet(e: React.FormEvent) {
    e.preventDefault();
    setSavingWallet(true);
    try {
      const res = await fetch(`/api/admin/merchants/${merchantId}/wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainId: walletChain, address: walletAddress }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save wallet');
      }
      setWalletAddress('');
      await fetchMerchant();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save wallet');
    } finally {
      setSavingWallet(false);
    }
  }

  if (loading) {
    return <div className="text-muted text-sm">Loading...</div>;
  }

  if (!merchant) {
    return <div className="text-error text-sm">Merchant not found.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {merchant.name}
          </h1>
          <p className="mt-1 text-sm text-muted">/{merchant.slug}</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/store/${merchant.slug}`}
            target="_blank"
            className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium text-foreground hover:bg-surface-alt transition-colors"
          >
            Open Store
          </a>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
              merchant.isActive
                ? 'bg-success/10 text-success'
                : 'bg-error/10 text-error'
            }`}
          >
            {merchant.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* HD Wallet section */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <h2 className="text-lg font-medium text-foreground">HD Wallet</h2>
        {merchant.hdWalletConfig ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Status:</span>
              <span className="text-sm font-medium text-success">
                Provisioned
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">
                Next Derivation Index:
              </span>
              <span className="text-sm font-medium text-foreground">
                {merchant.hdWalletConfig.nextDerivationIndex}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              No HD wallet mnemonic has been generated for this merchant.
            </p>
            <button
              onClick={handleGenerateMnemonic}
              disabled={generatingMnemonic}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors disabled:opacity-50"
            >
              {generatingMnemonic ? 'Generating...' : 'Generate Mnemonic'}
            </button>
          </div>
        )}
      </div>

      {/* Withdrawal Wallets section */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <h2 className="text-lg font-medium text-foreground">
          Withdrawal Wallets
        </h2>

        {(merchant.merchantWallets || []).length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt text-left">
                  <th className="px-4 py-3 font-medium text-muted">Chain</th>
                  <th className="px-4 py-3 font-medium text-muted">Address</th>
                </tr>
              </thead>
              <tbody>
                {(merchant.merchantWallets || []).map((w) => (
                  <tr
                    key={w.id}
                    className="border-b border-border hover:bg-surface-alt transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {w.chain}
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">
                      {w.address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">
            No withdrawal wallets configured.
          </p>
        )}

        {/* Add wallet form */}
        <form onSubmit={handleSaveWallet} className="flex items-end gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted">
              Chain
            </label>
            <select
              value={walletChain}
              onChange={(e) => setWalletChain(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
            >
              <option value="ethereum">Ethereum</option>
              <option value="polygon">Polygon</option>
              <option value="bsc">BSC</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="tron">Tron</option>
              <option value="solana">Solana</option>
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
            disabled={savingWallet}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {savingWallet ? 'Saving...' : 'Add Wallet'}
          </button>
        </form>
      </div>

      {/* Recent Payments section */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <h2 className="text-lg font-medium text-foreground">
          Recent Payments
        </h2>

        {(merchant.payments || []).length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt text-left">
                  <th className="px-4 py-3 font-medium text-muted">ID</th>
                  <th className="px-4 py-3 font-medium text-muted">Amount</th>
                  <th className="px-4 py-3 font-medium text-muted">Chain</th>
                  <th className="px-4 py-3 font-medium text-muted">Status</th>
                  <th className="px-4 py-3 font-medium text-muted">Date</th>
                </tr>
              </thead>
              <tbody>
                {(merchant.payments || []).map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border hover:bg-surface-alt transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {p.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      ${(p.amount / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-muted">{p.chain}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === 'SWEPT'
                            ? 'bg-success/10 text-success'
                            : p.status === 'CONFIRMED'
                              ? 'bg-primary-light/10 text-primary-light'
                              : p.status === 'EXPIRED'
                                ? 'bg-error/10 text-error'
                                : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">No payments yet.</p>
        )}
      </div>
    </div>
  );
}
