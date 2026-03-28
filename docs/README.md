# Banksi Documentation

Banksi is a crypto payment service for banks. Merchants accept stablecoin payments (USDT/USDC) across multiple blockchains via HD Wallet-generated unique deposit addresses.

## Docs

- [API Reference](./api-reference.md) — Public REST API endpoints
- [MCP Server](./mcp-server.md) — Model Context Protocol server for AI agents
- [x402 Protocol](./x402.md) — HTTP 402 Payment Required integration

## Quick Start

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev          # http://localhost:3001
```

**Demo accounts:**
- Admin: `admin@banksi.io` / `admin123`
- Merchant: `merchant@banksi.io` / `merchant123`
- Demo store: `http://localhost:3001/store/seoul-coffee`
