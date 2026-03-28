import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="text-xl font-bold text-foreground">Banksi</span>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:text-primary-light transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Multi-chain crypto payments
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            Accept crypto payments{' '}
            <span className="text-primary-light">with confidence</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted max-w-2xl mx-auto">
            Banksi enables merchants to accept USDT and USDC payments across
            Ethereum, Tron, and Solana. Generate unique deposit addresses,
            monitor transactions in real time, and sweep funds automatically.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-light transition-colors"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-surface-alt transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Features */}
        <section id="features" className="mt-32 mb-20 w-full max-w-5xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-foreground">Multi-Chain Support</h3>
              <p className="mt-2 text-sm text-muted">
                Accept payments on Ethereum, Tron, and Solana with automatic
                address generation from HD wallets.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-foreground">Secure by Design</h3>
              <p className="mt-2 text-sm text-muted">
                HD wallet key management with encrypted mnemonics. Unique
                addresses per transaction for full privacy.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-foreground">Real-Time Monitoring</h3>
              <p className="mt-2 text-sm text-muted">
                Track payments as they happen with live blockchain monitoring
                and automatic fund sweeping.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-6">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted">
          &copy; 2026 Banksi. Crypto payment infrastructure.
        </div>
      </footer>
    </div>
  );
}
