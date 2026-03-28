import 'next-auth';
import 'next-auth/jwt';

export enum Role {
  USER = 'USER',
  MERCHANT = 'MERCHANT',
  ADMIN = 'ADMIN',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMING = 'CONFIRMING',
  CONFIRMED = 'CONFIRMED',
  SWEPT = 'SWEPT',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

export enum SweepStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export type ChainType =
  | 'ethereum'
  | 'polygon'
  | 'bsc'
  | 'arbitrum'
  | 'tron'
  | 'solana';

declare module 'next-auth' {
  interface User {
    role: string;
    merchantId: string | null;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      merchantId: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    merchantId: string | null;
  }
}
