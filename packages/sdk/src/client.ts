export interface BanksiConfig {
  /** Banksi instance URL */
  baseUrl: string;
  /** Merchant store slug (optional if apiKey is set) */
  merchantSlug?: string;
  /** API key from banksi.io dashboard (bks_xxx) */
  apiKey?: string;
}

export interface PaymentResult {
  paymentId: string;
  address: string;
  amountExpected: string;
  tokenSymbol: string;
  chainName: string;
  expiresAt: string;
}

export interface PaymentStatus {
  id: string;
  status: 'PENDING' | 'CONFIRMING' | 'CONFIRMED' | 'SWEPT' | 'EXPIRED' | 'FAILED';
  txHash: string | null;
  amountReceived: string | null;
  paidAt: string | null;
}

export interface Chain {
  id: string;
  name: string;
  tokens: { id: string; symbol: string; name: string }[];
}

function tryEnv(key: string): string | undefined {
  try { return typeof process !== 'undefined' ? process.env?.[key] : undefined; } catch { return undefined; }
}

function getConfig(override?: Partial<BanksiConfig>): BanksiConfig {
  return {
    baseUrl: override?.baseUrl || tryEnv('NEXT_PUBLIC_BANKSI_URL') || tryEnv('BANKSI_URL') || 'https://banksi.vercel.app',
    merchantSlug: override?.merchantSlug || tryEnv('NEXT_PUBLIC_BANKSI_MERCHANT_SLUG') || tryEnv('BANKSI_MERCHANT_SLUG') || undefined,
    apiKey: override?.apiKey || tryEnv('NEXT_PUBLIC_BANKSI_API_KEY') || tryEnv('BANKSI_API_KEY') || undefined,
  };
}

export class BanksiClient {
  private baseUrl: string;
  private merchantSlug?: string;
  private apiKey?: string;

  constructor(config?: Partial<BanksiConfig>) {
    const c = getConfig(config);
    this.baseUrl = c.baseUrl.replace(/\/$/, '');
    this.merchantSlug = c.merchantSlug;
    this.apiKey = c.apiKey;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`;
    return h;
  }

  async listChains(): Promise<Chain[]> {
    const res = await fetch(`${this.baseUrl}/api/chains`);
    if (!res.ok) throw new Error(`Banksi API error: ${res.status}`);
    const data = await res.json();
    return data.chains;
  }

  async createPayment(opts: {
    chainId: string;
    tokenId: string;
    amount: number;
    merchantSlug?: string;
  }): Promise<PaymentResult> {
    const body: Record<string, unknown> = {
      chainId: opts.chainId,
      tokenId: opts.tokenId,
      amount: opts.amount,
    };
    // Only include merchantSlug if no API key (API key resolves merchant server-side)
    if (!this.apiKey) {
      body.merchantSlug = opts.merchantSlug || this.merchantSlug;
    }

    const res = await fetch(`${this.baseUrl}/api/x402/pay`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Banksi API error: ${res.status}`);
    }
    return res.json();
  }

  async verifyPayment(paymentId: string): Promise<PaymentStatus> {
    const res = await fetch(`${this.baseUrl}/api/payments/${paymentId}/status`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Banksi API error: ${res.status}`);
    return res.json();
  }

  async isPaymentConfirmed(paymentId: string): Promise<boolean> {
    const status = await this.verifyPayment(paymentId);
    return ['CONFIRMED', 'SWEPT'].includes(status.status);
  }
}
