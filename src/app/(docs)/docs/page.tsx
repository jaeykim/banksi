import Link from 'next/link';

const mcpTools = [
  { name: 'list_chains', desc: 'List supported blockchains and their tokens (USDT/USDC)', params: 'none' },
  { name: 'get_store', desc: 'Get merchant store info and product catalog by slug', params: 'slug: string' },
  { name: 'create_payment', desc: 'Create a payment — returns unique deposit address', params: 'slug, productId, chainId, tokenId' },
  { name: 'get_payment', desc: 'Get full payment details with status', params: 'paymentId: string' },
  { name: 'check_payment_status', desc: 'Check on-chain payment status', params: 'paymentId: string' },
  { name: 'x402_pay', desc: 'Pay for an x402 paywalled API endpoint', params: 'merchantSlug, chainId, tokenId, amount' },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-surface/80 backdrop-blur-lg">
        <div className="mx-auto max-w-4xl px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
              <span className="text-xs font-bold text-white">B</span>
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">Banksi</span>
            <span className="text-muted">/</span>
            <span className="text-sm font-medium text-muted">Docs</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-primary hover:text-primary-light transition-colors">
            Sign In
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 space-y-20">
        {/* Intro */}
        <section className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Documentation</h1>
          <p className="text-lg text-muted max-w-2xl">
            Banksi is a crypto payment service for banks. Integrate stablecoin payments via REST API, MCP for AI agents, or the x402 protocol for pay-per-use APIs.
          </p>
          <nav className="flex flex-wrap gap-3 pt-2">
            <a href="#mcp" className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-alt transition-colors">MCP Server</a>
            <a href="#x402" className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-alt transition-colors">x402 Protocol</a>
            <a href="#api" className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-alt transition-colors">API Reference</a>
          </nav>
        </section>

        {/* ─── MCP Server ───────────────────────────── */}
        <section id="mcp" className="space-y-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">AI Agents</p>
            <h2 className="text-3xl font-bold text-foreground">MCP Server</h2>
            <p className="mt-3 text-muted max-w-2xl">
              Banksi includes a <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener" className="text-primary hover:underline">Model Context Protocol</a> server.
              AI agents (Claude, etc.) can browse stores, create payments, check statuses, and handle x402 paywalls — all autonomously.
            </p>
          </div>

          {/* Setup */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Setup</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground mb-1.5">1. Run standalone</p>
                <pre className="rounded-lg bg-foreground/[0.03] px-4 py-3 text-sm font-mono text-foreground overflow-x-auto">npm run mcp</pre>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1.5">2. Add to Claude Desktop / Claude Code</p>
                <pre className="rounded-lg bg-foreground/[0.03] px-4 py-3 text-sm font-mono text-foreground overflow-x-auto whitespace-pre">{`{
  "mcpServers": {
    "banksi": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/path/to/banksi"
    }
  }
}`}</pre>
              </div>
            </div>
          </div>

          {/* Tools */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold text-foreground">Tools</h3>
            </div>
            <div className="divide-y divide-border">
              {mcpTools.map((tool) => (
                <div key={tool.name} className="px-6 py-4 flex items-start gap-4">
                  <code className="flex-shrink-0 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-mono font-semibold text-primary">{tool.name}</code>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{tool.desc}</p>
                    <p className="mt-0.5 text-xs text-muted">Params: <code className="text-xs">{tool.params}</code></p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Example flow */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Example Flow</h3>
            <pre className="rounded-lg bg-foreground/[0.03] px-4 py-3 text-sm font-mono text-foreground overflow-x-auto whitespace-pre leading-relaxed">{`Agent: list_chains
→ Ethereum (USDT, USDC), Arbitrum, BSC, Tron, Solana ...

Agent: get_store("seoul-coffee")
→ { merchant: "Seoul Coffee", products: [Americano $4.50, ...] }

Agent: create_payment("seoul-coffee", "prod_abc", "ethereum", "usdt_id")
→ { paymentId: "pay_xyz", address: "0xABC...", amount: "4.50 USDT" }

// ... user pays on-chain ...

Agent: check_payment_status("pay_xyz")
→ { status: "CONFIRMED", txHash: "0xDEF...", confirmations: 5 }`}</pre>
          </div>
        </section>

        {/* ─── x402 Protocol ────────────────────────── */}
        <section id="x402" className="space-y-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-2">Programmable Payments</p>
            <h2 className="text-3xl font-bold text-foreground">x402 Protocol</h2>
            <p className="mt-3 text-muted max-w-2xl">
              HTTP 402 &quot;Payment Required&quot; — reimagined for crypto. Protect any API endpoint with a paywall.
              Clients (including AI agents) pay on-chain and retry with proof of payment. No accounts, no API keys.
            </p>
          </div>

          {/* Flow */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Flow</h3>
            <pre className="rounded-lg bg-foreground/[0.03] px-4 py-3 text-sm font-mono text-foreground overflow-x-auto whitespace-pre leading-relaxed">{`Client                          Banksi                      Blockchain
  │                                │                              │
  │  GET /api/x402/demo            │                              │
  │───────────────────────────────>│                              │
  │                                │                              │
  │  402 { paymentRequired: {      │                              │
  │    amount: 0.01, chains,       │                              │
  │    payUrl } }                  │                              │
  │<───────────────────────────────│                              │
  │                                │                              │
  │  POST /api/x402/pay            │                              │
  │  { merchantSlug, chainId,      │                              │
  │    tokenId, amount }           │                              │
  │───────────────────────────────>│                              │
  │                                │                              │
  │  201 { paymentId, address }    │                              │
  │<───────────────────────────────│                              │
  │                                │                              │
  │  Send USDT to address ─────────────────────────────────────>  │
  │                                │    Monitor detects payment   │
  │                                │<──────────────────────────── │
  │                                │                              │
  │  GET /api/x402/demo            │                              │
  │  X-Payment: <paymentId>        │                              │
  │───────────────────────────────>│                              │
  │                                │                              │
  │  200 { data: "premium" }       │                              │
  │<───────────────────────────────│                              │`}</pre>
          </div>

          {/* Demo */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Try It</h3>
            <p className="text-sm text-muted">The demo endpoint requires a $0.01 stablecoin payment:</p>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground mb-1.5">1. Hit the protected endpoint</p>
                <pre className="rounded-lg bg-foreground/[0.03] px-4 py-3 text-sm font-mono text-foreground overflow-x-auto">curl http://localhost:3001/api/x402/demo</pre>
                <p className="mt-1 text-xs text-muted">Returns 402 with payment instructions</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1.5">2. Create payment</p>
                <pre className="rounded-lg bg-foreground/[0.03] px-4 py-3 text-sm font-mono text-foreground overflow-x-auto whitespace-pre">{`curl -X POST http://localhost:3001/api/x402/pay \\
  -H "Content-Type: application/json" \\
  -d '{"merchantSlug":"seoul-coffee","chainId":"ethereum","tokenId":"<id>","amount":0.01}'`}</pre>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1.5">3. Pay on-chain, then retry with receipt</p>
                <pre className="rounded-lg bg-foreground/[0.03] px-4 py-3 text-sm font-mono text-foreground overflow-x-auto">{`curl -H "X-Payment: <paymentId>" http://localhost:3001/api/x402/demo`}</pre>
                <p className="mt-1 text-xs text-muted">Returns 200 with premium content</p>
              </div>
            </div>
          </div>

          {/* Integration */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Protect Your Own Endpoint</h3>
            <pre className="rounded-lg bg-foreground/[0.03] px-4 py-3 text-sm font-mono text-foreground overflow-x-auto whitespace-pre">{`import { requirePayment } from '@/lib/x402/middleware';

export async function GET(request: NextRequest) {
  const paywall = await requirePayment(request, {
    merchantSlug: 'your-store',
    amount: 0.05,
    description: 'Access this API for $0.05',
  });

  if (paywall) return paywall; // Returns 402

  // Payment verified — serve content
  return NextResponse.json({ data: '...' });
}`}</pre>
          </div>
        </section>

        {/* ─── API Reference ────────────────────────── */}
        <section id="api" className="space-y-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">REST API</p>
            <h2 className="text-3xl font-bold text-foreground">API Reference</h2>
            <p className="mt-3 text-muted">Public endpoints — no authentication required.</p>
          </div>

          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="divide-y divide-border">
              {[
                { method: 'GET', path: '/api/chains', desc: 'List all active blockchains and tokens' },
                { method: 'GET', path: '/api/store/:slug', desc: 'Get store info and products' },
                { method: 'POST', path: '/api/store/:slug/pay', desc: 'Create a payment from the storefront' },
                { method: 'GET', path: '/api/payments/:id', desc: 'Get full payment details' },
                { method: 'GET', path: '/api/payments/:id/status', desc: 'Poll payment status (on-chain check)' },
                { method: 'POST', path: '/api/x402/pay', desc: 'Create an x402 paywall payment' },
                { method: 'GET', path: '/api/x402/demo', desc: 'Demo protected endpoint ($0.01)' },
                { method: 'POST', path: '/api/upload', desc: 'Upload product image (auth required)' },
              ].map((ep) => (
                <div key={ep.path + ep.method} className="px-6 py-3.5 flex items-center gap-4">
                  <span className={`flex-shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${ep.method === 'GET' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-foreground flex-shrink-0">{ep.path}</code>
                  <span className="text-sm text-muted hidden sm:inline">{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-8 mt-12">
        <div className="mx-auto max-w-4xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">B</span>
            </div>
            <span className="text-sm font-semibold text-foreground">Banksi</span>
          </div>
          <p className="text-xs text-muted">&copy; 2026 Banksi</p>
        </div>
      </footer>
    </div>
  );
}
