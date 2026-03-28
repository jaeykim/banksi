# Banksi API Reference

Base URL: `http://localhost:3001` (dev)

## Public Endpoints (No Auth)

### `GET /api/chains`
List all active blockchains and their tokens.

### `GET /api/store/:slug`
Get store info and products for a merchant.

### `GET /api/store/:slug/products/:productId`
Get a single product with merchant info.

### `POST /api/store/:slug/pay`
Create a payment from the public storefront.

**Body:**
```json
{ "productId": "...", "chainId": "ethereum", "tokenId": "..." }
```

**Response:**
```json
{ "paymentId": "...", "address": "0x...", "amountExpected": "4.50", "expiresAt": "..." }
```

### `GET /api/payments/:paymentId`
Get full payment details (address, amount, status, chain, token, merchant, product).

### `GET /api/payments/:paymentId/status`
Poll payment status with on-chain verification. Returns current status, txHash, confirmations.

### `POST /api/x402/pay`
Create a payment for x402 paywall. See [x402 docs](./x402.md).

### `GET /api/x402/demo`
Demo protected endpoint. Returns 402 without payment, 200 with valid `X-Payment` header.

## Authenticated Endpoints

### Merchant APIs (`/api/merchants/:merchantId/...`)
Require `MERCHANT` or `ADMIN` session.

- `GET /api/merchants/:id/products` — List products
- `POST /api/merchants/:id/products` — Create product
- `PATCH /api/merchants/:id/products/:productId` — Update product
- `DELETE /api/merchants/:id/products/:productId` — Deactivate product
- `GET /api/merchants/:id/wallets` — List withdrawal wallets
- `POST /api/merchants/:id/wallets` — Set wallet for a chain
- `POST /api/merchants/:id/wallets/batch` — Set wallet for multiple chains (EVM group)
- `GET /api/merchants/:id/payments` — List payments with pagination
- `POST /api/merchants/:id/payments` — Create a payment

### Admin APIs (`/api/admin/...`)
Require `ADMIN` session.

- `GET /api/admin/merchants` — List all merchants
- `POST /api/admin/merchants` — Create merchant with user account
- `GET /api/admin/payments` — List all payments
- `GET/POST /api/admin/sweep` — Sweep stats and trigger sweep
- `GET /api/admin/settings` — Get system settings
- `PUT /api/admin/settings` — Update system settings
- `GET /api/admin/funder` — Gas funder wallet balances
- `GET /api/admin/daemon` — Background daemon status

### File Upload
- `POST /api/upload` — Upload product image (JPEG/PNG/WebP/GIF, max 5MB). Requires `MERCHANT` or `ADMIN` session.
