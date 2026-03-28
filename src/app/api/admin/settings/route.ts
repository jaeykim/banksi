import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_KEYS = [
  'sweep_fee_percent',
  'sweep_fee_address',
  'auto_sweep_enabled',
  'auto_sweep_interval_minutes',
  'payment_expiry_minutes',
  'required_confirmations',
];

// GET /api/admin/settings — List all system settings
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await prisma.systemSetting.findMany();

    // Return as key-value map, filling in defaults for missing keys
    const defaults: Record<string, string> = {
      sweep_fee_percent: '0',
      sweep_fee_address: '',
      auto_sweep_enabled: 'false',
      auto_sweep_interval_minutes: '10',
      payment_expiry_minutes: '30',
      required_confirmations: '3',
    };

    const result: Record<string, string> = { ...defaults };
    for (const s of settings) {
      result[s.key] = s.value;
    }

    return NextResponse.json({ settings: result });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}

// PUT /api/admin/settings — Update settings (partial update)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updates = body.settings as Record<string, string>;

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'settings object is required.' }, { status: 400 });
    }

    // Validate keys
    for (const key of Object.keys(updates)) {
      if (!ALLOWED_KEYS.includes(key)) {
        return NextResponse.json({ error: `Unknown setting: ${key}` }, { status: 400 });
      }
    }

    // Validate values
    if (updates.sweep_fee_percent !== undefined) {
      const fee = parseFloat(updates.sweep_fee_percent);
      if (isNaN(fee) || fee < 0 || fee > 100) {
        return NextResponse.json({ error: 'sweep_fee_percent must be between 0 and 100.' }, { status: 400 });
      }
    }

    if (updates.auto_sweep_interval_minutes !== undefined) {
      const interval = parseInt(updates.auto_sweep_interval_minutes);
      if (isNaN(interval) || interval < 1) {
        return NextResponse.json({ error: 'auto_sweep_interval_minutes must be at least 1.' }, { status: 400 });
      }
    }

    if (updates.required_confirmations !== undefined) {
      const conf = parseInt(updates.required_confirmations);
      if (isNaN(conf) || conf < 1) {
        return NextResponse.json({ error: 'required_confirmations must be at least 1.' }, { status: 400 });
      }
    }

    // Upsert each setting
    const results = await prisma.$transaction(
      Object.entries(updates).map(([key, value]) =>
        prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    return NextResponse.json({ updated: results.length });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
