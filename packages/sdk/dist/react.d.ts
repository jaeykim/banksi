import * as react_jsx_runtime from 'react/jsx-runtime';
import { B as BanksiConfig, P as PaymentResult } from './client-jLNKFIPq.js';
export { a as BanksiClient } from './client-jLNKFIPq.js';

interface BanksiPayButtonProps extends Partial<BanksiConfig> {
    amount: number;
    chainId?: string;
    tokenId?: string;
    onPaymentCreated?: (payment: PaymentResult) => void;
    onPaymentConfirmed?: (paymentId: string) => void;
    children?: React.ReactNode;
    className?: string;
}
declare function BanksiPayButton({ amount, chainId, tokenId, onPaymentCreated, onPaymentConfirmed, children, className, ...config }: BanksiPayButtonProps): react_jsx_runtime.JSX.Element;

export { BanksiPayButton };
