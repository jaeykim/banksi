import { hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createMerchantWithWallet } from '@/lib/merchants/create';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, projectName } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);
    const merchantName = projectName || name;

    // Create merchant + HD wallet + API key + user in one transaction
    const { merchant, apiKey } = await createMerchantWithWallet({
      name: merchantName,
      userEmail: email.toLowerCase(),
      userPasswordHash: passwordHash,
      userName: name,
    });

    return NextResponse.json({
      message: 'Account created successfully.',
      merchantId: merchant.id,
      merchantSlug: merchant.slug,
      apiKey,
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}
