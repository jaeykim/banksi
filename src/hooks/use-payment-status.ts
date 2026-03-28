'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const TERMINAL_STATUSES = ['CONFIRMED', 'SWEPT', 'EXPIRED', 'FAILED'];
const POLL_INTERVAL = 5000;

interface PaymentStatusResult {
  status: string | null;
  txHash: string | null;
  loading: boolean;
  error: string | null;
}

export function usePaymentStatus(paymentId: string): PaymentStatusResult {
  const [status, setStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/status`);
      if (!res.ok) {
        throw new Error('Failed to fetch payment status');
      }
      const data = await res.json();
      setStatus(data.status);
      setTxHash(data.txHash || null);
      setError(null);

      if (TERMINAL_STATUSES.includes(data.status) && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    fetchStatus();

    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchStatus]);

  return { status, txHash, loading, error };
}
