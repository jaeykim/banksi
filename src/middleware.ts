import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { defaultLocale, locales, LOCALE_COOKIE, type Locale } from '@/i18n/config';

function detectLocale(request: NextRequest): Locale {
  const acceptLang = request.headers.get('accept-language') || '';
  for (const part of acceptLang.split(',')) {
    const lang = part.split(';')[0].trim().substring(0, 2).toLowerCase();
    if ((locales as readonly string[]).includes(lang)) {
      return lang as Locale;
    }
  }
  return defaultLocale;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Locale detection & cookie persistence ──────────
  const localeCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  let localeResponse: NextResponse | null = null;

  if (!localeCookie || !(locales as readonly string[]).includes(localeCookie)) {
    const detected = detectLocale(request);
    localeResponse = NextResponse.next();
    localeResponse.cookies.set(LOCALE_COOKIE, detected, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  // Helper: return response with locale cookie if needed
  function respond(res?: NextResponse) {
    if (localeResponse) return localeResponse;
    return res ?? NextResponse.next();
  }

  // ─── Public routes — no auth required ───────────────
  if (
    pathname.startsWith('/pay/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/chains') ||
    pathname.startsWith('/api/store/') ||
    pathname.startsWith('/api/payments/') ||
    pathname.startsWith('/api/upload') ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/api/x402/') ||
    pathname.startsWith('/store/') ||
    pathname.startsWith('/docs') ||
    pathname.startsWith('/examples') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/'
  ) {
    return respond();
  }

  // Read Firebase session cookie
  const sessionCookie = request.cookies.get('firebase-session')?.value;

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    const redirectRes = NextResponse.redirect(loginUrl);
    if (localeResponse) {
      redirectRes.cookies.set(LOCALE_COOKIE, localeResponse.cookies.get(LOCALE_COOKIE)!.value, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }
    return redirectRes;
  }

  let role = 'USER';
  try {
    const session = JSON.parse(sessionCookie);
    role = session.role || 'USER';
  } catch { /* invalid cookie, treat as USER */ }

  // Merchant routes — require MERCHANT or ADMIN role
  if (pathname.startsWith('/merchant')) {
    if (role !== 'MERCHANT' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Admin routes — require ADMIN role
  if (pathname.startsWith('/admin')) {
    if (role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return respond();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/|uploads/).*)'],
};
