'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: string;
  merchantId: string | null;
  merchantSlug?: string;
}

interface AuthContextType {
  data: { user: UserData } | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  isNewUser: boolean;
  apiKey: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  data: null,
  status: 'loading',
  isNewUser: false,
  apiKey: null,
  signOut: async () => {},
});

export function useSession() {
  return useContext(AuthContext);
}

export default function Providers({ children }: { children: ReactNode }) {
  const [data, setData] = useState<{ user: UserData } | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [isNewUser, setIsNewUser] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const syncSession = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setData(null);
      setStatus('unauthenticated');
      return;
    }

    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch('/api/auth/firebase-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (res.ok) {
        const result = await res.json();
        setData({ user: result.user });
        setStatus('authenticated');
        if (result.isNewUser) setIsNewUser(true);
        if (result.apiKey) setApiKey(result.apiKey);
      } else {
        setData(null);
        setStatus('unauthenticated');
      }
    } catch {
      setData(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, syncSession);
    return () => unsubscribe();
  }, [syncSession]);

  // Token refresh every 50 minutes
  useEffect(() => {
    if (status !== 'authenticated') return;
    const iv = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        const idToken = await user.getIdToken(true);
        await fetch('/api/auth/firebase-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
      }
    }, 50 * 60 * 1000);
    return () => clearInterval(iv);
  }, [status]);

  const handleSignOut = useCallback(async () => {
    await firebaseSignOut(auth);
    await fetch('/api/auth/firebase-session', { method: 'DELETE' });
    setData(null);
    setStatus('unauthenticated');
    setIsNewUser(false);
    setApiKey(null);
  }, []);

  return (
    <AuthContext.Provider value={{ data, status, isNewUser, apiKey, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}
