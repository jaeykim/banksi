# banksi

Crypto payment module for vibe coders. Add USDT/USDC payments to any app in one prompt.

## Install

```bash
npm install banksi
```

## Environment Variables

```env
BANKSI_API_KEY=bks_your_key_here   # from banksi.io/merchant/settings
BANKSI_URL=https://banksi.io       # optional, defaults to https://banksi.io
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

## Links

- [Docs](https://banksi.io/docs)
- [Dashboard](https://banksi.io/merchant)
- [Demo](https://banksi.io/examples/cafe)
