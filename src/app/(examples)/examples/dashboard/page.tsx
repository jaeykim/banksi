'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChainIcon } from '@/components/chain-icon';
import { TokenIcon } from '@/components/token-icon';

interface RecentPayment {
  id: string; status: string; fiatAmount: number; amountExpected: string;
  chainId: string; chainName: string; tokenSymbol: string;
  productName: string | null; txHash: string | null; txExplorerUrl: string | null; createdAt: string;
}

interface DemoData {
  merchant: { name: string; slug: string };
  stats: { productsCount: number; paymentsCount: number; totalVolume: number };
  recent: RecentPayment[];
  byChain: { name: string; amount: number; count: number }[];
  byToken: { symbol: string; amount: number; count: number }[];
}

// Demo fallback data
const DEMO: DemoData = {
  merchant: { name: 'Seoul Coffee', slug: 'seoul-coffee' },
  stats: { productsCount: 8, paymentsCount: 192, totalVolume: 3047 },
  recent: [
    { id: 'd1', status: 'CONFIRMED', fiatAmount: 4.50, amountExpected: '4.50', chainId: 'ethereum', chainName: 'Ethereum', tokenSymbol: 'USDT', productName: 'Americano', txHash: '0x1a2b...3c4d', txExplorerUrl: 'https://etherscan.io/tx/0x1a2b3c4d', createdAt: new Date(Date.now() - 12 * 60000).toISOString() },
    { id: 'd2', status: 'SWEPT', fiatAmount: 6.00, amountExpected: '6.00', chainId: 'arbitrum', chainName: 'Arbitrum One', tokenSymbol: 'USDC', productName: 'Caramel Macchiato', txHash: '0x5e6f...7g8h', txExplorerUrl: 'https://arbiscan.io/tx/0x5e6f7g8h', createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
    { id: 'd3', status: 'CONFIRMED', fiatAmount: 0.10, amountExpected: '0.10', chainId: 'arbitrum', chainName: 'Arbitrum One', tokenSymbol: 'USDT', productName: 'API Access', txHash: '0x9a0b...1c2d', txExplorerUrl: null, createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: 'd4', status: 'PENDING', fiatAmount: 5.50, amountExpected: '5.50', chainId: 'bsc', chainName: 'BNB Smart Chain', tokenSymbol: 'USDT', productName: 'Cafe Latte', txHash: null, txExplorerUrl: null, createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
    { id: 'd5', status: 'EXPIRED', fiatAmount: 7.00, amountExpected: '7.00', chainId: 'ethereum', chainName: 'Ethereum', tokenSymbol: 'USDC', productName: 'Chocolate Cake', txHash: null, txExplorerUrl: null, createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  ],
  byChain: [
    { name: 'Ethereum', amount: 1240.50, count: 48 },
    { name: 'Arbitrum One', amount: 890.25, count: 62 },
    { name: 'BNB Smart Chain', amount: 420.00, count: 28 },
    { name: 'Tron', amount: 310.75, count: 35 },
    { name: 'Solana', amount: 185.50, count: 19 },
  ],
  byToken: [
    { symbol: 'USDT', amount: 1820.00, count: 112 },
    { symbol: 'USDC', amount: 1227.00, count: 80 },
  ],
};

const statusStyle: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMING: 'bg-indigo-100 text-indigo-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  SWEPT: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
  FAILED: 'bg-red-100 text-red-700',
};

const chainColors: Record<string, string> = {
  Ethereum: '#627EEA', 'BNB Smart Chain': '#F0B90B', 'Arbitrum One': '#28A0F0', Tron: '#FF0013', Solana: '#9945FF',
};
const tokenColors: Record<string, string> = { USDT: '#26A17B', USDC: '#2775CA' };

export default function DemoDashboardPage() {
  const [data, setData] = useState<DemoData>(DEMO);
  const [isReal, setIsReal] = useState(false);

  useEffect(() => {
    fetch('/api/demo/dashboard').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d && d.merchant) {
        setData({ ...d, recent: d.recent.length > 0 ? d.recent : DEMO.recent, byChain: d.byChain.length > 0 ? d.byChain : DEMO.byChain, byToken: d.byToken.length > 0 ? d.byToken : DEMO.byToken });
        if (d.recent.length > 0) setIsReal(true);
      }
    }).catch(() => {});
  }, []);

  function timeAgo(dateStr: string) {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  }

  const chainTotal = data.byChain.reduce((s, c) => s + c.amount, 0) || 1;
  const tokenTotal = data.byToken.reduce((s, t) => s + t.amount, 0) || 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-surface/80 backdrop-blur-lg">
        <div className="mx-auto max-w-5xl px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
              <span className="text-xs font-bold text-white">B</span>
            </div>
            <span className="text-sm font-bold text-foreground">Banksi</span>
            <span className="text-muted">/</span>
            <span className="text-sm font-medium text-muted">{data.merchant.name} — Dashboard Demo</span>
          </div>
          <Link href="/login" className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-light transition-colors">
            Create Your Own
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        {/* Demo banner */}
        {!isReal && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
            <svg className="h-4 w-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
            <p className="text-xs text-primary">This is a demo dashboard with sample data. Sign up to see your own payments.</p>
          </div>
        )}

        {/* Title */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{data.merchant.name}</h1>
          <p className="text-sm text-muted">/{data.merchant.slug}</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: 'Products', value: data.stats.productsCount },
            { label: 'Payments', value: data.stats.paymentsCount },
            { label: 'Total Volume', value: `$${data.stats.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-surface p-5">
              <div className="text-sm text-muted">{c.label}</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{c.value}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* By chain */}
          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">By Network</h2>
            <div className="space-y-3">
              {data.byChain.map((c) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: chainColors[c.name] || '#6b7280' }} />
                  <span className="text-xs font-medium text-foreground flex-1">{c.name}</span>
                  <div className="w-24 h-2 rounded-full bg-surface-alt overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(c.amount / chainTotal) * 100}%`, background: chainColors[c.name] || '#6b7280' }} />
                  </div>
                  <span className="text-xs text-muted w-16 text-right">${c.amount.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
          {/* By token */}
          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">By Token</h2>
            <div className="space-y-3">
              {data.byToken.map((t) => (
                <div key={t.symbol} className="flex items-center gap-3">
                  <TokenIcon symbol={t.symbol} size={14} />
                  <span className="text-xs font-medium text-foreground flex-1">{t.symbol}</span>
                  <div className="w-24 h-2 rounded-full bg-surface-alt overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(t.amount / tokenTotal) * 100}%`, background: tokenColors[t.symbol] || '#6b7280' }} />
                  </div>
                  <span className="text-xs text-muted w-16 text-right">${t.amount.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent payments */}
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Recent Payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">Payment</th>
                  <th className="px-4 py-2.5 font-medium">Chain</th>
                  <th className="px-4 py-2.5 font-medium">Token</th>
                  <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-alt/50 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium text-foreground">{p.productName || p.id.slice(0, 8)}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                        <ChainIcon chainId={p.chainId} size={14} />{p.chainName}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                        <TokenIcon symbol={p.tokenSymbol} size={14} />{p.tokenSymbol}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-foreground">${p.fiatAmount.toFixed(2)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle[p.status] || 'bg-gray-100 text-gray-500'}`}>
                        {p.status}
                        {p.txExplorerUrl && (
                          <a href={p.txExplorerUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-70">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                          </a>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted">{timeAgo(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-light p-6 text-center">
          <h3 className="text-lg font-bold text-white">Want this for your app?</h3>
          <p className="mt-1 text-sm text-white/70">Sign up and add crypto payments in minutes.</p>
          <Link href="/login" className="mt-4 inline-block rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-white/90 transition-colors">
            Get Started Free
          </Link>
        </div>
      </main>
    </div>
  );
}
