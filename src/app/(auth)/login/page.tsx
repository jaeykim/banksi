'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, FormEvent } from 'react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useSession } from '@/components/providers';
import Link from 'next/link';

type View = 'login' | 'register' | 'apikey';

export default function LoginPage() {
  const router = useRouter();
  const { status, isNewUser, apiKey } = useSession();
  const [view, setView] = useState<View>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Email form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Redirect when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      if (isNewUser && apiKey) {
        setView('apikey');
      } else if (view !== 'apikey') {
        router.push('/merchant');
      }
    }
  }, [status, isNewUser, apiKey, router, view]);

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      if (!msg.includes('popup-closed')) setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
        setError('Invalid email or password.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      // onAuthStateChanged in providers.tsx will sync the session
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists. Try signing in.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (apiKey) {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ─── API Key reveal ─────────────────────
  if (view === 'apikey' && apiKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        {copied && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-surface shadow-lg">
            API key copied!
          </div>
        )}
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
                {apiKey}
              </code>
              <button onClick={handleCopy} className="flex-shrink-0 rounded-lg bg-foreground px-3 py-2.5 text-xs font-medium text-surface hover:bg-foreground/80 transition-colors">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-alt/50 px-4 py-3 text-xs text-muted mb-6">
            <span className="font-medium text-foreground">Pricing:</span> 0.5% fee per successful transaction. No monthly fees.
          </div>

          <button onClick={() => router.push('/merchant')}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-light transition-colors">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Login / Register ───────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-md shadow-primary/20">
            <span className="text-xl font-bold text-white">B</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {view === 'register' ? 'Create your account' : 'Sign in to Banksi'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {view === 'register' ? 'Start accepting crypto payments' : 'Add crypto payments to your app'}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {/* Google */}
        <button onClick={handleGoogleSignIn} disabled={loading || status === 'loading'}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground hover:bg-surface-alt disabled:opacity-50 transition-colors">
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted">or</span></div>
        </div>

        {/* Email form */}
        <form onSubmit={view === 'register' ? handleEmailRegister : handleEmailLogin} className="space-y-3">
          {view === 'register' && (
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
              className="block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary-light focus:ring-1 focus:ring-primary-light outline-none" />
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email" autoComplete="email"
            className="block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary-light focus:ring-1 focus:ring-primary-light outline-none" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder={view === 'register' ? 'Password (min 8 characters)' : 'Password'} autoComplete={view === 'register' ? 'new-password' : 'current-password'}
            className="block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary-light focus:ring-1 focus:ring-primary-light outline-none" />
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-50 transition-colors">
            {loading ? 'Please wait...' : view === 'register' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {view === 'register' ? (
            <>Already have an account? <button onClick={() => { setView('login'); setError(''); }} className="font-medium text-primary hover:text-primary-light">Sign in</button></>
          ) : (
            <>No account? <button onClick={() => { setView('register'); setError(''); }} className="font-medium text-primary hover:text-primary-light">Create one</button></>
          )}
        </p>

        <p className="mt-3 text-center">
          <Link href="/" className="text-xs text-muted hover:text-foreground transition-colors">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
