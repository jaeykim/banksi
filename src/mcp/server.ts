import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const server = new McpServer({
  name: 'banksi',
  version: '0.1.0',
});

// ─── list_chains ───────────────────────────────────

server.tool(
  'list_chains',
  'List all supported blockchains and their tokens (USDT/USDC)',
  {},
  async () => {
    const chains = await prisma.chain.findMany({
      where: { isActive: true },
      include: {
        tokens: {
          where: { isActive: true },
          select: { id: true, symbol: true, name: true, decimals: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return { content: [{ type: 'text', text: JSON.stringify(chains, null, 2) }] };
  }
);

// ─── get_store ─────────────────────────────────────

server.tool(
  'get_store',
  'Get merchant store info and product catalog by store slug',
  { slug: z.string().describe('Store slug, e.g. "seoul-coffee"') },
  async ({ slug }) => {
    const merchant = await prisma.merchant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, storeDescription: true, storeBannerColor: true, storeIsPublic: true, isActive: true },
    });
    if (!merchant || !merchant.isActive || !merchant.storeIsPublic) {
      return { content: [{ type: 'text', text: `Store "${slug}" not found or unavailable.` }] };
    }
    const products = await prisma.product.findMany({
      where: { merchantId: merchant.id, isActive: true },
      select: { id: true, name: true, description: true, priceUsd: true, imageUrl: true },
      orderBy: { name: 'asc' },
    });
    return { content: [{ type: 'text', text: JSON.stringify({ merchant, products }, null, 2) }] };
  }
);

// ─── create_payment ────────────────────────────────

server.tool(
  'create_payment',
  'Create a crypto payment for a product. Returns a deposit address and payment ID.',
  {
    slug: z.string().describe('Store slug'),
    productId: z.string().describe('Product ID to pay for'),
    chainId: z.string().describe('Blockchain chain ID (e.g. "ethereum", "arbitrum", "tron", "solana")'),
    tokenId: z.string().describe('Token ID from list_chains'),
  },
  async ({ slug, productId, chainId, tokenId }) => {
    const merchant = await prisma.merchant.findUnique({ where: { slug }, select: { id: true, isActive: true, storeIsPublic: true } });
    if (!merchant || !merchant.isActive || !merchant.storeIsPublic) {
      return { content: [{ type: 'text', text: `Store "${slug}" not found.` }] };
    }
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.merchantId !== merchant.id || !product.isActive) {
      return { content: [{ type: 'text', text: `Product "${productId}" not found.` }] };
    }
    const token = await prisma.token.findUnique({ where: { id: tokenId } });
    if (!token || !token.isActive) {
      return { content: [{ type: 'text', text: `Token "${tokenId}" not found.` }] };
    }

    // Dynamically import createPayment to avoid bundling issues
    const { createPayment } = await import('../lib/payments/create');
    const result = await createPayment({
      merchantId: merchant.id,
      productId: product.id,
      chainId,
      tokenId,
      fiatAmount: product.priceUsd,
      currency: 'USD',
      amountExpected: product.priceUsd.toString(),
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          paymentId: result.paymentId,
          address: result.address,
          amountExpected: result.amountExpected,
          tokenSymbol: result.tokenSymbol,
          chainName: result.chainName,
          expiresAt: result.expiresAt,
          paymentUrl: `/pay/${result.paymentId}`,
        }, null, 2),
      }],
    };
  }
);

// ─── get_payment ───────────────────────────────────

server.tool(
  'get_payment',
  'Get full details of a payment including status, address, amounts',
  { paymentId: z.string().describe('Payment ID') },
  async ({ paymentId }) => {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        chain: { select: { id: true, name: true } },
        token: { select: { id: true, symbol: true, name: true } },
        derivedAddress: { select: { address: true, derivationPath: true } },
        merchant: { select: { name: true, slug: true } },
        product: { select: { name: true, priceUsd: true } },
      },
    });
    if (!payment) {
      return { content: [{ type: 'text', text: `Payment "${paymentId}" not found.` }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify(payment, null, 2) }] };
  }
);

// ─── check_payment_status ──────────────────────────

