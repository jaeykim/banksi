'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface MenuItem {
  id: string;
  name: string;
  desc: string;
  price: number;
  emoji: string;
  tag?: string;
}

const menu: MenuItem[] = [
  { id: '1', name: 'Americano', desc: 'Rich espresso with hot water', price: 4.50, emoji: '☕' },
  { id: '2', name: 'Cafe Latte', desc: 'Espresso with steamed milk', price: 5.50, emoji: '🥛', tag: 'Popular' },
  { id: '3', name: 'Matcha Latte', desc: 'Premium Japanese matcha', price: 6.50, emoji: '🍵' },
  { id: '4', name: 'Caramel Macchiato', desc: 'Vanilla, milk & caramel drizzle', price: 6.00, emoji: '🍯' },
  { id: '5', name: 'Croissant', desc: 'Freshly baked butter croissant', price: 3.50, emoji: '🥐' },
  { id: '6', name: 'Chocolate Cake', desc: 'Rich dark chocolate layer cake', price: 7.00, emoji: '🍫', tag: 'New' },
];

type Step = 'menu' | 'pay' | 'done';

export default function CafeExamplePage() {
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [step, setStep] = useState<Step>('menu');
  const [paying, setPaying] = useState(false);

  const total = Array.from(cart.entries()).reduce((sum, [id, qty]) => {
    const item = menu.find((m) => m.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const cartCount = Array.from(cart.values()).reduce((s, q) => s + q, 0);

  function addToCart(id: string) {
    setCart((prev) => { const n = new Map(prev); n.set(id, (n.get(id) || 0) + 1); return n; });
  }
  function removeFromCart(id: string) {
    setCart((prev) => {
      const n = new Map(prev); const q = (n.get(id) || 0) - 1;
      if (q <= 0) n.delete(id); else n.set(id, q); return n;
    });
  }

  function handleSimulatePaid() {
    setPaying(true);
    setTimeout(() => { setPaying(false); setStep('done'); }, 2000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-amber-200/50">
        <div className="mx-auto max-w-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">☕</span>
            <div>
              <h1 className="text-base font-bold text-amber-900">Seoul Coffee</h1>
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
          {step === 'menu' && cart.size > 0 && (
            <button onClick={() => setStep('pay')}
              className="flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-200 hover:bg-amber-700 transition-colors">
              Pay ${total.toFixed(2)}
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">{cartCount}</span>
            </button>
          )}
          {step === 'pay' && (
            <button onClick={() => setStep('menu')} className="text-sm text-amber-600 font-medium hover:text-amber-800">← Menu</button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-2xl">

          {/* ── Menu ─────────────────────── */}
          {step === 'menu' && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-amber-900 px-1">Menu</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {menu.map((item) => {
                  const qty = cart.get(item.id) || 0;
                  return (
                    <div key={item.id} className="rounded-2xl bg-white border border-amber-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
                            {item.tag && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700">{item.tag}</span>}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-bold text-amber-700">${item.price.toFixed(2)}</span>
                            {qty === 0 ? (
                              <button onClick={() => addToCart(item.id)} className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">Add</button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button onClick={() => removeFromCart(item.id)} className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-xs hover:bg-amber-200">-</button>
                                <span className="text-sm font-bold text-gray-900 w-4 text-center">{qty}</span>
                                <button onClick={() => addToCart(item.id)} className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white font-bold text-xs hover:bg-amber-700">+</button>
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
                <p className="text-center text-xs text-amber-400 pt-4">Add items to your cart to checkout</p>
              )}
            </div>
          )}

          {/* ── Payment ─────────────────────── */}
          {step === 'pay' && (
            <div className="space-y-4">
              {/* Order summary */}
              <div className="rounded-2xl bg-white border border-amber-100 p-4 space-y-2">
                {Array.from(cart.entries()).map(([id, qty]) => {
                  const item = menu.find((m) => m.id === id)!;
                  return (
                    <div key={id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{item.emoji} {item.name} <span className="text-gray-400">x{qty}</span></span>
                      <span className="font-semibold text-gray-900">${(item.price * qty).toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="border-t border-amber-100 pt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-amber-700">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Network selection */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Network</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { name: 'Ethereum', icon: '/assets/chains/ethereum.svg' },
                    { name: 'Arbitrum', icon: '/assets/chains/arbitrum.svg', active: true },
                    { name: 'BSC', icon: '/assets/chains/bsc.svg' },
                  ].map((c) => (
                    <div key={c.name} className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 transition-colors ${c.active ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-white'}`}>
                      <img src={c.icon} alt={c.name} className="h-6 w-6" />
                      <span className={`text-[10px] font-medium ${c.active ? 'text-amber-800' : 'text-gray-500'}`}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Token selection */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Pay with</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'USDT', icon: '/assets/tokens/usdt.svg', active: true },
                    { name: 'USDC', icon: '/assets/tokens/usdc.svg' },
                  ].map((tk) => (
                    <div key={tk.name} className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 transition-colors ${tk.active ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-white'}`}>
                      <img src={tk.icon} alt={tk.name} className="h-5 w-5" />
                      <span className={`text-xs font-semibold ${tk.active ? 'text-amber-800' : 'text-gray-500'}`}>{tk.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" /><span className="relative h-2 w-2 rounded-full bg-amber-500" /></span>
                  <span className="text-xs text-gray-500">Waiting for payment</span>
                </div>
                <span className="text-xs font-mono font-semibold text-gray-900 tabular-nums">29:42</span>
              </div>

              {/* Browser wallet */}
              <button
                onClick={() => {
                  const ethereum = (window as unknown as { ethereum?: { request: (a: { method: string }) => Promise<unknown> } }).ethereum;
                  if (ethereum) {
                    ethereum.request({ method: 'eth_requestAccounts' }).then(() => {
                      handleSimulatePaid();
                    }).catch(() => {});
                  } else {
                    alert('No wallet detected. Install MetaMask or Rabby to try this.');
                  }
                }}
                disabled={paying}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-amber-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-200 hover:bg-amber-700 disabled:opacity-60 transition-all"
              >
                {paying ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Confirming...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Pay with Browser Wallet
                  </>
                )}
              </button>

              {/* Mobile wallet deeplinks */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { name: 'MetaMask', emoji: '🦊', color: '#E2761B', link: 'metamask://dapp/' },
                  { name: 'Coinbase', emoji: '🔵', color: '#0052FF', link: 'cbwallet://dapp' },
                  { name: 'Trust', emoji: '🛡️', color: '#3375BB', link: 'trust://send' },
                  { name: 'Rainbow', emoji: '🌈', color: '#001E59', link: 'rainbow://dapp' },
                ].map((w) => (
                  <a key={w.name} href={w.link}
                    className="flex flex-col items-center gap-1 rounded-xl bg-white border border-gray-200 py-2.5 hover:shadow-md transition-shadow">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white text-sm" style={{ backgroundColor: w.color }}>
                      {w.emoji}
                    </span>
                    <span className="text-[9px] font-medium text-gray-500">{w.name}</span>
                  </a>
                ))}
              </div>

              {/* Divider */}
              <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div><div className="relative flex justify-center"><span className="bg-gradient-to-b from-amber-50 to-orange-50 px-3 text-[10px] text-gray-400">or scan QR</span></div></div>

              {/* QR + Address */}
              <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-2xl border border-gray-100 bg-white p-3">
                    <QRCodeSVG value="ethereum:0xAeED694921f5c8B37aC7f3B2?amount=4.50" size={160} level="M" bgColor="#ffffff" fgColor="#0f172a" />
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Send exactly</p>
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-xl font-bold text-gray-900">
                    <img src="/assets/tokens/usdt.svg" alt="USDT" className="h-5 w-5" />
                    {total.toFixed(2)} USDT
                  </p>
                  <p className="mt-1 flex items-center justify-center gap-1 text-xs text-gray-400">
                    on <img src="/assets/chains/arbitrum.svg" alt="" className="h-3.5 w-3.5" /> Arbitrum
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider text-center mb-1.5">To this address</p>
                  <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-center font-mono text-[11px] text-gray-700 break-all">
                    0xAeED694921f5c8B37aC7f3B2dE91...
                  </div>
                  <p className="text-center text-[10px] text-gray-400 mt-1">Tap to copy</p>
                </div>
              </div>

              {/* Banksi badge */}
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-3 py-1.5">
                  <div className="h-3.5 w-3.5 rounded bg-indigo-600 flex items-center justify-center">
                    <span className="text-[6px] font-bold text-white">B</span>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500">Powered by Banksi</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Done ─────────────────────── */}
          {step === 'done' && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Payment Confirmed!</h2>
                <p className="mt-1 text-sm text-gray-500">Your order is being prepared ☕</p>
              </div>

              {/* Order details */}
              <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-2">
                {Array.from(cart.entries()).map(([id, qty]) => {
                  const item = menu.find((m) => m.id === id)!;
                  return (
                    <div key={id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{item.emoji} {item.name} <span className="text-gray-400">x{qty}</span></span>
                      <span className="font-semibold text-gray-900">${(item.price * qty).toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-amber-700">${total.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <img src="/assets/tokens/usdt.svg" alt="USDT" className="h-3.5 w-3.5" />
                  <span className="text-xs text-gray-400">Paid via USDT on</span>
                  <img src="/assets/chains/arbitrum.svg" alt="Arbitrum" className="h-3.5 w-3.5" />
                  <span className="text-xs text-gray-400">Arbitrum</span>
                </div>
              </div>

              {/* Dashboard link */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded bg-indigo-600 flex items-center justify-center">
                    <span className="text-[7px] font-bold text-white">B</span>
                  </div>
                  <p className="text-xs font-bold text-gray-900">Merchant Dashboard</p>
                </div>
                <p className="text-xs text-gray-500">This payment is visible in the Banksi dashboard — charts, payment history, network breakdown, and explorer links.</p>
                <a href="/login" target="_blank"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors">
                  View Dashboard
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                </a>
                <p className="text-[10px] text-gray-400">Demo: merchant@banksi.io / merchant123</p>
              </div>

              {/* Order again */}
              <button
                onClick={() => { setCart(new Map()); setStep('menu'); }}
                className="w-full rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
              >
                Order Again
              </button>

              {/* Branding */}
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-3 py-1.5">
                  <div className="h-3.5 w-3.5 rounded bg-indigo-600 flex items-center justify-center">
                    <span className="text-[6px] font-bold text-white">B</span>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500">Powered by Banksi</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
