'use client';

import { useSession } from '@/components/providers';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    const role = (session.user as { role?: string })?.role;

    switch (role) {
      case 'ADMIN':
        router.replace('/admin');
        break;
      case 'MERCHANT':
        router.replace('/merchant');
        break;
      default:
        router.replace('/user/pay');
        break;
    }
  }, [session, status, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-muted">Redirecting...</p>
    </div>
  );
}