server.tool(
  'check_payment_status',
  'Check the current on-chain status of a payment (PENDING, CONFIRMING, CONFIRMED, EXPIRED, SWEPT)',
  { paymentId: z.string().describe('Payment ID') },
  async ({ paymentId }) => {
    const { checkPaymentStatus } = await import('../lib/payments/monitor');
    try {
      const result = await checkPaymentStatus(paymentId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }] };
    }
  }
);

// ─── x402_pay ──────────────────────────────────────

server.tool(
  'x402_pay',
  'Create a payment for an x402 (HTTP 402) paywall. Use this when an API returns 402 Payment Required.',
  {
    merchantSlug: z.string().describe('Merchant slug from the 402 response'),
    chainId: z.string().describe('Chain to pay on'),
    tokenId: z.string().describe('Token to pay with'),
    amount: z.number().describe('Amount in USD'),
  },
  async ({ merchantSlug, chainId, tokenId, amount }) => {
    const merchant = await prisma.merchant.findUnique({ where: { slug: merchantSlug }, select: { id: true } });
    if (!merchant) {
      return { content: [{ type: 'text', text: `Merchant "${merchantSlug}" not found.` }] };
    }
    const { createPayment } = await import('../lib/payments/create');
    const result = await createPayment({
      merchantId: merchant.id,
      chainId,
      tokenId,
      fiatAmount: amount,
      currency: 'USD',
      amountExpected: amount.toString(),
      metadata: JSON.stringify({ type: 'x402' }),
    });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          paymentId: result.paymentId,
          address: result.address,
          amountExpected: result.amountExpected,
          expiresAt: result.expiresAt,
          instruction: `Send ${result.amountExpected} ${result.tokenSymbol} to ${result.address}. Then retry the original request with header "X-Payment: ${result.paymentId}".`,
        }, null, 2),
      }],
    };
  }
);

// ─── Product & Payment Link Tools ──────────────────

