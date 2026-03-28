'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { usePortalI18n } from '@/i18n/use-portal-i18n';
import { ChainIcon } from '@/components/chain-icon';
import { TokenIcon } from '@/components/token-icon';

interface MerchantData {
  id: string;
  name: string;
  slug: string;
  stats: { productsCount: number; paymentsCount: number; totalVolume: number };
}

interface RecentPayment {
  id: string;
  status: string;
  fiatAmount: number;
  amountExpected: string;
  chainId: string;
  chainName: string;
  tokenSymbol: string;
  productName: string | null;
  txHash: string | null;
  txExplorerUrl: string | null;
  createdAt: string;
}

interface Stats {
  dailyVolume: { date: string; amount: number }[];
  hourlyVolume: { hour: number; amount: number }[];
  byChain: { name: string; amount: number; count: number }[];
  byToken: { symbol: string; amount: number; count: number }[];
  recent: RecentPayment[];
}

// ─── Area chart (SVG) ──────────────────────────────

function AreaChart({ data }: { data: { date: string; amount: number }[] }) {
  if (data.length === 0) return <p className="text-xs text-muted text-center py-8">-</p>;

  const values = data.map((d) => d.amount);
  const max = Math.max(...values, 1);
  const total = values.reduce((s, v) => s + v, 0);
  const avg = total / values.length;
  const today = values[values.length - 1] || 0;

  const W = 600;
  const H = 180;
  const padL = 45;
  const padR = 10;
  const padT = 10;
  const padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const points = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * chartW,
    y: padT + chartH - (d.amount / max) * chartH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = linePath + ` L${points[points.length - 1].x},${padT + chartH} L${padL},${padT + chartH} Z`;

  // Grid lines (4 horizontal)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: padT + chartH - pct * chartH,
    label: `$${(max * pct).toFixed(0)}`,
  }));

  // Date labels — show ~6 evenly spaced
  const step = Math.max(1, Math.floor(data.length / 6));
  const dateLabels = data.filter((_, i) => i % step === 0 || i === data.length - 1).map((d, _, arr) => {
    const idx = data.indexOf(d);
    return { x: padL + (idx / (data.length - 1)) * chartW, label: d.date.slice(5) }; // MM-DD
  });

  return (
    <div>
      {/* Summary stats */}
      <div className="flex items-baseline gap-6 mb-4">
        <div>
          <p className="text-2xl font-bold text-foreground">${total.toFixed(2)}</p>
          <p className="text-xs text-muted">30-day total</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">${avg.toFixed(2)}</p>
          <p className="text-xs text-muted">daily avg</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">${today.toFixed(2)}</p>
          <p className="text-xs text-muted">today</p>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minWidth: 400 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {/* Grid */}
          {gridLines.map((g) => (
            <g key={g.y}>
              <line x1={padL} y1={g.y} x2={W - padR} y2={g.y} stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="3,3" />
              <text x={padL - 6} y={g.y + 3} textAnchor="end" className="fill-muted" style={{ fontSize: 9 }}>{g.label}</text>
            </g>
          ))}
          {/* Area */}
          <path d={areaPath} fill="url(#areaGrad)" />
          {/* Line */}
          <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {/* Dots on hover */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={8} fill="transparent" className="cursor-pointer">
                <title>{`${p.date}: $${p.amount.toFixed(2)}`}</title>
              </circle>
              <circle cx={p.x} cy={p.y} r={2.5} fill="var(--color-primary)" opacity={i === points.length - 1 ? 1 : 0} className="pointer-events-none" />
            </g>
          ))}
          {/* Date labels */}
          {dateLabels.map((dl) => (
            <text key={dl.x} x={dl.x} y={H - 6} textAnchor="middle" className="fill-muted" style={{ fontSize: 9 }}>{dl.label}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ─── Donut chart (SVG) ─────────────────────────────

function DonutChart({ data, colorMap }: {
  data: { label: string; value: number; count: number }[];
  colorMap: Record<string, string>;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-xs text-muted text-center py-8">-</p>;

  const defaultColors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
  let cumAngle = 0;

  const slices = data.map((d, i) => {
    const pct = d.value / total;
    const startAngle = cumAngle;
    cumAngle += pct * 360;
    const endAngle = cumAngle;
    const color = colorMap[d.label] || defaultColors[i % defaultColors.length];
    return { ...d, pct, startAngle, endAngle, color };
  });

  function arc(startDeg: number, endDeg: number, r: number) {
    const s = ((startDeg - 90) * Math.PI) / 180;
    const e = ((endDeg - 90) * Math.PI) / 180;
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${50 + r * Math.cos(s)} ${50 + r * Math.sin(s)} A ${r} ${r} 0 ${large} 1 ${50 + r * Math.cos(e)} ${50 + r * Math.sin(e)}`;
  }

  return (
    <div className="flex items-center gap-6">
      <svg width={120} height={120} viewBox="0 0 100 100">
        {slices.map((sl) => (
          <path
            key={sl.label}
            d={arc(sl.startAngle, sl.endAngle - 0.5, 40)}
            fill="none"
            stroke={sl.color}
            strokeWidth={16}
            strokeLinecap="round"
          >
            <title>{`${sl.label}: $${sl.value.toFixed(2)} (${(sl.pct * 100).toFixed(1)}%)`}</title>
          </path>
        ))}
        <text x={50} y={48} textAnchor="middle" className="fill-foreground text-[10px] font-bold">${total.toFixed(0)}</text>
        <text x={50} y={58} textAnchor="middle" className="fill-muted text-[6px]">Total</text>
      </svg>
      <div className="space-y-1.5">
        {slices.map((sl) => (
          <div key={sl.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sl.color }} />
            <span className="text-xs text-foreground font-medium">{sl.label}</span>
            <span className="text-xs text-muted">${sl.value.toFixed(2)} ({sl.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────

export default function MerchantDashboard() {
  const { data: session } = useSession();
  const merchantId = (session?.user as { merchantId?: string })?.merchantId;
  const t = usePortalI18n();

  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    if (!merchantId) { setError('No merchant assigned.'); setLoading(false); return; }

    Promise.all([
      fetch(`/api/merchants/${merchantId}`).then((r) => r.ok ? r.json() : Promise.reject()),
      fetch(`/api/merchants/${merchantId}/stats`).then((r) => r.ok ? r.json() : null),
    ])
      .then(([mData, sData]) => {
        setMerchant(mData.merchant);
        setStats(sData);
      })
      .catch(() => setError('Failed to load data.'))
      .finally(() => setLoading(false));
  }, [session, merchantId]);

  if (loading) return <div className="text-muted text-sm">{t.common.loading}</div>;
  if (error) return <div className="rounded-lg border border-error/20 bg-error/5 p-5"><p className="text-sm text-error">{error}</p></div>;
  if (!merchant) return null;

  const chainColors: Record<string, string> = {
    Ethereum: '#627EEA', 'BNB Smart Chain': '#F0B90B', 'Arbitrum One': '#28A0F0', Tron: '#FF0013', Solana: '#9945FF',
  };
  const tokenColors: Record<string, string> = { USDT: '#26A17B', USDC: '#2775CA' };

  // Demo data when no real stats
  const hasRealData = stats && (stats.byChain.length > 0 || stats.byToken.length > 0);
  const isDemo = !hasRealData;

  const demoStats: Stats = {
    dailyVolume: Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - 29 + i);
      const base = 40 + Math.sin(i * 0.5) * 25;
      return { date: d.toISOString().slice(0, 10), amount: Math.round((base + Math.random() * 30) * 100) / 100 };
    }),
    hourlyVolume: Array.from({ length: 24 }, (_, h) => {
      const peak = Math.exp(-((h - 14) ** 2) / 50) * 80;
      return { hour: h, amount: Math.round((peak + Math.random() * 10) * 100) / 100 };
    }),
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
    recent: [
      { id: 'demo1', status: 'CONFIRMED', fiatAmount: 4.50, amountExpected: '4.50', chainId: 'ethereum', chainName: 'Ethereum', tokenSymbol: 'USDT', productName: 'Americano', txHash: '0x1a2b...3c4d', txExplorerUrl: 'https://etherscan.io/tx/0x1a2b3c4d', createdAt: new Date(Date.now() - 12 * 60000).toISOString() },
      { id: 'demo2', status: 'SWEPT', fiatAmount: 6.00, amountExpected: '6.00', chainId: 'arbitrum', chainName: 'Arbitrum One', tokenSymbol: 'USDC', productName: 'Caramel Macchiato', txHash: '0x5e6f...7g8h', txExplorerUrl: 'https://arbiscan.io/tx/0x5e6f7g8h', createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
      { id: 'demo3', status: 'CONFIRMED', fiatAmount: 0.10, amountExpected: '0.10', chainId: 'arbitrum', chainName: 'Arbitrum One', tokenSymbol: 'USDT', productName: 'API Access', txHash: '0x9a0b...1c2d', txExplorerUrl: 'https://arbiscan.io/tx/0x9a0b1c2d', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
      { id: 'demo4', status: 'PENDING', fiatAmount: 5.50, amountExpected: '5.50', chainId: 'bsc', chainName: 'BNB Smart Chain', tokenSymbol: 'USDT', productName: 'Cafe Latte', txHash: null, txExplorerUrl: null, createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
      { id: 'demo5', status: 'EXPIRED', fiatAmount: 7.00, amountExpected: '7.00', chainId: 'ethereum', chainName: 'Ethereum', tokenSymbol: 'USDC', productName: 'Chocolate Cake', txHash: null, txExplorerUrl: null, createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    ],
  };

  const displayStats = isDemo ? demoStats : stats!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{merchant.name}</h1>
        <p className="mt-0.5 text-sm text-muted">/{merchant.slug}</p>
      </div>

      {/* Demo banner */}
      {isDemo && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <svg className="h-4 w-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
          <p className="text-xs text-primary">{t.dashboard.demoBanner}</p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: t.dashboard.products, value: isDemo ? 8 : merchant.stats.productsCount },
          { label: t.dashboard.payments, value: isDemo ? 192 : merchant.stats.paymentsCount },
          { label: t.dashboard.totalVolume, value: `$${(isDemo ? 3047 : merchant.stats.totalVolume).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-surface p-5">
            <div className="text-sm text-muted">{c.label}</div>
            <div className="mt-1 text-2xl font-semibold text-foreground">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Daily volume — area chart */}
      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground mb-2">{t.dashboard.dailyVolume}</h2>
        <AreaChart data={displayStats.dailyVolume} />
      </div>

      {/* Chain + Token */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t.dashboard.byNetwork}</h2>
          <DonutChart
            data={displayStats.byChain.map((c) => ({ label: c.name, value: c.amount, count: c.count }))}
            colorMap={chainColors}
          />
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t.dashboard.byToken}</h2>
          <DonutChart
            data={displayStats.byToken.map((tk) => ({ label: tk.symbol, value: tk.amount, count: tk.count }))}
            colorMap={tokenColors}
          />
        </div>
      </div>

      {/* Recent payments */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <Link href="/merchant/payments" className="block px-5 py-3.5 border-b border-border flex items-center justify-between group hover:bg-surface-alt/50 transition-colors">
          <h2 className="text-sm font-semibold text-foreground">{t.dashboard.recentPayments || 'Recent Payments'}</h2>
          <svg className="h-4 w-4 text-muted group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </Link>
        {displayStats.recent.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-muted">{t.dashboard.noData}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">{t.dashboard.payments}</th>
                  <th className="px-4 py-2.5 font-medium">Chain</th>
                  <th className="px-4 py-2.5 font-medium">Token</th>
                  <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {displayStats.recent.map((p) => {
                  const statusStyle: Record<string, string> = {
                    PENDING: 'bg-warning/10 text-warning',
                    CONFIRMING: 'bg-primary/10 text-primary',
                    CONFIRMED: 'bg-success/10 text-success',
                    SWEPT: 'bg-success/10 text-success',
                    EXPIRED: 'bg-muted/10 text-muted',
                    FAILED: 'bg-error/10 text-error',
                  };
                  const ago = Date.now() - new Date(p.createdAt).getTime();
                  const mins = Math.floor(ago / 60000);
                  const timeStr = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;

                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-alt/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="text-xs font-medium text-foreground">{p.productName || p.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                          <ChainIcon chainId={p.chainId} size={14} />
                          {p.chainName}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                          <TokenIcon symbol={p.tokenSymbol} size={14} />
                          {p.tokenSymbol}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-xs font-semibold text-foreground">${p.fiatAmount.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle[p.status] || 'bg-muted/10 text-muted'}`}>
                          {p.status}
                          {p.txExplorerUrl && (
                            <a href={p.txExplorerUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-70" title="View on explorer">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                            </a>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted">{timeStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
