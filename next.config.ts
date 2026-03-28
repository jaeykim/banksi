import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Allow external packages in serverless functions
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
};

export default nextConfig;
