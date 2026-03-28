# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Banksi is a crypto payment service for banks. Merchants accept stablecoin payments (USDT/USDC) across multiple blockchains via HD Wallet-generated unique deposit addresses. An admin portal manages merchant mnemonics (VASP compliance) and automates fund sweeping.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx prisma migrate dev --name <name>  # Create migration
npx prisma generate  # Regenerate Prisma client
npx prisma db seed   # Seed DB (chains, tokens, admin user)
```

## Architecture

**Three portals** under `src/app/(portal)/`:
- `/admin/*` — Merchant management, mnemonic provisioning, sweep dashboard, payment monitoring
- `/merchant/*` — Product catalog, payment creation/QR display, wallet config, dashboard
- `/pay/[paymentId]` — Public payment page (no auth), QR code + status polling

**Core libraries** under `src/lib/`:
- `crypto/encryption.ts` — AES-256-GCM mnemonic encrypt/decrypt using `MNEMONIC_ENCRYPTION_KEY`
- `crypto/hd-wallet.ts` — BIP-39/BIP-44 HD wallet: `generateMnemonic()`, `deriveAddress()`, `derivePrivateKey()` for EVM/Tron/Solana
- `chains/` — `ChainAdapter` interface with implementations for EVM (ethers.js), Tron (tronweb), Solana (@solana/web3.js). Registry at `chains/registry.ts`
- `payments/create.ts` — Atomic payment+address derivation in a Prisma transaction
- `payments/monitor.ts` — Polls blockchains for incoming transfers, updates payment status
- `payments/sweep.ts` — Gas station pattern: fund gas → sweep tokens to merchant wallet

**Payment flow**: Merchant creates payment → server derives unique address from HD wallet → QR displayed → user pays → monitor detects tx → status updates to CONFIRMED → sweep moves funds to merchant's withdrawal wallet.

## Key Design Decisions

- **Prisma 5** with SQLite (dev) / PostgreSQL (prod). Schema at `prisma/schema.prisma`. Enums stored as strings (SQLite limitation).
- **NextAuth v4** with JWT strategy. Role field (`USER`/`MERCHANT`/`ADMIN`) in token. Edge middleware protects routes by role.
- **EVM address sharing**: Same derived address works on Ethereum, Polygon, BSC, Arbitrum (same secp256k1 derivation path `m/44'/60'/0'/0/{index}`). Tron and Solana use separate derivation paths.
- **Mnemonic never leaves server**: Encrypted at rest, decrypted only for address derivation and sweep operations, never returned to client.
- **Gas station pattern for sweeps**: Derived addresses receive tokens but need native currency for gas. System sends gas from a funder wallet before sweeping tokens out.

## Auth & Roles

- Admin: `admin@banksi.io` / `admin123` (seeded)
- Session includes `role` and `merchantId` (see `src/types/index.ts` for next-auth augmentation)
- API routes use `getServerSession(authOptions)` for auth checks

## Database

Default admin and chain/token data are seeded via `prisma/seed.ts`. Supported chains: Ethereum, Polygon, BSC, Arbitrum, Tron, Solana with USDT+USDC tokens each.
