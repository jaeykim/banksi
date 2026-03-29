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

const DEMO_PRODUCTS: Product[] = [
  { id: 'demo-1', name: 'Americano', description: 'Classic black coffee', priceUsd: 4.50, imageUrl: '/uploads/products/americano.svg' },
  { id: 'demo-2', name: 'Cafe Latte', description: 'Espresso with steamed milk', priceUsd: 5.50, imageUrl: '/uploads/products/cafe-latte.svg' },
  { id: 'demo-3', name: 'Matcha Latte', description: 'Premium Japanese matcha', priceUsd: 6.50, imageUrl: '/uploads/products/matcha-latte.svg' },
  { id: 'demo-4', name: 'Croissant', description: 'Freshly baked butter croissant', priceUsd: 3.50, imageUrl: '/uploads/products/croissant.svg' },
];

export default function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>();

  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    async function fetchStore() {
      try {
        const res = await fetch(`/api/store/${slug}`);
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setMerchant(data.merchant);
        setProducts(data.products);
      } catch { setNotFound(true); }
      finally { setLoading(false); }
    }
    fetchStore();
  }, [slug]);

  const isDemo = !loading && merchant && products.length === 0;
  const displayProducts = products.length > 0 ? products : DEMO_PRODUCTS;
  const color = merchant?.storeBannerColor || '#d97706'; // amber-600 default

  function addToCart(id: string) {
    setCart((p) => { const n = new Map(p); n.set(id, (n.get(id) || 0) + 1); return n; });
  }
  function removeFromCart(id: string) {
    setCart((p) => { const n = new Map(p); const q = (n.get(id) || 0) - 1; q <= 0 ? n.delete(id) : n.set(id, q); return n; });
  }

  const total = Array.from(cart.entries()).reduce((s, [id, qty]) => {
    const p = displayProducts.find((x) => x.id === id);
    return s + (p ? p.priceUsd * qty : 0);
  }, 0);
  const cartCount = Array.from(cart.values()).reduce((s, q) => s + q, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50">
        <svg className="animate-spin h-6 w-6 text-amber-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
      </div>
    );
  }

  if (notFound || !merchant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Store Not Found</h1>
          <p className="text-sm text-gray-500">This store doesn&apos;t exist or is currently unavailable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-amber-200/50">
        <div className="mx-auto max-w-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: color }}>
              {merchant.name[0]}
            </div>
            <div>
              <h1 className="text-base font-bold text-amber-900">{merchant.name}</h1>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-amber-600">Payments by</span>
                <div className="flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5">
                  <div className="h-3 w-3 rounded bg-indigo-600 flex items-center justify-center">
                    <span className="text-[6px] font-bold text-white">B</span>
                  </div>
                  <span className="text-[9px] font-semibold text-indigo-700">Banksi</span>
                </div>
              </div>
            </div>
          </div>
          {cart.size > 0 && (
            <button onClick={() => setShowCart(true)}
              className="flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-200 hover:bg-amber-700 transition-colors">
              ${total.toFixed(2)}
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">{cartCount}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Demo banner */}
          {isDemo && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200/60 bg-amber-50/80 px-4 py-2.5">
              <svg className="h-4 w-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
              <p className="text-xs text-amber-700">Demo store — add your own products in the dashboard to customize.</p>
            </div>
          )}

          {/* Menu heading */}
          <h2 className="text-lg font-bold text-amber-900 px-1">Menu</h2>

          {/* Products grid — cafe style */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {displayProducts.map((product) => {
              const qty = cart.get(product.id) || 0;
              return (
                <div key={product.id} className="rounded-2xl bg-white border border-amber-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    {product.imageUrl ? (
                      <div className="h-14 w-14 rounded-xl bg-amber-50 overflow-hidden flex-shrink-0">
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">☕</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">{product.name}</h3>
                      {product.description && (
                        <p className="text-[11px] text-gray-500 mt-0.5">{product.description}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-amber-700">${product.priceUsd.toFixed(2)}</span>
                        {qty === 0 ? (
                          <button onClick={() => addToCart(product.id)}
                            className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button onClick={() => removeFromCart(product.id)} className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-xs hover:bg-amber-200">-</button>
                            <span className="text-sm font-bold text-gray-900 w-3 text-center">{qty}</span>
                            <button onClick={() => addToCart(product.id)} className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white font-bold text-xs hover:bg-amber-700">+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {cart.size === 0 && (
            <p className="text-center text-xs text-amber-400 pt-2">Add items to your cart to checkout</p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-5 text-center">
        <div className="inline-flex items-center gap-1.5">
          <span className="text-[10px] text-amber-400">Powered by</span>
          <div className="h-3.5 w-3.5 rounded bg-indigo-600 flex items-center justify-center">
            <span className="text-[6px] font-bold text-white">B</span>
          </div>
          <span className="text-[10px] font-semibold text-amber-500">Banksi</span>
        </div>
      </footer>

      {/* Cart overlay */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-2xl shadow-xl overflow-auto" style={{ maxHeight: '80vh', animation: 'banksi-up .3s ease' }}>
            <style>{`@keyframes banksi-up{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            <div className="flex justify-center pt-2 pb-1"><div className="w-9 h-1 rounded bg-gray-300" /></div>
            <div className="px-5 py-3 border-b border-amber-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-amber-900">Your Order</h2>
              <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {Array.from(cart.entries()).map(([id, qty]) => {
                const p = displayProducts.find((x) => x.id === id)!;
                return (
                  <div key={id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{p.name} <span className="text-gray-400">x{qty}</span></span>
                    <span className="text-sm font-semibold text-gray-900">${(p.priceUsd * qty).toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="border-t border-amber-100 pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-amber-700">${total.toFixed(2)}</span>
              </div>
            </div>
            <div className="px-5 pb-5">
              {/* Pay — link to first product in cart */}
              {(() => {
                const firstId = Array.from(cart.keys())[0];
                const p = displayProducts.find((x) => x.id === firstId);
                if (!p) return null;

                if (p.id.startsWith('demo-')) {
                  return (
                    <div className="space-y-2">
                      <a href={`/pay/select/${slug}/${p.id}`}
                        className="block w-full rounded-xl bg-amber-600 py-3 text-center text-sm font-bold text-white hover:bg-amber-700 transition-colors">
                        Pay ${total.toFixed(2)} with Crypto
                      </a>
                      <p className="text-[10px] text-amber-500 text-center">This is a live demo. Payments made here are donations to the developer. Thank you!</p>
                    </div>
                  );
                }

                return (
                  <a href={`/pay/select/${slug}/${p.id}`}
                    className="block w-full rounded-xl bg-amber-600 py-3 text-center text-sm font-bold text-white hover:bg-amber-700 transition-colors">
                    Pay ${total.toFixed(2)} with Crypto
                  </a>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
