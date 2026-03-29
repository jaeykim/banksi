'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useSession } from '@/components/providers';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { status, isNewUser, apiKey } = useSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Already authenticated — redirect or show API key
  if (status === 'authenticated' && !showApiKey) {
    if (isNewUser && apiKey) {
      setShowApiKey(true);
      setNewApiKey(apiKey);
    } else {
      router.push('/merchant');
      return null;
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // AuthProvider handles the rest (POST to firebase-session)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      if (msg.includes('popup-closed')) {
        // User closed popup, not an error
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (newApiKey) {
      await navigator.clipboard.writeText(newApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Show API key for new users
  if (showApiKey && newApiKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Welcome to Banksi!</h1>
            <p className="mt-2 text-sm text-muted">Your account is ready.</p>
          </div>

          <div className="rounded-xl border border-warning/30 bg-warning/5 p-5 mb-6">
            <p className="text-sm font-semibold text-warning mb-1">Save your API key now</p>
            <p className="text-xs text-muted mb-3">This key will not be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-foreground/[0.05] border border-border px-3 py-2.5 font-mono text-xs text-foreground break-all select-all">
                {newApiKey}
              </code>
              <button onClick={handleCopy} className="flex-shrink-0 rounded-lg bg-foreground px-3 py-2.5 text-xs font-medium text-surface hover:bg-foreground/80 transition-colors">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-alt/50 px-4 py-3 text-xs text-muted mb-6">
            <span className="font-medium text-foreground">Pricing:</span> 1% fee per successful transaction. No monthly fees.
          </div>

          <button
            onClick={() => router.push('/merchant')}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-light transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-md shadow-primary/20">
            <span className="text-xl font-bold text-white">B</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sign in to Banksi</h1>
          <p className="mt-1 text-sm text-muted">
            Add crypto payments to your app in minutes
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading || status === 'loading'}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground hover:bg-surface-alt disabled:opacity-50 transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        <p className="mt-6 text-center text-xs text-muted">
          New accounts get a merchant dashboard + API key automatically.
        </p>

        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/" className="text-primary hover:text-primary-light transition-colors">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
