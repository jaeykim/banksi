# Banksi MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that allows AI agents (Claude, etc.) to interact with Banksi's payment system — list stores, create payments, check statuses, and handle x402 paywalls.

## Setup

### Prerequisites
- Node.js 18+
- Banksi DB seeded (`npx prisma db seed`)

### Run standalone
```bash
npm run mcp
```

### Claude Desktop / Claude Code config

Add to your MCP settings:

```json
{
  "mcpServers": {
    "banksi": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/path/to/banksi"
    }
  }
}
```

## Tools

### `list_chains`
List all supported blockchains and their tokens.

**Parameters:** none

**Returns:** Array of chains with tokens (id, symbol, name, decimals)

---

### `get_store`
Get merchant store info and product catalog.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `slug` | string | Store slug, e.g. `"seoul-coffee"` |

**Returns:** Merchant info + products array

---

### `create_payment`
Create a crypto payment for a product. Returns a unique deposit address.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `slug` | string | Store slug |
| `productId` | string | Product ID |
| `chainId` | string | Chain ID (`ethereum`, `arbitrum`, `bsc`, `tron`, `solana`) |
| `tokenId` | string | Token ID from `list_chains` |

**Returns:** `{ paymentId, address, amountExpected, tokenSymbol, expiresAt }`

---

### `get_payment`
Get full details of a payment.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `paymentId` | string | Payment ID |

**Returns:** Full payment object with chain, token, address, status, merchant, product

---

### `check_payment_status`
Check on-chain status of a payment. Queries the actual blockchain.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `paymentId` | string | Payment ID |

**Returns:** `{ status, txHash, amountReceived, confirmations }`

Status values: `PENDING` → `CONFIRMING` → `CONFIRMED` → `SWEPT`

---

### `x402_pay`
Create a payment for an x402 paywall. Use when an API returns HTTP 402.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `merchantSlug` | string | From the 402 response |
| `chainId` | string | Chain to pay on |
| `tokenId` | string | Token to pay with |
| `amount` | number | Amount in USD |

**Returns:** `{ paymentId, address, amountExpected, instruction }`

## Example Flow

```
Agent: list_chains
→ [Ethereum (USDT, USDC), Arbitrum (USDT, USDC), ...]

Agent: get_store("seoul-coffee")
→ { merchant: { name: "Seoul Coffee" }, products: [{ id: "abc", name: "Americano", priceUsd: 4.5 }, ...] }

Agent: create_payment("seoul-coffee", "abc", "ethereum", "usdt-token-id")
→ { paymentId: "xyz", address: "0xABC...", amountExpected: "4.5", expiresAt: "..." }

Agent: check_payment_status("xyz")
→ { status: "PENDING", txHash: null }

// ... user pays on-chain ...

Agent: check_payment_status("xyz")
→ { status: "CONFIRMED", txHash: "0xDEF...", confirmations: 5 }
```
