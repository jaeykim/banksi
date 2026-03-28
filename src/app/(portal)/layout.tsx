'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { PortalI18nProvider, usePortalI18n } from '@/i18n/use-portal-i18n';

interface NavItem {
  labelKey: string;
  href: string;
}

const navByRole: Record<string, NavItem[]> = {
  ADMIN: [
    { labelKey: 'dashboard', href: '/admin' },
    { labelKey: 'merchants', href: '/admin/merchants' },
    { labelKey: 'users', href: '/admin/users' },
    { labelKey: 'payments', href: '/admin/payments' },
    { labelKey: 'sweep', href: '/admin/sweep' },
    { labelKey: 'settings', href: '/admin/settings' },
  ],
  MERCHANT: [
    { labelKey: 'dashboard', href: '/merchant' },
    { labelKey: 'products', href: '/merchant/products' },
    { labelKey: 'store', href: '/merchant/store' },
    { labelKey: 'payments', href: '/merchant/payments' },
    { labelKey: 'wallets', href: '/merchant/wallets' },
    { labelKey: 'settings', href: '/merchant/settings' },
  ],
  USER: [
    { labelKey: 'dashboard', href: '/user/pay' },
  ],
};

function PortalLayoutInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const t = usePortalI18n();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted">{t.common.loading}</div>
      </div>
    );
  }

  if (!session) return null;

  const role = (session.user as { role?: string })?.role || 'USER';
  const navItems = navByRole[role] || navByRole.USER;

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 w-56 bg-sidebar-bg flex flex-col">
        <div className="flex h-14 items-center gap-2 px-4 border-b border-white/10">
          <div className="h-7 w-7 rounded-md bg-primary-light flex items-center justify-center">
            <span className="text-sm font-bold text-white">B</span>
          </div>
          <span className="text-base font-semibold text-white">Banksi</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isDashboard = item.labelKey === 'dashboard';
            const isActive = isDashboard
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/');
            const label = t.nav[item.labelKey as keyof typeof t.nav] || item.labelKey;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-sidebar-active text-white' : 'text-sidebar-text hover:bg-white/5 hover:text-white'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

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
            {t.nav.signOut}
          </button>
        </div>
      </aside>

      <div className="ml-56 flex-1 flex flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-surface px-6">
          <h2 className="text-sm font-medium text-foreground">
            {(() => {
              const current = navItems.find((i) => pathname === i.href || pathname.startsWith(i.href + '/'));
              return current ? (t.nav[current.labelKey as keyof typeof t.nav] || current.labelKey) : 'Portal';
            })()}
          </h2>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span>{session.user?.email}</span>
          </div>
        </header>
        <main className="flex-1 p-6 bg-background">{children}</main>
      </div>
    </div>
  );
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <PortalI18nProvider>
      <PortalLayoutInner>{children}</PortalLayoutInner>
    </PortalI18nProvider>
  );
}
