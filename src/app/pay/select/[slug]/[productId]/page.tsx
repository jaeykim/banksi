'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ProductInfo {
  id: string;
  name: string;
  description: string | null;
  priceUsd: number;
}

interface MerchantInfo {
  name: string;
  slug: string;
  storeBannerColor: string | null;
}

interface ChainData {
  id: string;
  name: string;
  tokens: { id: string; symbol: string; name: string }[];
}

export default function PaymentSelectPage() {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [chains, setChains] = useState<ChainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedChain, setSelectedChain] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [productRes, chainsRes] = await Promise.all([
          fetch(`/api/store/${slug}/products/${productId}`),
          fetch('/api/chains'),
        ]);

        if (!productRes.ok) {
          setError('Product not found.');
          return;
        }

        const productData = await productRes.json();
        setProduct(productData.product);
        setMerchant(productData.merchant);

        if (chainsRes.ok) {
          const chainsData = await chainsRes.json();
          setChains(chainsData.chains);
        }
      } catch {
        setError('Failed to load payment page.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [slug, productId]);

  function handleChainSelect(chainId: string) {
    setSelectedChain(chainId);
    setSelectedToken('');
  }

  const selectedChainData = chains.find((c) => c.id === selectedChain);
  const selectedTokenData = selectedChainData?.tokens.find(
    (t) => t.id === selectedToken,
  );

  async function handlePay() {
    if (!selectedChain || !selectedToken) return;
    setPayLoading(true);
    setPayError('');

    try {
      const res = await fetch(`/api/store/${slug}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          chainId: selectedChain,
          tokenId: selectedToken,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Payment failed');
      }

      const data = await res.json();
      router.push(`/pay/${data.paymentId}`);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Payment failed.');
    } finally {
      setPayLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error || !product || !merchant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-gray-900">Not Found</h1>
          <p className="text-sm text-gray-500">
            {error || 'This product or store is unavailable.'}
          </p>
        </div>
      </div>
    );
  }

  const bannerColor = merchant.storeBannerColor || '#3730a3';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="px-5 py-4 border-b border-gray-200 bg-white">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <span className="text-lg font-bold text-indigo-600">Banksi</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">
            {merchant.name}
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Product info */}
          <div className="rounded-xl bg-white border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              {product.name}
            </h2>
            {product.description && (
              <p className="mt-1 text-sm text-gray-500">
                {product.description}
              </p>
            )}
            <p className="mt-3 text-2xl font-bold text-gray-900">
              ${product.priceUsd.toFixed(2)}{' '}
              <span className="text-sm font-normal text-gray-500">USD</span>
            </p>
          </div>

          {/* Network selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">
              Select Network
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {chains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleChainSelect(chain.id)}
                  className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
                    selectedChain === chain.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {chain.name}
                </button>
              ))}
            </div>
          </div>

          {/* Token selection */}
          {selectedChain && selectedChainData && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">
                Select Token
              </h3>
              <div className="flex gap-3">
                {selectedChainData.tokens.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => setSelectedToken(token.id)}
                    className={`rounded-xl border-2 px-5 py-3 text-sm font-medium transition-colors ${
                      selectedToken === token.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {token.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount preview */}
          {selectedToken && selectedTokenData && selectedChainData && (
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
              <p className="text-sm text-indigo-700">
                You will pay:{' '}
                <span className="font-semibold">
                  {product.priceUsd.toFixed(2)} {selectedTokenData.symbol}
                </span>{' '}
                on{' '}
                <span className="font-semibold">
                  {selectedChainData.name}
                </span>
              </p>
            </div>
          )}

          {/* Pay error */}
          {payError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-600">{payError}</p>
            </div>
          )}

          {/* Continue button */}
          <button
            onClick={handlePay}
            disabled={!selectedChain || !selectedToken || payLoading}
            className="w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: bannerColor }}
          >
            {payLoading ? 'Processing...' : 'Continue to Pay'}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-5 text-center">
        <p className="text-xs text-gray-400">
          Powered by{' '}
          <span className="font-semibold text-gray-500">Banksi</span>
        </p>
      </footer>
    </div>
  );
}