server.tool(
  'create_product',
  'Create a product in a Banksi store. Returns the product ID and payment link that you can embed in any app.',
  {
    slug: z.string().describe('Store slug'),
    name: z.string().describe('Product name'),
    priceUsd: z.number().describe('Price in USD'),
    description: z.string().optional().describe('Product description'),
  },
  async ({ slug, name, priceUsd, description }) => {
    const merchant = await prisma.merchant.findUnique({ where: { slug }, select: { id: true, slug: true } });
    if (!merchant) return { content: [{ type: 'text', text: `Store "${slug}" not found.` }] };

    const product = await prisma.product.create({
      data: { merchantId: merchant.id, name, priceUsd, description: description || null },
    });

    const baseUrl = process.env.BANKSI_URL || 'https://banksi.vercel.app';
    const paymentLink = `${baseUrl}/pay/select/${merchant.slug}/${product.id}`;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          productId: product.id,
          name: product.name,
          priceUsd: product.priceUsd,
          paymentLink,
          embedHtml: `<a href="${paymentLink}" style="display:inline-block;padding:10px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Pay $${priceUsd.toFixed(2)} with Crypto</a>`,
          embedReact: `<BanksiPayButton amount={${priceUsd}} merchantSlug="${slug}" onPaymentConfirmed={(id) => console.log('Paid!', id)} />`,
          embedIframe: `<iframe src="${paymentLink}" width="450" height="700" style="border:none;border-radius:12px"></iframe>`,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'list_products',
  'List all products in a Banksi store with their payment links.',
  { slug: z.string().describe('Store slug') },
  async ({ slug }) => {
    const merchant = await prisma.merchant.findUnique({ where: { slug }, select: { id: true, slug: true, name: true } });
    if (!merchant) return { content: [{ type: 'text', text: `Store "${slug}" not found.` }] };

    const products = await prisma.product.findMany({
      where: { merchantId: merchant.id, isActive: true },
      select: { id: true, name: true, description: true, priceUsd: true, imageUrl: true },
      orderBy: { name: 'asc' },
    });

    const baseUrl = process.env.BANKSI_URL || 'https://banksi.vercel.app';
    const result = products.map((p) => ({
      ...p,
      paymentLink: `${baseUrl}/pay/select/${merchant.slug}/${p.id}`,
    }));

    return { content: [{ type: 'text', text: JSON.stringify({ merchant: merchant.name, products: result }, null, 2) }] };
  }
);

server.tool(
  'get_payment_link',
  'Get the payment link and embed code for an existing product. Use this to integrate a specific product payment into an app.',
  {
    slug: z.string().describe('Store slug'),
    productId: z.string().describe('Product ID'),
  },
  async ({ slug, productId }) => {
    const merchant = await prisma.merchant.findUnique({ where: { slug }, select: { id: true, slug: true } });
    if (!merchant) return { content: [{ type: 'text', text: `Store "${slug}" not found.` }] };

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.merchantId !== merchant.id) return { content: [{ type: 'text', text: `Product "${productId}" not found.` }] };

    const baseUrl = process.env.BANKSI_URL || 'https://banksi.vercel.app';
    const paymentLink = `${baseUrl}/pay/select/${merchant.slug}/${product.id}`;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          product: { id: product.id, name: product.name, priceUsd: product.priceUsd },
          paymentLink,
          integration: {
            redirect: `window.location.href = '${paymentLink}';`,
            htmlButton: `<a href="${paymentLink}" style="display:inline-block;padding:10px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Pay $${product.priceUsd.toFixed(2)}</a>`,
            reactComponent: `<BanksiPayButton amount={${product.priceUsd}} merchantSlug="${slug}" onPaymentConfirmed={(id) => { /* handle success */ }} />`,
            nextjsRedirect: `import { redirect } from 'next/navigation';\nredirect('${paymentLink}');`,
            iframe: `<iframe src="${paymentLink}" width="450" height="700" style="border:none;border-radius:12px"></iframe>`,
          },
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'update_product',
  'Update an existing product (name, price, description).',
  {
    slug: z.string().describe('Store slug'),
    productId: z.string().describe('Product ID'),
    name: z.string().optional().describe('New product name'),
    priceUsd: z.number().optional().describe('New price in USD'),
    description: z.string().optional().describe('New description'),
  },
  async ({ slug, productId, name, priceUsd, description }) => {
    const merchant = await prisma.merchant.findUnique({ where: { slug }, select: { id: true } });
    if (!merchant) return { content: [{ type: 'text', text: `Store "${slug}" not found.` }] };

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.merchantId !== merchant.id) return { content: [{ type: 'text', text: `Product "${productId}" not found.` }] };

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (priceUsd !== undefined) data.priceUsd = priceUsd;
    if (description !== undefined) data.description = description;

    const updated = await prisma.product.update({ where: { id: productId }, data });
    return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
  }
);

// ─── Integration Tools (for vibe coders) ───────────

