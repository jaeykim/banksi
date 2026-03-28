// src/client.ts
function getConfig(override) {
  return {
    baseUrl: override?.baseUrl || process.env.BANKSI_URL || "https://banksi.io",
    merchantSlug: override?.merchantSlug || process.env.BANKSI_MERCHANT_SLUG || void 0,
    apiKey: override?.apiKey || process.env.BANKSI_API_KEY || void 0
  };
}
var BanksiClient = class {
  constructor(config) {
    const c = getConfig(config);
    this.baseUrl = c.baseUrl.replace(/\/$/, "");
    this.merchantSlug = c.merchantSlug;
    this.apiKey = c.apiKey;
  }
  headers() {
    const h = { "Content-Type": "application/json" };
    if (this.apiKey) h["Authorization"] = `Bearer ${this.apiKey}`;
    return h;
  }
  async listChains() {
    const res = await fetch(`${this.baseUrl}/api/chains`);
    if (!res.ok) throw new Error(`Banksi API error: ${res.status}`);
    const data = await res.json();
    return data.chains;
  }
  async createPayment(opts) {
    const body = {
      chainId: opts.chainId,
      tokenId: opts.tokenId,
      amount: opts.amount
    };
    if (!this.apiKey) {
      body.merchantSlug = opts.merchantSlug || this.merchantSlug;
    }
    const res = await fetch(`${this.baseUrl}/api/x402/pay`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Banksi API error: ${res.status}`);
    }
    return res.json();
  }
  async verifyPayment(paymentId) {
    const res = await fetch(`${this.baseUrl}/api/payments/${paymentId}/status`, {
      headers: this.headers()
    });
    if (!res.ok) throw new Error(`Banksi API error: ${res.status}`);
    return res.json();
  }
  async isPaymentConfirmed(paymentId) {
    const status = await this.verifyPayment(paymentId);
    return ["CONFIRMED", "SWEPT"].includes(status.status);
  }
};

export {
  BanksiClient
};
