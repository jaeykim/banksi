import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DOCS = `# Banksi — Crypto Payment Module for Vibe Coders

Add USDT/USDC payments to any app in one prompt.
Homepage: https://banksi.vercel.app
npm: https://www.npmjs.com/package/banksi

## Quick Start

\`\`\`bash
npm install banksi
\`\`\`

Set environment variable:
\`\`\`
BANKSI_API_KEY=bks_your_key_here
\`\`\`

Get your API key: https://banksi.vercel.app/register

## Next.js — Paywall Middleware

\`\`\`typescript
// app/api/premium/route.ts
import { createBanksiPaywall } from 'banksi/next';

const paywall = createBanksiPaywall({ amount: 0.10 });

export async function GET(request: Request) {
  const blocked = await paywall(request);
  if (blocked) return blocked; // Returns 402 with payment instructions
  return Response.json({ data: 'premium content' });
}
\`\`\`

## Express — Paywall Middleware

\`\`\`typescript
import { createBanksiPaywall } from 'banksi/express';
app.use('/api/premium', createBanksiPaywall({ amount: 0.10 }));
\`\`\`

## React — Pay Button Component

\`\`\`tsx
import { BanksiPayButton } from 'banksi/react';

<BanksiPayButton
  amount={4.50}
  onPaymentConfirmed={(id) => {
    console.log('Payment confirmed:', id);
    // Grant access, deliver product, etc.
  }}
/>
\`\`\`

The component renders a button. When clicked, it shows chain/token selection,
generates a unique deposit address, displays QR code, and polls for on-chain confirmation.

## BanksiClient — Programmatic API

\`\`\`typescript
import { BanksiClient } from 'banksi';

const client = new BanksiClient();
// Reads BANKSI_API_KEY and BANKSI_URL from env automatically

// List supported chains and tokens
const chains = await client.listChains();

// Create a payment
const payment = await client.createPayment({
  chainId: 'arbitrum',
  tokenId: 'token-id-from-listChains',
  amount: 4.50,
});
// Returns: { paymentId, address, amountExpected, tokenSymbol, chainName, expiresAt }

// Check payment status
const status = await client.verifyPayment(payment.paymentId);
// Returns: { id, status, txHash, amountReceived, paidAt }
// status: PENDING → CONFIRMING → CONFIRMED → SWEPT

// Boolean check
const paid = await client.isPaymentConfirmed(payment.paymentId);
\`\`\`

## Configuration

| Env Variable | Default | Description |
|---|---|---|
| BANKSI_API_KEY | (required) | API key from dashboard |
| BANKSI_URL | https://banksi.vercel.app | Banksi instance URL |

Or pass config directly:
\`\`\`typescript
const client = new BanksiClient({
  apiKey: 'bks_xxx',
  baseUrl: 'https://banksi.vercel.app',
});

const paywall = createBanksiPaywall({
  amount: 0.10,
  apiKey: 'bks_xxx',
  baseUrl: 'https://banksi.vercel.app',
});
\`\`\`

## How x402 Paywall Works

1. Client calls your API endpoint
2. Middleware checks for X-Payment header
3. If missing → returns 402 with payment instructions (chains, tokens, payUrl)
4. Client creates payment via Banksi API, sends stablecoin on-chain
5. Client retries with header: X-Payment: <paymentId>
6. Middleware verifies payment on-chain → returns content

## Supported Chains & Tokens

- Ethereum (USDT, USDC)
- Arbitrum (USDT, USDC)
- BNB Smart Chain (USDT, USDC)
- Tron (USDT, USDC)
- Solana (USDT, USDC)

## Product-Based Payments

Instead of x402 paywalls, you can create products in the Banksi dashboard
and link to their payment pages:

Payment URL format: https://banksi.vercel.app/pay/select/{your-slug}/{productId}

Embed options:
- Direct link / redirect
- HTML button: <a href="payment-url">Pay $4.50</a>
- React component: <BanksiPayButton amount={4.50} />
- iframe: <iframe src="payment-url" width="450" height="700" />

## Getting Started

1. Sign up: https://banksi.vercel.app/register
2. Get API key from dashboard: https://banksi.vercel.app/merchant/settings
3. npm install banksi
4. Add BANKSI_API_KEY to .env
5. Use createBanksiPaywall() or BanksiPayButton in your app
6. View payments: https://banksi.vercel.app/merchant

## Pricing

0.5% per successful transaction. No monthly fees. Deducted during fund settlement.
`;

export async function GET() {
  return new NextResponse(DOCS, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
