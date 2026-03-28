import { B as BanksiConfig } from './client-jLNKFIPq.mjs';
export { a as BanksiClient } from './client-jLNKFIPq.mjs';

interface PaywallConfig extends Partial<BanksiConfig> {
    amount: number;
    description?: string;
}
/**
 * Next.js App Router paywall middleware.
 *
 * Usage in a route handler:
 * ```ts
 * import { createBanksiPaywall } from 'banksi/next';
 * const paywall = createBanksiPaywall({ amount: 0.10, description: 'Premium API' });
 *
 * export async function GET(request: NextRequest) {
 *   const blocked = await paywall(request);
 *   if (blocked) return blocked;
 *   return NextResponse.json({ data: 'premium content' });
 * }
 * ```
 */
declare function createBanksiPaywall(config: PaywallConfig): (request: Request) => Promise<Response | null>;

export { createBanksiPaywall };