server.tool(
  'get_integration_guide',
  'Get a step-by-step guide to add Banksi crypto payments to a project. Use this when a user asks to add payments.',
  {
    framework: z.enum(['nextjs', 'express', 'react']).describe('Target framework'),
  },
  async ({ framework }) => {
    const guides: Record<string, string> = {
      nextjs: `# Add Banksi Payments to Next.js

## 1. Install
\`\`\`bash
npm install banksi
\`\`\`

## 2. Set environment variables
\`\`\`env
BANKSI_URL=https://banksi.vercel.app
BANKSI_MERCHANT_SLUG=your-store
\`\`\`

## 3. Protect an API route with x402 paywall
\`\`\`typescript
// app/api/premium/route.ts
import { createBanksiPaywall } from 'banksi/next';

const paywall = createBanksiPaywall({
  amount: 0.10,
  description: 'Access premium API',
});

export async function GET(request: Request) {
  const blocked = await paywall(request);
  if (blocked) return blocked; // Returns 402 with payment instructions

  return Response.json({ data: 'premium content' });
}
\`\`\`

## 4. (Optional) Add a pay button to your frontend
\`\`\`tsx
import { BanksiPayButton } from 'banksi/react';

<BanksiPayButton
  amount={0.10}
  baseUrl="https://banksi.vercel.app"
  merchantSlug="your-store"
  onPaymentConfirmed={(id) => console.log('Paid!', id)}
/>
\`\`\`

## How it works
- Unauthenticated requests get a 402 response with chain/token options and a pay URL
- Client creates a payment via the Banksi API, sends stablecoins on-chain
- Client retries with \`X-Payment: <paymentId>\` header
- Middleware verifies the payment and grants access

## 5. Product-based payments (alternative)
Instead of x402 paywalls, you can create products in Banksi and link to them:

1. Use \`create_product\` MCP tool to create a product (or do it in the Banksi dashboard)
2. Get the payment link: \`/pay/select/{slug}/{productId}\`
3. Redirect users to that link, or embed it:

\`\`\`tsx
// Simple redirect
<a href="https://banksi.io/pay/select/your-store/product-id">
  Pay $4.50 with Crypto
</a>

// Or embed as iframe
<iframe src="https://banksi.io/pay/select/your-store/product-id"
  width="450" height="700" style="border:none;border-radius:12px" />

// Or use the React component
import { BanksiPayButton } from 'banksi/react';
<BanksiPayButton amount={4.50} merchantSlug="your-store" />
\`\`\`

Use \`list_products\` to see all products and their payment links.
Use \`get_payment_link\` to get embed code for a specific product.`,

      express: `# Add Banksi Payments to Express

## 1. Install
\`\`\`bash
npm install banksi
\`\`\`

## 2. Set environment variables
\`\`\`env
BANKSI_URL=https://banksi.vercel.app
BANKSI_MERCHANT_SLUG=your-store
\`\`\`

## 3. Add paywall middleware
\`\`\`typescript
import express from 'express';
import { createBanksiPaywall } from 'banksi/express';

const app = express();

app.use('/api/premium', createBanksiPaywall({
  amount: 0.10,
  description: 'Access premium API',
}));

app.get('/api/premium', (req, res) => {
  res.json({ data: 'premium content' });
});
\`\`\``,

      react: `# Add Banksi Pay Button to React

## 1. Install
\`\`\`bash
npm install banksi
\`\`\`

## 2. Add the pay button component
\`\`\`tsx
import { BanksiPayButton } from 'banksi/react';

function PremiumContent() {
  const [paid, setPaid] = useState(false);

  if (!paid) {
    return (
      <BanksiPayButton
        amount={0.10}
        baseUrl="https://banksi.vercel.app"
        merchantSlug="your-store"
        onPaymentConfirmed={() => setPaid(true)}
      />
    );
  }

  return <div>Premium content unlocked!</div>;
}
\`\`\`

The component handles network/token selection, address display, and payment confirmation polling automatically.`,
    };

    return { content: [{ type: 'text', text: guides[framework] }] };
  }
);

server.tool(
  'generate_paywall_code',
  'Generate ready-to-paste paywall middleware code for a specific endpoint.',
  {
    framework: z.enum(['nextjs', 'express']).describe('Target framework'),
    amount: z.number().describe('Price in USD'),
    description: z.string().optional().describe('What the user is paying for'),
    routePath: z.string().optional().describe('API route path, e.g. /api/premium'),
  },
  async ({ framework, amount, description, routePath }) => {
    const desc = description || 'Access this resource';
    const path = routePath || '/api/premium';

    if (framework === 'nextjs') {
      return { content: [{ type: 'text', text: `// ${path}/route.ts
import { createBanksiPaywall } from 'banksi/next';

const paywall = createBanksiPaywall({
  amount: ${amount},
  description: '${desc}',
});

export async function GET(request: Request) {
  const blocked = await paywall(request);
  if (blocked) return blocked;

  return Response.json({ data: 'your response here' });
}` }] };
    }

    return { content: [{ type: 'text', text: `// ${path}
import { createBanksiPaywall } from 'banksi/express';

app.use('${path}', createBanksiPaywall({
  amount: ${amount},
  description: '${desc}',
}));

app.get('${path}', (req, res) => {
  res.json({ data: 'your response here' });
});` }] };
  }
);

