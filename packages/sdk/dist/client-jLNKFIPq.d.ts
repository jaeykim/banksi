interface BanksiConfig {
    /** Banksi instance URL */
    baseUrl: string;
    /** Merchant store slug (optional if apiKey is set) */
    merchantSlug?: string;
    /** API key from banksi.io dashboard (bks_xxx) */
    apiKey?: string;
}
interface PaymentResult {
    paymentId: string;
    address: string;
    amountExpected: string;
    tokenSymbol: string;
    chainName: string;
    expiresAt: string;
}
interface PaymentStatus {
    id: string;
    status: 'PENDING' | 'CONFIRMING' | 'CONFIRMED' | 'SWEPT' | 'EXPIRED' | 'FAILED';
    txHash: string | null;
    amountReceived: string | null;
    paidAt: string | null;
}
interface Chain {
    id: string;
    name: string;
    tokens: {
        id: string;
        symbol: string;
        name: string;
    }[];
}
declare class BanksiClient {
    private baseUrl;
    private merchantSlug?;
    private apiKey?;
    constructor(config?: Partial<BanksiConfig>);
    private headers;
    listChains(): Promise<Chain[]>;
    createPayment(opts: {
        chainId: string;
        tokenId: string;
        amount: number;
        merchantSlug?: string;
    }): Promise<PaymentResult>;
    verifyPayment(paymentId: string): Promise<PaymentStatus>;
    isPaymentConfirmed(paymentId: string): Promise<boolean>;
}

export { type BanksiConfig as B, type Chain as C, type PaymentResult as P, BanksiClient as a, type PaymentStatus as b };
