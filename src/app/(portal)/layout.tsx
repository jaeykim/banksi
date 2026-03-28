'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

interface NavItem {
  label: string;
  href: string;
}

const navByRole: Record<string, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Merchants', href: '/admin/merchants' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Payments', href: '/admin/payments' },
    { label: 'Sweep', href: '/admin/sweep' },
  ],
  MERCHANT: [
    { label: 'Dashboard', href: '/merchant' },
    { label: 'Products', href: '/merchant/products' },
    { label: 'Store', href: '/merchant/store' },
    { label: 'Payments', href: '/merchant/payments' },
    { label: 'Wallets', href: '/merchant/wallets' },
    { label: 'Settings', href: '/merchant/settings' },
  ],
  USER: [
    { label: 'Pay', href: '/user/pay' },
    { label: 'History', href: '/user/history' },
  ],
};

export default function PortalLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const role = (session.user as { role?: string })?.role || 'USER';
  const navItems = navByRole[role] || navByRole.USER;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 w-56 bg-sidebar-bg flex flex-col">
        {/* Brand */}
        <div className="flex h-14 items-center gap-2 px-4 border-b border-white/10">
          <div className="h-7 w-7 rounded-md bg-primary-light flex items-center justify-center">
            <span className="text-sm font-bold text-white">B</span>
          </div>
          <span className="text-base font-semibold text-white">Banksi</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-active text-white'
                    : 'text-sidebar-text hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-4">
          <div className="text-sm font-medium text-white truncate">
            {session.user?.name || session.user?.email}
          </div>
          <div className="text-xs text-sidebar-text mt-0.5 capitalize">
            {role.toLowerCase()}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="mt-3 w-full rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-sidebar-text hover:bg-white/5 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-56 flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-surface px-6">
          <h2 className="text-sm font-medium text-foreground">
            {navItems.find((i) => pathname === i.href || pathname.startsWith(i.href + '/'))?.label || 'Portal'}
          </h2>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span>{session.user?.email}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 bg-background">{children}</main>
      </div>
    </div>
  );
}
