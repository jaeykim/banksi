import { prisma } from '@/lib/prisma';
import { monitorPendingPayments } from '@/lib/payments/monitor';
import { sweepAllConfirmed } from '@/lib/payments/sweep';

let started = false;
let monitorInterval: ReturnType<typeof setInterval> | null = null;
let sweepInterval: ReturnType<typeof setInterval> | null = null;

const MONITOR_INTERVAL_MS = 15_000; // 15s — check for incoming payments

async function runMonitor() {
  try {
    const result = await monitorPendingPayments();
    if (result.confirmed > 0 || result.expired > 0) {
      console.log(
        `[daemon/monitor] checked=${result.checked} confirmed=${result.confirmed} expired=${result.expired} errors=${result.errors.length}`
      );
    }
  } catch (err) {
    console.error('[daemon/monitor] error:', err);
  }
}

async function runSweep() {
  try {
    // Check if auto sweep is enabled
    const enabled = await prisma.systemSetting.findUnique({
      where: { key: 'auto_sweep_enabled' },
    });
    if (enabled?.value !== 'true') return;

    const result = await sweepAllConfirmed();
    if (result.swept > 0 || result.failed > 0) {
      console.log(
        `[daemon/sweep] swept=${result.swept} failed=${result.failed}`
      );
    }
  } catch (err) {
    console.error('[daemon/sweep] error:', err);
  }
}

async function getSweepIntervalMs(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'auto_sweep_interval_minutes' },
  });
  const minutes = setting ? parseInt(setting.value) : 10;
  return Math.max(1, minutes) * 60_000;
}

/**
 * Start the background daemon. Safe to call multiple times — only starts once.
 */
export async function startDaemon() {
  if (started) return;
  started = true;

  console.log('[daemon] Starting background monitor & sweep daemon');

  // Monitor runs on a fixed 15s interval
  monitorInterval = setInterval(runMonitor, MONITOR_INTERVAL_MS);

  // Sweep interval is configurable via DB settings
  const sweepMs = await getSweepIntervalMs();
  sweepInterval = setInterval(runSweep, sweepMs);

  // Also run once immediately
  runMonitor();
  runSweep();

  // Periodically re-read sweep interval setting and restart if changed
  setInterval(async () => {
    const newMs = await getSweepIntervalMs();
    if (sweepInterval) {
      clearInterval(sweepInterval);
    }
    sweepInterval = setInterval(runSweep, newMs);
  }, 5 * 60_000); // re-check every 5 minutes
}

export function stopDaemon() {
  if (monitorInterval) clearInterval(monitorInterval);
  if (sweepInterval) clearInterval(sweepInterval);
  started = false;
  console.log('[daemon] Stopped');
}
