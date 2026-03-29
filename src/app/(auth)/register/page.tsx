'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [projectName, setProjectName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Success state
  const [apiKey, setApiKey] = useState('');
  const [slug, setSlug] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, projectName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        return;
      }
      setApiKey(data.apiKey);
      setSlug(data.merchantSlug);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ─── Success: show API key ───────────────────────
  if (apiKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        {/* Copy toast */}
        {copied && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-surface shadow-lg animate-[fade-in_0.2s_ease]">
            API key copied to clipboard
          </div>
        )}
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">You&apos;re all set!</h1>
            <p className="mt-2 text-sm text-muted">Your project <span className="font-semibold text-foreground">{projectName || name}</span> is ready.</p>
          </div>

          <div className="rounded-xl border border-warning/30 bg-warning/5 p-5 mb-6">
            <p className="text-sm font-semibold text-warning mb-1">Save your API key now</p>
            <p className="text-xs text-muted mb-3">This key will not be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-foreground/[0.05] border border-border px-3 py-2.5 font-mono text-xs text-foreground break-all select-all">
                {apiKey}
              </code>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 rounded-lg bg-foreground px-3 py-2.5 text-xs font-medium text-surface hover:bg-foreground/80 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 mb-6 space-y-3">
            <p className="text-sm font-semibold text-foreground">Quick start</p>
            <div className="rounded-lg bg-[#0f172a] p-4 overflow-x-auto">
              <pre className="text-xs font-mono text-white leading-relaxed"><code>{`# 1. Install SDK
npm install banksi

# 2. Set environment variable
export BANKSI_API_KEY=${apiKey}

# 3. Add to your route (Next.js)
import { createBanksiPaywall } from 'banksi/next';
const paywall = createBanksiPaywall({ amount: 0.10 });`}</code></pre>
            </div>
            <p className="text-xs text-muted">
              Store slug: <code className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-xs">{slug}</code>
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-alt/50 px-4 py-3 text-xs text-muted">
            <span className="font-medium text-foreground">Pricing:</span> 0.5% fee per successful transaction, deducted automatically during sweep. No monthly fees. Testnet usage is free.
          </div>

          <div className="flex gap-3">
            <Link
              href="/login"
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white text-center hover:bg-primary-light transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/docs"
              target="_blank"
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground text-center hover:bg-surface-alt transition-colors"
            >
              Read Docs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Registration form ───────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-md shadow-primary/20">
            <span className="text-xl font-bold text-white">B</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Start building with Banksi</h1>
          <p className="mt-1 text-sm text-muted">
            Add crypto payments to your app in minutes
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">Your name</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Doe"
              className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary-light focus:ring-1 focus:ring-primary-light outline-none transition-colors" />
          </div>

          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-foreground mb-1.5">Project name</label>
            <input id="projectName" type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="My Awesome App"
              className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary-light focus:ring-1 focus:ring-primary-light outline-none transition-colors" />
            <p className="mt-1 text-xs text-muted">Optional — used as your store name and slug</p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com"
              className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary-light focus:ring-1 focus:ring-primary-light outline-none transition-colors" />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" placeholder="At least 8 characters"
              className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary-light focus:ring-1 focus:ring-primary-light outline-none transition-colors" />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">Confirm password</label>
            <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" placeholder="Repeat password"
              className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary-light focus:ring-1 focus:ring-primary-light outline-none transition-colors" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-primary to-primary-light px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md disabled:opacity-50 transition-all">
            {loading ? 'Creating...' : 'Create Account & Get API Key'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:text-primary-light transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
