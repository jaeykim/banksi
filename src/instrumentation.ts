export async function register() {
  // Only run daemon in self-hosted mode (Vercel uses cron jobs instead)
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.VERCEL) {
    const { startDaemon } = await import('@/lib/daemon');
    await startDaemon();
  }
}
