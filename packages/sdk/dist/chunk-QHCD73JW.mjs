import {
  BanksiClient
} from "./chunk-7MKH6B3K.mjs";

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

export {
  createBanksiPaywall
};
