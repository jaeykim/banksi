import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Chains ─────────────────────────────────────────

  const chains = [
    {
      id: "ethereum",
      name: "Ethereum",
      chainIdNum: 1,
      rpcUrl: "https://eth.llamarpc.com",
      explorerUrl: "https://etherscan.io",
      isEvm: true,
    },
    {
      id: "polygon",
      name: "Polygon",
      chainIdNum: 137,
      rpcUrl: "https://polygon-rpc.com",
      explorerUrl: "https://polygonscan.com",
      isEvm: true,
      isActive: false,
    },
    {
      id: "bsc",
      name: "BNB Smart Chain",
      chainIdNum: 56,
      rpcUrl: "https://bsc-dataseed.binance.org",
      explorerUrl: "https://bscscan.com",
      isEvm: true,
    },
    {
      id: "arbitrum",
      name: "Arbitrum One",
      chainIdNum: 42161,
      rpcUrl: "https://arb1.arbitrum.io/rpc",
      explorerUrl: "https://arbiscan.io",
      isEvm: true,
    },
    {
      id: "tron",
      name: "Tron",
      chainIdNum: null,
      rpcUrl: "https://api.trongrid.io",
      explorerUrl: "https://tronscan.org",
      isEvm: false,
    },
    {
      id: "solana",
      name: "Solana",
      chainIdNum: null,
      rpcUrl: "https://api.mainnet-beta.solana.com",
      explorerUrl: "https://solscan.io",
      isEvm: false,
    },
  ];

  for (const chain of chains) {
    await prisma.chain.upsert({
      where: { id: chain.id },
      update: chain,
      create: chain,
    });
  }

  console.log(`Seeded ${chains.length} chains`);

  // ─── Tokens ─────────────────────────────────────────

  const tokens = [
    // Ethereum
    {
      chainId: "ethereum",
      symbol: "USDT",
      name: "Tether USD",
      contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      decimals: 6,
    },
    {
      chainId: "ethereum",
      symbol: "USDC",
      name: "USD Coin",
      contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      decimals: 6,
    },
    // Polygon
    {
      chainId: "polygon",
      symbol: "USDT",
      name: "Tether USD",
      contractAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      decimals: 6,
    },
    {
      chainId: "polygon",
      symbol: "USDC",
      name: "USD Coin",
      contractAddress: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      decimals: 6,
    },
    // BSC
    {
      chainId: "bsc",
      symbol: "USDT",
      name: "Tether USD",
      contractAddress: "0x55d398326f99059fF775485246999027B3197955",
      decimals: 18,
    },
    {
      chainId: "bsc",
      symbol: "USDC",
      name: "USD Coin",
      contractAddress: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      decimals: 18,
    },
    // Arbitrum
    {
      chainId: "arbitrum",
      symbol: "USDT",
      name: "Tether USD",
      contractAddress: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      decimals: 6,
    },
    {
      chainId: "arbitrum",
      symbol: "USDC",
      name: "USD Coin",
      contractAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      decimals: 6,
    },
    // Tron
    {
      chainId: "tron",
      symbol: "USDT",
      name: "Tether USD",
      contractAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      decimals: 6,
    },
    {
      chainId: "tron",
      symbol: "USDC",
      name: "USD Coin",
      contractAddress: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
      decimals: 6,
    },
    // Solana
    {
      chainId: "solana",
      symbol: "USDT",
      name: "Tether USD",
      contractAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      decimals: 6,
    },
    {
      chainId: "solana",
      symbol: "USDC",
      name: "USD Coin",
      contractAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      decimals: 6,
    },
  ];

  for (const token of tokens) {
    await prisma.token.upsert({
      where: {
        chainId_symbol: {
          chainId: token.chainId,
          symbol: token.symbol,
        },
      },
      update: token,
      create: token,
    });
  }

  console.log(`Seeded ${tokens.length} tokens`);

  // ─── Admin User ─────────────────────────────────────

  const passwordHash = await hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@banksi.io" },
    update: {},
    create: {
      email: "admin@banksi.io",
      passwordHash,
      name: "Admin",
      role: "ADMIN",
    },
  });

  console.log("Seeded admin user: admin@banksi.io");

  // ─── Demo Merchant ──────────────────────────────────

  const merchantPasswordHash = await hash("merchant123", 12);

  const demoMerchant = await prisma.merchant.upsert({
    where: { slug: "seoul-coffee" },
    update: {},
    create: {
      name: "Seoul Coffee",
      slug: "seoul-coffee",
      storeDescription: "Premium specialty coffee in the heart of Seoul. Pay with crypto!",
      storeBannerColor: "#7c3aed",
      storeIsPublic: true,
      users: {
        create: {
          email: "merchant@banksi.io",
          passwordHash: merchantPasswordHash,
          name: "Seoul Coffee Owner",
          role: "MERCHANT",
        },
      },
    },
  });

  // Demo products
  const products = [
    { name: "Americano", description: "Classic black coffee", priceUsd: 4.5, imageUrl: "/uploads/products/americano.svg" },
    { name: "Cafe Latte", description: "Espresso with steamed milk", priceUsd: 5.5, imageUrl: "/uploads/products/cafe-latte.svg" },
    { name: "Cappuccino", description: "Espresso, steamed milk & foam", priceUsd: 5.5, imageUrl: "/uploads/products/cappuccino.svg" },
    { name: "Caramel Macchiato", description: "Vanilla, milk, espresso & caramel drizzle", priceUsd: 6.0, imageUrl: "/uploads/products/caramel-macchiato.svg" },
    { name: "Matcha Latte", description: "Premium Japanese matcha with milk", priceUsd: 6.5, imageUrl: "/uploads/products/matcha-latte.svg" },
    { name: "Croissant", description: "Freshly baked butter croissant", priceUsd: 3.5, imageUrl: "/uploads/products/croissant.svg" },
    { name: "Chocolate Cake", description: "Rich dark chocolate layer cake", priceUsd: 7.0, imageUrl: "/uploads/products/chocolate-cake.svg" },
    { name: "Blueberry Muffin", description: "Homemade muffin with fresh blueberries", priceUsd: 4.0, imageUrl: "/uploads/products/blueberry-muffin.svg" },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { merchantId: demoMerchant.id, name: p.name },
    });
    if (!existing) {
      await prisma.product.create({
        data: { ...p, merchantId: demoMerchant.id },
      });
    } else if (!existing.imageUrl && p.imageUrl) {
      await prisma.product.update({
        where: { id: existing.id },
        data: { imageUrl: p.imageUrl },
      });
    }
  }

  // Auto-provision HD wallet for demo merchant
  const existingHd = await prisma.hdWalletConfig.findUnique({
    where: { merchantId: demoMerchant.id },
  });
  if (!existingHd) {
    // Use encryption inline (can't import from src in seed)
    const kek = Buffer.from(process.env.MNEMONIC_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "hex");
    const { Mnemonic } = await import("ethers");
    const mnemonic = Mnemonic.fromEntropy(crypto.randomBytes(16)).phrase;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", kek, iv);
    let encrypted = cipher.update(mnemonic, "utf8", "base64");
    encrypted += cipher.final("base64");
    const tag = cipher.getAuthTag();

    await prisma.hdWalletConfig.create({
      data: {
        merchantId: demoMerchant.id,
        encryptedMnemonic: encrypted,
        encryptionIv: iv.toString("base64"),
        encryptionTag: tag.toString("base64"),
      },
    });
  }

  console.log("Seeded demo merchant: Seoul Coffee (merchant@banksi.io / merchant123)");
  console.log(`Seeded ${products.length} demo products`);

  // ─── System Settings ─────────────────────────────────

  const defaultSettings = [
    { key: "sweep_fee_percent", value: "1.0" },
    { key: "sweep_fee_address", value: "" },
    { key: "auto_sweep_enabled", value: "false" },
    { key: "auto_sweep_interval_minutes", value: "10" },
    { key: "payment_expiry_minutes", value: "30" },
    { key: "required_confirmations", value: "3" },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log(`Seeded ${defaultSettings.length} system settings`);

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
