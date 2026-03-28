# banksi

Crypto payment module for vibe coders. Add USDT/USDC payments to any app in one prompt.

## Install

```bash
npm install banksi
```

## Environment Variables

```env
BANKSI_API_KEY=bks_your_key_here   # from banksi.vercel.app/merchant/settings
BANKSI_URL=https://banksi.vercel.app       # optional, defaults to https://banksi.vercel.app
```

## Next.js — Paywall Middleware

```typescript
// app/api/premium/route.ts
import { createBanksiPaywall } from 'banksi/next';

const paywall = createBanksiPaywall({ amount: 0.10 });

export async function GET(request: Request) {
  const blocked = await paywall(request);
  if (blocked) return blocked; // 402 + payment instructions
  return Response.json({ data: 'premium content' });
}
```

## Express — Paywall Middleware

```typescript
import { createBanksiPaywall } from 'banksi/express';

app.use('/api/premium', createBanksiPaywall({ amount: 0.10 }));
```

## React — Pay Button

```tsx
import { BanksiPayButton } from 'banksi/react';

<BanksiPayButton
  amount={4.50}
  onPaymentConfirmed={(id) => console.log('Paid!', id)}
/>
```

## Client API

```typescript
import { BanksiClient } from 'banksi';

const client = new BanksiClient();

const chains = await client.listChains();
const payment = await client.createPayment({ chainId: 'arbitrum', tokenId: '...', amount: 4.50 });
const status = await client.verifyPayment(payment.paymentId);
const confirmed = await client.isPaymentConfirmed(payment.paymentId);
```

## MCP Server

AI agents can integrate Banksi using the MCP server:

```json
{
  "mcpServers": {
    "banksi": {
      "command": "npx",
      "args": ["banksi-mcp"]
    }
  }
}
```

## Using with AI (Claude Code, Cursor, etc.)

Just tell your AI agent:

```
npm install banksi 하고 https://banksi.vercel.app/api/docs 문서를 읽고 크립토 결제를 붙여줘
```

Or in English:

```
Install banksi and read https://banksi.vercel.app/api/docs to add crypto payments
```

The AI agent will read the plain-text docs and generate the integration code.

## Links

- [Docs](https://banksi.vercel.app/docs)
- [Docs (plain text for AI)](https://banksi.vercel.app/api/docs)
- [Dashboard](https://banksi.vercel.app/merchant)
- [Demo](https://banksi.vercel.app/examples/cafe)
- [Register](https://banksi.vercel.app/register)
