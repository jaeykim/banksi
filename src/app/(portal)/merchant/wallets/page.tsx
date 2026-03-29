'use client';

import { useSession } from '@/components/providers';
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

type ProtocolGroup = {
  protocol: string;
  label: string;
  description: string;
  placeholder: string;
  chains: Chain[];
};

function groupChainsByProtocol(chains: Chain[]): ProtocolGroup[] {
  const evmChains = chains.filter((c) => c.isEvm);
  const tronChains = chains.filter((c) => c.name.toLowerCase().includes('tron'));
  const solanaChains = chains.filter((c) => c.name.toLowerCase().includes('solana'));
  // Catch any other non-EVM chains not matching tron/solana
  const otherChains = chains.filter(
    (c) =>
      !c.isEvm &&
      !c.name.toLowerCase().includes('tron') &&
      !c.name.toLowerCase().includes('solana')
  );

  const groups: ProtocolGroup[] = [];

  if (evmChains.length > 0) {
    groups.push({
      protocol: 'evm',
      label: 'EVM (Ethereum, Polygon, BSC, Arbitrum...)',
      description:
        'One address works across all EVM chains. Setting this will apply to: ' +
        evmChains.map((c) => c.name).join(', '),
      placeholder: '0x...',
      chains: evmChains,
    });
  }

  if (tronChains.length > 0) {
    groups.push({
      protocol: 'tron',
      label: 'Tron',
      description: 'Tron network address (Base58 format)',
      placeholder: 'T...',
      chains: tronChains,
    });
  }

  if (solanaChains.length > 0) {
    groups.push({
      protocol: 'solana',
      label: 'Solana',
      description: 'Solana network address (Base58 format)',
      placeholder: 'So...',
      chains: solanaChains,
    });
  }

  for (const c of otherChains) {
    groups.push({
      protocol: c.id,
      label: c.name,
      description: `${c.name} network address`,
      placeholder: 'Address...',
      chains: [c],
    });
  }

  return groups;
}

export default function MerchantWalletsPage() {
  const { data: session } = useSession();
  const merchantId = session?.user?.merchantId;

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [chains, setChains] = useState<Chain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Protocol-grouped form state: protocol -> address
  const [formAddresses, setFormAddresses] = useState<Record<string, string>>({});
  const [savingProtocol, setSavingProtocol] = useState<string | null>(null);

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

  // Get the currently configured address for a protocol group
  function getConfiguredAddress(group: ProtocolGroup): string | null {
    const chainIds = group.chains.map((c) => c.id);
    const matching = wallets.filter((w) => chainIds.includes(w.chain.id) && w.isActive);
    if (matching.length === 0) return null;
    return matching[0].address;
  }

  async function handleSaveProtocol(group: ProtocolGroup) {
    const address = formAddresses[group.protocol]?.trim();
    if (!address) return;

    setSavingProtocol(group.protocol);
    setError(null);
    try {
      if (group.chains.length === 1) {
        // Single chain - use the original endpoint
        const res = await fetch(`/api/merchants/${merchantId}/wallets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chainId: group.chains[0].id, address }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to save wallet');
        }
      } else {
        // Multiple chains (EVM group) - use batch endpoint
        const res = await fetch(`/api/merchants/${merchantId}/wallets/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainIds: group.chains.map((c) => c.id),
            address,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to save wallets');
        }
      }
      setFormAddresses((prev) => ({ ...prev, [group.protocol]: '' }));
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save wallet');
    } finally {
      setSavingProtocol(null);
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

  const protocolGroups = groupChainsByProtocol(chains);

  // Group configured wallets by protocol for display
  function getWalletsByProtocol(): { protocol: string; label: string; address: string; chainNames: string[] }[] {
    const result: { protocol: string; label: string; address: string; chainNames: string[] }[] = [];

    for (const group of protocolGroups) {
      const chainIds = group.chains.map((c) => c.id);
      const matching = wallets.filter((w) => chainIds.includes(w.chain.id) && w.isActive);
      if (matching.length === 0) continue;

      // Group by unique address
      const addressMap = new Map<string, string[]>();
      for (const w of matching) {
        const names = addressMap.get(w.address) || [];
        names.push(w.chain.name);
        addressMap.set(w.address, names);
      }

      for (const [address] of addressMap) {
        // For multi-chain protocol groups (EVM), always show all chains in the group
        // since the same address is valid across all of them
        const displayNames =
          group.chains.length > 1
            ? group.chains.map((c) => c.name)
            : [matching[0].chain.name];

        result.push({
          protocol: group.protocol,
          label: group.label,
          address,
          chainNames: displayNames,
        });
      }
    }

    return result;
  }

  const configuredWallets = getWalletsByProtocol();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Withdrawal Wallets</h1>
      <p className="text-sm text-muted">
        Configure wallet addresses by protocol. EVM-compatible chains (Ethereum, Polygon, BSC, Arbitrum) share the same address format, so you only need to enter it once.
      </p>

      {error && (
        <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      {/* Configured wallets */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <h2 className="text-lg font-medium text-foreground">Configured Wallets</h2>

        {configuredWallets.length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt text-left">
                  <th className="px-4 py-3 font-medium text-muted">Protocol</th>
                  <th className="px-4 py-3 font-medium text-muted">Chains</th>
                  <th className="px-4 py-3 font-medium text-muted">Address</th>
                </tr>
              </thead>
              <tbody>
                {configuredWallets.map((w, i) => (
                  <tr
                    key={i}
                    className="border-b border-border hover:bg-surface-alt transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {w.protocol === 'evm' ? 'EVM' : w.label}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      <div className="flex flex-wrap gap-1">
                        {w.chainNames.map((name) => (
                          <span
                            key={name}
                            className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
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
            No wallets configured yet. Add your withdrawal wallets below.
          </p>
        )}
      </div>

      {/* Protocol-grouped wallet forms */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">
          Set Wallet by Protocol
        </h2>

        {protocolGroups.map((group) => {
          const currentAddress = getConfiguredAddress(group);
          return (
            <div
              key={group.protocol}
              className="rounded-lg border border-border bg-surface p-4 space-y-3"
            >
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {group.label}
                </h3>
                <p className="text-xs text-muted mt-0.5">{group.description}</p>
                {currentAddress && (
                  <p className="text-xs text-muted mt-1">
                    Current:{' '}
                    <span className="font-mono text-foreground">{currentAddress}</span>
                  </p>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveProtocol(group);
                }}
                className="flex items-end gap-3"
              >
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={formAddresses[group.protocol] || ''}
                    onChange={(e) =>
                      setFormAddresses((prev) => ({
                        ...prev,
                        [group.protocol]: e.target.value,
                      }))
                    }
                    required
                    placeholder={group.placeholder}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingProtocol === group.protocol}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors disabled:opacity-50"
                >
                  {savingProtocol === group.protocol
                    ? 'Saving...'
                    : currentAddress
                      ? 'Update'
                      : 'Save'}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
