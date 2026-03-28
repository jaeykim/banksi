import { BanksiClient, type BanksiConfig } from './client';

// Minimal Express types to avoid requiring @types/express
type Request = { headers: Record<string, string | string[] | undefined> };
type Response = { status(code: number): Response; json(body: unknown): void };
type NextFunction = () => void;

interface PaywallConfig extends Partial<BanksiConfig> {
  amount: number;
  description?: string;
}

/**
 * Express paywall middleware.
 *
 * Usage:
 * ```ts
 * import { createBanksiPaywall } from 'banksi/express';
 * app.use('/api/premium', createBanksiPaywall({ amount: 0.10 }));
 * ```
 */
export function createBanksiPaywall(config: PaywallConfig) {
  const client = new BanksiClient(config);

  return async function paywall(req: Request, res: Response, next: NextFunction) {
    const paymentId = req.headers['x-payment'] as string | undefined;

    if (paymentId) {
      try {
        const confirmed = await client.isPaymentConfirmed(paymentId);
        if (confirmed) return next();
      } catch {
        // fall through
      }
    }

    const chains = await client.listChains();
    const banksiUrl = config.baseUrl || process.env.BANKSI_URL || 'https://banksi.vercel.app';
    const merchantSlug = config.merchantSlug || process.env.BANKSI_MERCHANT_SLUG || '';

    res.status(402).json({
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
    });
  };
}

export { BanksiClient } from './client';