server.tool(
  'get_sdk_reference',
  'Get the full Banksi SDK API reference. Use this to understand all available functions and components.',
  {},
  async () => {
    return { content: [{ type: 'text', text: `# Banksi SDK Reference

## BanksiClient
\`\`\`typescript
import { BanksiClient } from 'banksi';

const client = new BanksiClient({
  baseUrl: 'https://banksi.vercel.app',  // or BANKSI_URL env
  merchantSlug: 'your-store',        // or BANKSI_MERCHANT_SLUG env
});

await client.listChains()                          // Chain[]
await client.createPayment({ chainId, tokenId, amount })  // PaymentResult
await client.verifyPayment(paymentId)              // PaymentStatus
await client.isPaymentConfirmed(paymentId)         // boolean
\`\`\`

## Next.js Middleware
\`\`\`typescript
import { createBanksiPaywall } from 'banksi/next';
const paywall = createBanksiPaywall({ amount: 0.10, description?: string });
// Returns: (request: Request) => Promise<Response | null>
// null = payment verified, proceed
// Response = 402 with payment instructions
\`\`\`

## Express Middleware
\`\`\`typescript
import { createBanksiPaywall } from 'banksi/express';
app.use('/path', createBanksiPaywall({ amount: 0.10 }));
// Calls next() if paid, returns 402 if not
\`\`\`

## React Component
\`\`\`tsx
import { BanksiPayButton } from 'banksi/react';
<BanksiPayButton
  amount={number}             // required: USD amount
  baseUrl={string}            // Banksi instance URL
  merchantSlug={string}       // merchant identifier
  chainId={string}            // optional: skip chain selection
  tokenId={string}            // optional: skip token selection
  onPaymentCreated={(payment) => {}}
  onPaymentConfirmed={(paymentId) => {}}
  className={string}          // button styling
/>
\`\`\`

## Product Payment Links
For product-based payments (not x402 paywalls), use these MCP tools:
- \`create_product\` — Create a product and get its payment link + embed code
- \`list_products\` — List all products with payment links
- \`get_payment_link\` — Get embed code for a specific product
- \`update_product\` — Update product name/price/description

Payment link format: \`{BANKSI_URL}/pay/select/{slug}/{productId}\`

Embed options:
- Direct link/redirect
- HTML button (\`<a>\` tag)
- React component (\`<BanksiPayButton />\`)
- iframe embed

## Environment Variables
- \`BANKSI_URL\` — Banksi instance URL (default: https://banksi.io)
- \`BANKSI_API_KEY\` — Your API key (from dashboard)
- \`BANKSI_MERCHANT_SLUG\` — Your merchant slug (optional if API key is set)
` }] };
  }
);

server.tool(
  'validate_integration',
  'Test that a Banksi instance is reachable and the merchant exists. Run this after setup to verify.',
  {
    banksiUrl: z.string().optional().describe('Banksi URL (default: BANKSI_URL env or localhost:3001)'),
    merchantSlug: z.string().optional().describe('Merchant slug to validate'),
  },
  async ({ banksiUrl, merchantSlug }) => {
    const url = banksiUrl || process.env.BANKSI_URL || 'https://banksi.vercel.app';
    const slug = merchantSlug || process.env.BANKSI_MERCHANT_SLUG || '';
    const results: string[] = [];

    // Test API reachability
    try {
      const res = await fetch(`${url}/api/chains`);
      if (res.ok) {
        const data = await res.json();
        results.push(`API reachable: ${data.chains.length} chains available`);
      } else {
        results.push(`API error: ${res.status}`);
      }
    } catch (err) {
      results.push(`Cannot reach ${url}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }

    // Test merchant
    if (slug) {
      try {
        const res = await fetch(`${url}/api/store/${slug}`);
        if (res.ok) {
          const data = await res.json();
          results.push(`Merchant "${slug}" found: ${data.merchant?.name || 'OK'}, ${data.products?.length || 0} products`);
        } else {
          results.push(`Merchant "${slug}" not found (${res.status}). Create it in the Banksi admin panel.`);
        }
      } catch {
        results.push(`Cannot verify merchant "${slug}"`);
      }
    }

    return { content: [{ type: 'text', text: results.join('\n') }] };
  }
);

// ─── Start ─────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
