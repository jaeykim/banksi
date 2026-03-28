'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

interface MerchantInfo {
  name: string;
  slug: string;
  storeDescription: string | null;
  storeBannerColor: string | null;
  storeLogo: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  priceUsd: number;
  imageUrl: string | null;
}

export default function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>();

  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // QR modal state
  const [qrProduct, setQrProduct] = useState<Product | null>(null);

  useEffect(() => {
    async function fetchStore() {
      try {
        const res = await fetch(`/api/store/${slug}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setMerchant(data.merchant);
        setProducts(data.products);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchStore();
  }, [slug]);

  function openQrModal(product: Product) {
    setQrProduct(product);
  }

  function closeQrModal() {
    setQrProduct(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading store...</p>
      </div>
    );
  }

  if (notFound || !merchant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Store Not Found</h1>
          <p className="text-sm text-gray-500">
            This store doesn&apos;t exist or is currently unavailable.
          </p>
        </div>
      </div>
    );
  }

  const bannerColor = merchant.storeBannerColor || '#3730a3';
  const paymentUrl = qrProduct
    ? `${window.location.origin}/pay/select/${slug}/${qrProduct.id}`
    : '';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header / Banner */}
      <header className="px-6 py-10 sm:py-14" style={{ backgroundColor: bannerColor }}>
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {merchant.name}
          </h1>
          {merchant.storeDescription && (
            <p className="mt-3 text-sm sm:text-base text-white/80 max-w-2xl">
              {merchant.storeDescription}
            </p>
          )}
        </div>
      </header>

      {/* Products Grid */}
      <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="mx-auto max-w-4xl">
          {products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-sm">
                No products available right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col"
                >
                  {product.imageUrl && (
                    <div className="h-40 bg-gray-100">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    {product.description && (
                      <p className="mt-1 text-sm text-gray-500 flex-1">
                        {product.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">
                        ${product.priceUsd.toFixed(2)}
                      </span>
                      <button
                        onClick={() => openQrModal(product)}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                        style={{ backgroundColor: bannerColor }}
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 text-center">
        <p className="text-xs text-gray-400">
          Powered by{' '}
          <span className="font-semibold text-gray-500">Banksi</span>
        </p>
      </footer>

      {/* QR Code Modal */}
      {qrProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {qrProduct.name}
              </h2>
              <button
                onClick={closeQrModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal body */}
            <div className="px-5 py-6 flex flex-col items-center space-y-4">
              <p className="text-sm text-gray-500">
                Scan to pay{' '}
                <span className="font-semibold text-gray-900">
                  ${qrProduct.priceUsd.toFixed(2)} USD
                </span>
              </p>

              <div className="rounded-lg border border-gray-200 p-4 bg-white">
                <QRCodeSVG value={paymentUrl} size={200} />
              </div>

              <a
                href={paymentUrl}
                className="inline-flex items-center justify-center w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: bannerColor }}
              >
                Open Payment Page
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
