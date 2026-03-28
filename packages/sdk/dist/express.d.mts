import { B as BanksiConfig } from './client-jLNKFIPq.mjs';
export { a as BanksiClient } from './client-jLNKFIPq.mjs';

type Request = {
    headers: Record<string, string | string[] | undefined>;
};
type Response = {
    status(code: number): Response;
    json(body: unknown): void;
};
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
declare function createBanksiPaywall(config: PaywallConfig): (req: Request, res: Response, next: NextFunction) => Promise<void>;

export { createBanksiPaywall };
