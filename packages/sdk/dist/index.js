"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  BanksiClient: () => BanksiClient,
  createBanksiPaywall: () => createBanksiPaywall
});
module.exports = __toCommonJS(src_exports);

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

// src/next.ts
function createBanksiPaywall(config) {
  const client = new BanksiClient(config);
  return async function paywall(request) {
    const paymentId = request.headers.get("X-Payment");
    if (paymentId) {
      try {
        const confirmed = await client.isPaymentConfirmed(paymentId);
        if (confirmed) return null;
      } catch {
      }
    }
    const chains = await client.listChains();
    const banksiUrl = config.baseUrl || process.env.BANKSI_URL || "http://localhost:3001";
    const merchantSlug = config.merchantSlug || process.env.BANKSI_MERCHANT_SLUG || "";
    return Response.json(
      {
        status: 402,
        paymentRequired: {
          scheme: "x402",
          description: config.description || "Payment required.",
          merchant: merchantSlug,
          amount: config.amount,
          currency: "USD",
          chains: chains.map((c) => ({
            id: c.id,
            name: c.name,
            tokens: c.tokens.map((t) => ({ id: t.id, symbol: t.symbol }))
          })),
          payUrl: `${banksiUrl}/api/x402/pay`,
          howToPay: [
            `POST ${banksiUrl}/api/x402/pay with { "merchantSlug": "${merchantSlug}", "chainId": "<chain>", "tokenId": "<token>", "amount": ${config.amount} }`,
            "Send the stablecoin to the returned address.",
            "Retry with header: X-Payment: <paymentId>"
          ]
        }
      },
      { status: 402 }
    );
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BanksiClient,
  createBanksiPaywall
});
