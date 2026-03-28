'use client';

interface PaymentStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  PENDING: {
    label: 'Pending',
    classes: 'bg-warning/10 text-warning',
  },
  CONFIRMING: {
    label: 'Confirming',
    classes: 'bg-primary-light/10 text-primary-light animate-pulse',
  },
  CONFIRMED: {
    label: 'Confirmed',
    classes: 'bg-success/10 text-success',
  },
  SWEPT: {
    label: 'Swept',
    classes: 'bg-success/10 text-success',
  },
  EXPIRED: {
    label: 'Expired',
    classes: 'bg-muted/10 text-muted',
  },
  FAILED: {
    label: 'Failed',
    classes: 'bg-error/10 text-error',
  },
};

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    classes: 'bg-muted/10 text-muted',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.classes}`}
    >
      {status === 'CONFIRMED' || status === 'SWEPT' ? (
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : null}
      {config.label}
    </span>
  );
}
