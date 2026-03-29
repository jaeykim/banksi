import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { prisma } from '@/lib/prisma';
import { createMerchantWithWallet } from '@/lib/merchants/create';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: 'idToken is required' }, { status: 400 });
    }

    // Verify Firebase token
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const { uid, email, name: firebaseName } = decoded;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { firebaseUid: uid },
      include: { merchant: { select: { id: true, slug: true, apiKey: true } } },
    });

    let isNewUser = false;
    let apiKey: string | null = null;

    if (!user) {
      // Check if email already exists (migrated from password auth)
      const existingByEmail = await prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        // Link Firebase to existing account
        await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { firebaseUid: uid, name: existingByEmail.name || firebaseName },
        });
        user = await prisma.user.findUnique({
          where: { id: existingByEmail.id },
          include: { merchant: { select: { id: true, slug: true, apiKey: true } } },
        });
      } else {
        // New user — create merchant + wallet + API key
        isNewUser = true;
        const merchantName = firebaseName || email.split('@')[0];
        const result = await createMerchantWithWallet({
          name: merchantName,
          userEmail: email,
          userName: firebaseName || undefined,
          firebaseUid: uid,
        });
        apiKey = result.apiKey;

        user = await prisma.user.findUnique({
          where: { firebaseUid: uid },
          include: { merchant: { select: { id: true, slug: true, apiKey: true } } },
        });
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Set cookies
    const cookieStore = await cookies();
    cookieStore.set('firebase-token', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    // Lightweight session cookie for middleware
    cookieStore.set('firebase-session', JSON.stringify({
      role: user.role,
      merchantId: user.merchantId,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        merchantId: user.merchantId,
        merchantSlug: user.merchant?.slug,
      },
      isNewUser,
      apiKey,
    });
  } catch (error) {
    console.error('Firebase session error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}

// DELETE — sign out (clear cookies)
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set('firebase-token', '', { maxAge: 0, path: '/' });
  cookieStore.set('firebase-session', '', { maxAge: 0, path: '/' });
  return NextResponse.json({ ok: true });
}
