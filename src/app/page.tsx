import Link from 'next/link';
import { getLocale, getDictionary } from '@/i18n/server';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ScrollReveal } from '@/components/scroll-reveal';
import { PromptCopyBlock } from '@/components/prompt-copy-block';

export default async function Home() {
  const locale = await getLocale();
  const t = await getDictionary(locale);

  const chains = [
    { name: 'Ethereum', icon: '/assets/chains/ethereum.svg' },
    { name: 'BNB Chain', icon: '/assets/chains/bsc.svg' },
    { name: 'Arbitrum', icon: '/assets/chains/arbitrum.svg' },
    { name: 'Tron', icon: '/assets/chains/tron.svg' },
    { name: 'Solana', icon: '/assets/chains/solana.svg' },
  ];
  const tokens = [
    { name: 'USDT', icon: '/assets/tokens/usdt.svg' },
    { name: 'USDC', icon: '/assets/tokens/usdc.svg' },
  ];

  const Chk = () => (
    <svg className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-x-hidden">
      {/* ── Header ──────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-surface/80 backdrop-blur-lg">
        <div className="mx-auto max-w-6xl px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md shadow-primary/20">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">Banksi</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-muted">
            <a href="#quickstart" className="hover:text-foreground transition-colors">Quickstart</a>
            <a href="#x402" className="hover:text-foreground transition-colors">x402</a>
            <a href="#mcp" className="hover:text-foreground transition-colors">MCP</a>
            <Link href="/examples/cafe" target="_blank" className="hover:text-foreground transition-colors">Demo</Link>
            <Link href="/docs" target="_blank" className="hover:text-foreground transition-colors">{t.header.docs}</Link>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher current={locale} />
            <Link href="/login" className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-surface hover:bg-foreground/80 transition-colors">
              {t.header.signIn}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ──────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-gradient-to-b from-primary/6 via-primary-light/4 to-transparent rounded-full blur-3xl animate-pulse-soft" />
            <div className="absolute top-32 right-[-5%] w-80 h-80 bg-accent/6 rounded-full blur-3xl animate-float-slow" />
            <div className="absolute top-64 left-[-8%] w-64 h-64 bg-primary-light/5 rounded-full blur-3xl animate-float-delay" />
            <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          </div>

          <div className="mx-auto max-w-6xl px-6 pt-20 pb-12 sm:pt-32 sm:pb-20">
            <div className="max-w-3xl mx-auto text-center">
              <ScrollReveal>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                  <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
                  {t.hero.badge}
                </div>
              </ScrollReveal>
              <ScrollReveal delay={100}>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl leading-[1.15]">
                  {t.hero.title}<br />
                  <span className="bg-gradient-to-r from-primary via-primary-light to-accent bg-clip-text text-transparent">{t.hero.titleHighlight}</span>
                </h1>
              </ScrollReveal>
              <ScrollReveal delay={200}>
                <p className="mt-6 text-base sm:text-lg leading-relaxed text-muted max-w-2xl mx-auto">{t.hero.description}</p>
              </ScrollReveal>
              <ScrollReveal delay={300}>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <div className="w-full sm:w-auto rounded-xl bg-foreground/[0.04] border border-border px-5 py-3 font-mono text-sm text-foreground select-all cursor-text">
                    $ {t.getStarted}
                  </div>
                  <Link href="/docs" target="_blank" className="w-full sm:w-auto rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground hover:bg-surface-alt transition-colors text-center">
                    {t.cta.docs}
                  </Link>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={400}>
                <div className="mt-10 flex items-center justify-center gap-2 flex-wrap">
                  {chains.map((c) => (
                    <div key={c.name} className="flex items-center gap-1.5 rounded-full border border-border bg-surface pl-1.5 pr-3 py-1 text-[11px] font-medium text-muted">
                      <img src={c.icon} alt={c.name} className="h-4 w-4" />{c.name}
                    </div>
                  ))}
                  {tokens.map((tk) => (
                    <div key={tk.name} className="flex items-center gap-1.5 rounded-full border border-border bg-surface pl-1.5 pr-3 py-1 text-[11px] font-medium text-muted">
                      <img src={tk.icon} alt={tk.name} className="h-4 w-4" />{tk.name}
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ── Quickstart Code ──────────────── */}
        <section id="quickstart" className="py-16 bg-surface-alt/40">
          <div className="mx-auto max-w-3xl px-6">
            <ScrollReveal>
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{t.quickstart.heading}</h2>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <PromptCopyBlock t={t} />
            </ScrollReveal>
          </div>
        </section>

        {/* ── Features ─────────────────────── */}
        <section id="features" className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground">{t.features.heading}</h2>
                <p className="mt-3 text-muted max-w-lg mx-auto">{t.features.subheading}</p>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { title: t.features.multiChain, desc: t.features.multiChainDesc, clr: 'from-primary/10 to-accent/10 text-primary', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg> },
                { title: t.features.secure, desc: t.features.secureDesc, clr: 'from-accent/10 to-primary/10 text-accent', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" /></svg> },
                { title: t.features.monitoring, desc: t.features.monitoringDesc, clr: 'from-success/10 to-accent/10 text-success', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg> },
                { title: t.features.x402, desc: t.features.x402Desc, clr: 'from-warning/10 to-accent/10 text-warning', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg> },
              ].map((f, i) => (
                <ScrollReveal key={f.title} delay={i * 80}>
                  <div className="group h-full rounded-2xl border border-border bg-surface p-6 hover:border-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${f.clr}`}>{f.icon}</div>
                    <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ───────────────────────── */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground">{t.pricing.heading}</h2>
                <p className="mt-3 text-muted max-w-lg mx-auto">{t.pricing.subheading}</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="mx-auto max-w-md rounded-2xl border-2 border-primary/20 bg-surface p-8 text-center">
                <p className="text-6xl font-extrabold text-primary">{t.pricing.fee}</p>
                <p className="mt-2 text-sm font-medium text-muted">{t.pricing.feeLabel}</p>
                <p className="mt-4 text-sm text-muted leading-relaxed">{t.pricing.feeDesc}</p>
                <div className="mt-6 border-t border-border pt-5 space-y-2.5 text-left">
                  {[t.pricing.item1, t.pricing.item2, t.pricing.item3, t.pricing.item4].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-foreground">
                      <svg className="h-4 w-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── How It Works ─────────────────── */}
        <section className="py-20 bg-surface-alt/40">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground">{t.howItWorks.heading}</h2>
                <p className="mt-3 text-muted max-w-lg mx-auto">{t.howItWorks.subheading}</p>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              {[
                { s: '01', title: t.howItWorks.step1Title, desc: t.howItWorks.step1Desc },
                { s: '02', title: t.howItWorks.step2Title, desc: t.howItWorks.step2Desc },
                { s: '03', title: t.howItWorks.step3Title, desc: t.howItWorks.step3Desc },
                { s: '04', title: t.howItWorks.step4Title, desc: t.howItWorks.step4Desc },
              ].map((st) => (
                <div key={st.s} className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-2xl font-black text-primary/20">{st.s}</p>
                  <h3 className="text-sm font-semibold text-foreground mt-2">{st.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{st.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Payment Preview ───────────────── */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground">{t.paymentPreview.heading}</h2>
                <p className="mt-3 text-muted max-w-lg mx-auto">{t.paymentPreview.subheading}</p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className="flex justify-center">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl w-full">
                  {/* Step 1: Select network & token */}
                  <div className="rounded-2xl border border-border bg-surface shadow-lg shadow-slate-200/50 overflow-hidden">
                    <div className="border-b border-border/60 bg-surface-alt/30 px-5 py-3 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-light">
                        <span className="text-[8px] font-bold text-white">B</span>
                      </div>
                      <span className="text-xs font-medium text-muted">Seoul Coffee</span>
                    </div>
                    <div className="p-5 space-y-4">
                      {/* Product */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Americano</p>
                          <p className="text-xs text-muted">Classic black coffee</p>
                        </div>
                        <p className="text-lg font-bold text-foreground">$4.50</p>
                      </div>
                      {/* Network */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">{t.paymentPreview.selectNetwork}</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { name: 'Ethereum', icon: '/assets/chains/ethereum.svg', active: false },
                            { name: 'Arbitrum', icon: '/assets/chains/arbitrum.svg', active: true },
                            { name: 'Solana', icon: '/assets/chains/solana.svg', active: false },
                          ].map((n) => (
                            <div key={n.name} className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2 ${n.active ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-surface-alt/50'}`}>
                              <img src={n.icon} alt={n.name} className="h-5 w-5" />
                              <span className={`text-[10px] font-medium ${n.active ? 'text-indigo-700' : 'text-muted'}`}>{n.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Token */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">{t.paymentPreview.payWith}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { name: 'USDT', icon: '/assets/tokens/usdt.svg', active: true },
                            { name: 'USDC', icon: '/assets/tokens/usdc.svg', active: false },
                          ].map((tk) => (
                            <div key={tk.name} className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 ${tk.active ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-surface-alt/50'}`}>
                              <img src={tk.icon} alt={tk.name} className="h-5 w-5" />
                              <span className={`text-xs font-semibold ${tk.active ? 'text-indigo-700' : 'text-muted'}`}>{tk.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Summary */}
                      <div className="rounded-lg bg-indigo-50 px-3 py-2 flex items-center gap-1.5 text-xs text-indigo-700">
                        {t.paymentPreview.youWillPay}
                        <img src="/assets/tokens/usdt.svg" alt="" className="h-3.5 w-3.5" />
                        <span className="font-semibold">4.50 USDT</span>
                        {t.paymentPreview.on}
                        <img src="/assets/chains/arbitrum.svg" alt="" className="h-3.5 w-3.5" />
                        <span className="font-semibold">Arbitrum</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Payment address + waiting */}
                  <div className="rounded-2xl border border-border bg-surface shadow-lg shadow-slate-200/50 overflow-hidden">
                    <div className="border-b border-border/60 bg-surface-alt/30 px-5 py-3 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-light">
                        <span className="text-[8px] font-bold text-white">B</span>
                      </div>
                      <span className="text-xs font-medium text-muted">Seoul Coffee</span>
                    </div>
                    <div className="p-5 space-y-4">
                      {/* Timer */}
                      <div className="flex items-center justify-between rounded-lg bg-surface-alt/50 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                          </span>
                          <span className="text-xs text-muted">{t.paymentPreview.waitingForPayment}</span>
                        </div>
                        <span className="text-xs font-mono font-semibold text-foreground">28:45</span>
                      </div>
                      {/* Pay button mock */}
                      <div className="rounded-lg bg-indigo-600 py-2.5 text-center">
                        <span className="text-xs font-semibold text-white flex items-center justify-center gap-1.5">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          Pay with Browser Wallet
                        </span>
                      </div>
                      {/* Mobile wallets */}
                      <div className="grid grid-cols-4 gap-1">
                        {['MetaMask', 'Coinbase', 'Trust', 'Rainbow'].map((w) => (
                          <div key={w} className="flex flex-col items-center gap-0.5 rounded-lg bg-surface-alt/50 py-1.5">
                            <div className="h-5 w-5 rounded-md bg-muted/10" />
                            <span className="text-[8px] text-muted">{w}</span>
                          </div>
                        ))}
                      </div>
                      {/* Divider */}
                      <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/60" /></div><div className="relative flex justify-center"><span className="bg-surface px-2 text-[10px] text-muted">or send manually</span></div></div>
                      {/* Amount + Address */}
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted">{t.paymentPreview.sendExactly}</p>
                        <p className="mt-1 flex items-center justify-center gap-1 text-base font-bold text-foreground">
                          <img src="/assets/tokens/usdt.svg" alt="" className="h-4 w-4" />
                          4.50 USDT
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted text-center mb-1">{t.paymentPreview.toAddress}</p>
                        <div className="rounded-lg border border-border bg-surface-alt/30 px-3 py-2 text-center font-mono text-[10px] text-foreground/70 break-all">
                          0xAeED6949...7aC7f3B2
                        </div>
                        <p className="text-center text-[9px] text-muted mt-1">{t.paymentPreview.tapToCopy}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── x402 ─────────────────────────── */}
        <section id="x402" className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 -z-10"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/4 rounded-full blur-3xl animate-pulse-soft" /></div>
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="text-center mb-12">
                <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-2">x402 Protocol</p>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground">{t.x402.heading}</h2>
                <p className="mt-3 text-muted max-w-2xl mx-auto">{t.x402.subheading}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[t.x402.badge1, t.x402.badge2, t.x402.badge3].map((b) => (
                    <span key={b} className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">{b}</span>
                  ))}
                </div>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { n: '1', t: t.x402.item1Title, d: t.x402.item1Desc, c: 'HTTP/1.1 402 Payment Required' },
                { n: '2', t: t.x402.item2Title, d: t.x402.item2Desc, c: 'Send 0.01 USDT \u2192 0xABC...' },
                { n: '3', t: t.x402.item3Title, d: t.x402.item3Desc, c: 'X-Payment: <paymentId>' },
              ].map((item) => (
                <div key={item.n} className="rounded-2xl border border-border bg-surface p-6">
                  <p className="text-2xl font-black text-accent/20">{item.n}</p>
                  <h3 className="text-sm font-semibold text-foreground mt-2">{item.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.d}</p>
                  <div className="mt-3 rounded-lg bg-foreground/[0.03] px-3 py-2"><code className="text-xs font-mono text-accent/70">{item.c}</code></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MCP / AI Agent ───────────────── */}
        <section id="mcp" className="py-20 bg-surface-alt/40">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 items-center">
              <ScrollReveal direction="left">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">MCP Server</p>
                  <h2 className="text-3xl sm:text-4xl font-bold text-foreground">{t.mcp.heading}</h2>
                  <p className="mt-4 text-muted leading-relaxed">{t.mcp.subheading}</p>
                  <div className="mt-6 flex items-center gap-3">
                    <Link href="/docs#mcp" target="_blank" className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-surface hover:bg-foreground/80 transition-colors">
                      {t.mcp.docsLink}
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
              <ScrollReveal direction="right">
                <div className="space-y-2.5">
                  {[
                    { name: t.mcp.tool1, desc: t.mcp.tool1Desc, clr: 'from-primary/10 to-primary-light/10 text-primary' },
                    { name: t.mcp.tool2, desc: t.mcp.tool2Desc, clr: 'from-accent/10 to-primary/10 text-accent' },
                    { name: t.mcp.tool3, desc: t.mcp.tool3Desc, clr: 'from-success/10 to-accent/10 text-success' },
                    { name: t.mcp.tool4, desc: t.mcp.tool4Desc, clr: 'from-warning/10 to-accent/10 text-warning' },
                  ].map((tl) => (
                    <div key={tl.name} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3.5 hover:shadow-md transition-shadow">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${tl.clr} flex-shrink-0`}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.193-.14 1.743" /></svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold font-mono text-foreground">{tl.name}</p>
                        <p className="text-xs text-muted">{tl.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ── For Builders ─────────────────── */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ScrollReveal direction="left">
                <div className="h-full rounded-2xl border border-border bg-surface p-7">
                  <h3 className="text-lg font-bold text-foreground">{t.forBanks.title}</h3>
                  <ul className="mt-4 space-y-2.5 text-sm text-muted">
                    <li className="flex items-start gap-2"><Chk />{t.forBanks.item1}</li>
                    <li className="flex items-start gap-2"><Chk />{t.forBanks.item2}</li>
                    <li className="flex items-start gap-2"><Chk />{t.forBanks.item3}</li>
                    <li className="flex items-start gap-2"><Chk />{t.forBanks.item4}</li>
                  </ul>
                </div>
              </ScrollReveal>
              <ScrollReveal direction="right">
                <div className="h-full rounded-2xl border border-border bg-surface p-7">
                  <h3 className="text-lg font-bold text-foreground">{t.forMerchants.title}</h3>
                  <ul className="mt-4 space-y-2.5 text-sm text-muted">
                    <li className="flex items-start gap-2"><Chk />{t.forMerchants.item1}</li>
                    <li className="flex items-start gap-2"><Chk />{t.forMerchants.item2}</li>
                    <li className="flex items-start gap-2"><Chk />{t.forMerchants.item3}</li>
                    <li className="flex items-start gap-2"><Chk />{t.forMerchants.item4}</li>
                  </ul>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ── Testimonials ─────────────────── */}
        <section className="py-20 bg-surface-alt/40">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground">{t.testimonials.heading}</h2>
                <p className="mt-3 text-muted max-w-lg mx-auto">{t.testimonials.subheading}</p>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { q: t.testimonials.t1, name: t.testimonials.t1Name, role: t.testimonials.t1Role, accent: 'border-accent/30' },
                { q: t.testimonials.t2, name: t.testimonials.t2Name, role: t.testimonials.t2Role, accent: 'border-primary/30' },
                { q: t.testimonials.t3, name: t.testimonials.t3Name, role: t.testimonials.t3Role, accent: 'border-success/30' },
              ].map((rev) => (
                <ScrollReveal key={rev.name}>
                  <div className={`h-full rounded-2xl border-2 ${rev.accent} bg-surface p-6 flex flex-col`}>
                    <svg className="h-7 w-7 text-muted/20 mb-3" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10H0z" /></svg>
                    <p className="text-sm leading-relaxed text-foreground flex-1">&ldquo;{rev.q}&rdquo;</p>
                    <div className="mt-4 pt-3 border-t border-border">
                      <p className="text-sm font-semibold text-foreground">{rev.name}</p>
                      <p className="text-xs text-muted">{rev.role}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Live Demo ──────────────────── */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="text-center mb-10">
                <p className="text-sm font-semibold uppercase tracking-widest text-amber-600 mb-2">Live Demo</p>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground">See it in action</h2>
                <p className="mt-3 text-muted max-w-lg mx-auto">A crypto-powered cafe built with Banksi. Browse the menu, checkout, see the x402 flow, and check the merchant dashboard.</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Link href="/examples/cafe" target="_blank" className="group rounded-2xl border border-border bg-surface p-6 hover:border-amber-300 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <span className="text-3xl">☕</span>
                  <h3 className="mt-3 text-sm font-semibold text-foreground group-hover:text-amber-700">Seoul Coffee</h3>
                  <p className="mt-1 text-xs text-muted">Full cafe storefront with cart, x402 checkout, and on-chain payment flow.</p>
                  <p className="mt-3 text-xs font-semibold text-amber-600">Try the demo &rarr;</p>
                </Link>
                <Link href="/store/seoul-coffee" target="_blank" className="group rounded-2xl border border-border bg-surface p-6 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <span className="text-3xl">🛒</span>
                  <h3 className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary">Product Store</h3>
                  <p className="mt-1 text-xs text-muted">Banksi-hosted storefront with product catalog, QR codes, and direct payments.</p>
                  <p className="mt-3 text-xs font-semibold text-primary">Open store &rarr;</p>
                </Link>
                <Link href="/login" target="_blank" className="group rounded-2xl border border-border bg-surface p-6 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <span className="text-3xl">📊</span>
                  <h3 className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary">Merchant Dashboard</h3>
                  <p className="mt-1 text-xs text-muted">Revenue charts, payment history, wallet config. Login: merchant@banksi.io / merchant123</p>
                  <p className="mt-3 text-xs font-semibold text-primary">Open dashboard &rarr;</p>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── CTA ──────────────────────────── */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <ScrollReveal>
              <div className="relative rounded-3xl bg-gradient-to-br from-primary-dark via-primary to-primary-light p-10 sm:p-14 overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/3 animate-float-slow" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/20 translate-y-1/3 -translate-x-1/4 animate-float-delay" />
                </div>
                <div className="relative z-10">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">{t.cta.heading}</h2>
                  <p className="mt-3 text-white/70 max-w-md mx-auto">{t.cta.subheading}</p>
                  <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <div className="w-full sm:w-auto rounded-xl bg-white/10 border border-white/20 px-6 py-3 font-mono text-sm text-white select-all cursor-text">
                      $ npm install banksi
                    </div>
                    <Link href="/docs" target="_blank" className="w-full sm:w-auto rounded-xl bg-white px-7 py-3 text-sm font-semibold text-primary hover:bg-white/90 transition-colors text-center">{t.cta.docs}</Link>
                    <Link href="/examples/cafe" target="_blank" className="w-full sm:w-auto rounded-xl border border-white/30 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors text-center">{t.cta.example}</Link>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────── */}
      <footer className="border-t border-border bg-surface py-7">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-primary-light flex items-center justify-center"><span className="text-[10px] font-bold text-white">B</span></div>
            <span className="text-sm font-semibold text-foreground">Banksi</span>
          </div>
          <nav className="flex items-center gap-5 text-xs text-muted">
            <Link href="/docs" target="_blank" className="hover:text-foreground transition-colors">{t.header.docs}</Link>
            <Link href="/docs#x402" target="_blank" className="hover:text-foreground transition-colors">x402</Link>
            <Link href="/docs#mcp" target="_blank" className="hover:text-foreground transition-colors">MCP</Link>
            <a href="https://github.com" className="hover:text-foreground transition-colors">GitHub</a>
          </nav>
          <p className="text-xs text-muted">&copy; 2026 Banksi. {t.footer}</p>
        </div>
      </footer>
    </div>
  );
}
