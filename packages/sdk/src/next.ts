import { BanksiClient, type BanksiConfig } from './client';

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
export function createBanksiPaywall(config: PaywallConfig) {
  const client = new BanksiClient(config);

  return async function paywall(request: Request): Promise<Response | null> {
    const paymentId = request.headers.get('X-Payment');

    if (paymentId) {
      try {
        const confirmed = await client.isPaymentConfirmed(paymentId);
        if (confirmed) return null; // Payment verified, proceed
      } catch {
        // Verification failed, fall through to 402
      }
    }

    const chains = await client.listChains();
    const banksiUrl = config.baseUrl || process.env.BANKSI_URL || 'https://banksi.vercel.app';
    const merchantSlug = config.merchantSlug || process.env.BANKSI_MERCHANT_SLUG || '';

    return Response.json(
      {
        status: 402,
        paymentRequired: {
          scheme: 'x402',
          description: config.description || 'Payment required.',
          merchant: merchantSlug,
          amount: config.amount,
          currency: 'USD',
          chains: chains.map((c) => ({
            id: c.id,
            name: c.name,
            tokens: c.tokens.map((t) => ({ id: t.id, symbol: t.symbol })),
          })),
          payUrl: `${banksiUrl}/api/x402/pay`,
          howToPay: [
            `POST ${banksiUrl}/api/x402/pay with { "merchantSlug": "${merchantSlug}", "chainId": "<chain>", "tokenId": "<token>", "amount": ${config.amount} }`,
            'Send the stablecoin to the returned address.',
            'Retry with header: X-Payment: <paymentId>',
          ],
        },
      },
      { status: 402 }
    );
  };
}

export { BanksiClient } from './client';
