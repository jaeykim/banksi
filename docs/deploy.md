# Deployment Guide

## 1. Publish SDK to npm

```bash
# Build the SDK
npm run sdk:build

# Login to npm (one-time)
npm login

# Publish
npm run sdk:publish
```

After publishing, anyone can `npm install banksi`.

## 2. Publish MCP Server to npm

```bash
npm run mcp:publish
```

After publishing, AI agents can use `npx banksi-mcp` or add to Claude config:

```json
{
  "mcpServers": {
    "banksi": {
      "command": "npx",
      "args": ["banksi-mcp"],
      "cwd": "/path/to/banksi"
    }
  }
}
```

## 3. Deploy Banksi Server

### Option A: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Switch to PostgreSQL (production)
# Update prisma/schema.prisma:
#   datasource db {
#     provider = "postgresql"
#     url      = env("DATABASE_URL")
#   }

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# DATABASE_URL=postgresql://...
# NEXTAUTH_SECRET=<random-secret>
# NEXTAUTH_URL=https://your-domain.vercel.app
# MNEMONIC_ENCRYPTION_KEY=<64-char-hex>
```

### Option B: Railway

```bash
# Connect to Railway
railway init
railway up

# Set env vars via Railway dashboard
```

### Option C: Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npx prisma generate && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 4. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing |
| `NEXTAUTH_URL` | Yes | Your deployment URL |
| `MNEMONIC_ENCRYPTION_KEY` | Yes | 64-char hex key for HD wallet encryption |
| `GAS_FUNDER_PRIVATE_KEY` | For sweep | Private key of gas funder wallet |
| `CRON_SECRET` | Optional | Secret for cron-triggered payment monitoring |

## 5. Post-Deploy Checklist

```bash
# Run migrations
npx prisma migrate deploy

# Seed chains and tokens
npx prisma db seed

# Verify
curl https://your-domain.com/api/chains
```

## 6. For Testnet First

Use testnet RPCs and faucet tokens before going to mainnet:

- Ethereum Sepolia: https://sepoliafaucet.com
- Arbitrum Sepolia: https://faucet.arbitrum.io
- BSC Testnet: https://testnet.bnbchain.org/faucet-smart

Set chain RPC URLs in `.env`:
```
ETH_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
```
