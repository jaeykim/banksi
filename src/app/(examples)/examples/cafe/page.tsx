'use client';

import { useState, useEffect, useCallback } from 'react';

interface MenuItem { id: string; name: string; desc: string; price: number; emoji: string; tag?: string; }
interface Chain { id: string; name: string; tokens: { id: string; symbol: string; name: string; contractAddress?: string; decimals?: number }[]; }
interface PayResult { paymentId: string; address: string; amountExpected: string; tokenSymbol: string; chainName: string; }

const CHAIN_HEX: Record<string, string> = { ethereum: '0x1', bsc: '0x38', arbitrum: '0xa4b1' };

const menu: MenuItem[] = [
  { id: '1', name: 'Americano', desc: 'Rich espresso with hot water', price: 4.50, emoji: '☕' },
  { id: '2', name: 'Cafe Latte', desc: 'Espresso with steamed milk', price: 5.50, emoji: '🥛', tag: 'Popular' },
  { id: '3', name: 'Matcha Latte', desc: 'Premium Japanese matcha', price: 6.50, emoji: '🍵' },
  { id: '4', name: 'Caramel Macchiato', desc: 'Vanilla, milk & caramel drizzle', price: 6.00, emoji: '🍯' },
  { id: '5', name: 'Croissant', desc: 'Freshly baked butter croissant', price: 3.50, emoji: '🥐' },
  { id: '6', name: 'Chocolate Cake', desc: 'Rich dark chocolate layer cake', price: 7.00, emoji: '🍫', tag: 'New' },
];

function buildErc20Tx(to: string, amount: string, decimals: number) {
  const a = BigInt(Math.round(parseFloat(amount) * (10 ** decimals)));
  return '0xa9059cbb' + to.toLowerCase().replace('0x','').padStart(64,'0') + a.toString(16).padStart(64,'0');
}

export default function CafeExamplePage() {
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [showPay, setShowPay] = useState(false);
  const [chains, setChains] = useState<Chain[]>([]);
  const [selChain, setSelChain] = useState('');
  const [selToken, setSelToken] = useState('');
  const [payment, setPayment] = useState<PayResult | null>(null);
  const [payStep, setPayStep] = useState<'select'|'pay'|'done'>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [wLoading, setWLoading] = useState(false);
  const [wSent, setWSent] = useState(false);
  const [walletAddr, setWalletAddr] = useState<string|null>(null);

  const total = Array.from(cart.entries()).reduce((s,[id,q]) => { const i=menu.find(m=>m.id===id); return s+(i?i.price*q:0); }, 0);
  const cartCount = Array.from(cart.values()).reduce((s,q) => s+q, 0);
  const add = (id:string) => setCart(p => { const n=new Map(p); n.set(id,(n.get(id)||0)+1); return n; });
  const rem = (id:string) => setCart(p => { const n=new Map(p); const q=(n.get(id)||0)-1; q<=0?n.delete(id):n.set(id,q); return n; });

  useEffect(() => { fetch('/api/chains').then(r=>r.json()).then(d=>setChains(d.chains||[])).catch(()=>{}); }, []);

  useEffect(() => {
    if (!payment || payStep !== 'pay') return;
    const iv = setInterval(async () => {
      try { const r=await fetch(`/api/payments/${payment.paymentId}/status`); if(r.ok){const d=await r.json(); if(['CONFIRMED','SWEPT'].includes(d.status)){setPayStep('done');clearInterval(iv);}} } catch{}
    }, 5000);
    return () => clearInterval(iv);
  }, [payment, payStep]);

  function openPay() { setShowPay(true); setPayStep('select'); setSelChain(''); setSelToken(''); setPayment(null); setError(''); setWSent(false); }

  const handleToken = useCallback(async (chain:string, token:string) => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/x402/pay', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ merchantSlug:'seoul-coffee', chainId:chain, tokenId:token, amount:total }) });
      if(!r.ok){ const d=await r.json(); throw new Error(d.error||'Failed'); }
      setPayment(await r.json()); setPayStep('pay');
    } catch(e) { setError(e instanceof Error?e.message:'Failed'); }
    finally { setLoading(false); }
  }, [total]);

  const connectWallet = useCallback(async () => {
    const eth = (window as unknown as {ethereum?:{request:(a:{method:string;params?:unknown[]})=>Promise<unknown>}}).ethereum;
    if(!eth){ setError('No wallet detected.'); return; }
    try { const accs=await eth.request({method:'eth_requestAccounts'}) as string[]; if(accs?.length) setWalletAddr(accs[0]); } catch { setError('Connection cancelled.'); }
  }, []);

  const handleWallet = useCallback(async () => {
    if(!payment) return;
    const eth = (window as unknown as {ethereum?:{request:(a:{method:string;params?:unknown[]})=>Promise<unknown>}}).ethereum;
    if(!eth){ setError('No wallet detected.'); return; }
    setWLoading(true); setError('');
    try {
      let from = walletAddr;
      if(!from){ const accs=await eth.request({method:'eth_requestAccounts'}) as string[]; if(!accs?.length) throw new Error('No account'); from=accs[0]; setWalletAddr(from); }
      const hex = CHAIN_HEX[selChain];
      if(hex){ const cur=await eth.request({method:'eth_chainId'}) as string; if(cur!==hex) try{await eth.request({method:'wallet_switchEthereumChain',params:[{chainId:hex}]})}catch{setError('Switch chain.');setWLoading(false);return;} }
      const c=chains.find(x=>x.id===selChain); const td=c?.tokens.find(t=>t.id===selToken);
      if(td?.contractAddress){ const data=buildErc20Tx(payment.address,payment.amountExpected,td.decimals||6); await eth.request({method:'eth_sendTransaction',params:[{from,to:td.contractAddress,data,value:'0x0'}]}); }
      setWSent(true);
    } catch(e:unknown){ const m=e instanceof Error?e.message:'Failed'; if(!m.includes('rejected')&&!m.includes('denied')) setError(m); }
    finally { setWLoading(false); }
  }, [payment,selChain,selToken,chains]);

  const cd = chains.find(c=>c.id===selChain);
  const S = { overlay:{position:'fixed'as const,inset:0,zIndex:99999,display:'flex',alignItems:'flex-end'as const,justifyContent:'center'as const,fontFamily:'system-ui,-apple-system,sans-serif'}, bg:{position:'fixed'as const,inset:0,background:'rgba(0,0,0,0.5)'}, sheet:{position:'relative'as const,width:'100%',maxWidth:420,maxHeight:'92vh',background:'#fff',borderRadius:'20px 20px 0 0',overflow:'auto'as const,boxShadow:'0 -8px 40px rgba(0,0,0,0.15)',animation:'bk-up .3s ease'} };
  const chip = (on:boolean) => ({padding:'10px 16px',fontSize:12,fontWeight:600,borderRadius:10,border:`2px solid ${on?'#d97706':'#e5e7eb'}`,background:on?'#fffbeb':'#fff',color:on?'#92400e':'#6b7280',cursor:'pointer'as const});

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-amber-200/50">
        <div className="mx-auto max-w-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">☕</span>
            <div>
              <h1 className="text-base font-bold text-amber-900">Seoul Coffee</h1>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-amber-600">Payments by</span>
                <div className="flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5"><div className="h-3 w-3 rounded bg-indigo-600 flex items-center justify-center"><span className="text-[6px] font-bold text-white">B</span></div><span className="text-[9px] font-semibold text-indigo-700">Banksi</span></div>
              </div>
            </div>
          </div>
          {cart.size > 0 && (
            <button onClick={openPay} className="flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-200 hover:bg-amber-700 transition-colors">
              Pay ${total.toFixed(2)}
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">{cartCount}</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="rounded-xl bg-amber-50/80 border border-amber-200/60 px-4 py-2.5 text-center">
            <p className="text-xs text-amber-700">Live demo — payments here are donations to the developer. Thank you!</p>
          </div>
          <h2 className="text-lg font-bold text-amber-900 px-1">Menu</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {menu.map(item => { const qty=cart.get(item.id)||0; return (
              <div key={item.id} className="rounded-2xl bg-white border border-amber-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
                      {item.tag && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700">{item.tag}</span>}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-amber-700">${item.price.toFixed(2)}</span>
                      {qty===0 ? <button onClick={()=>add(item.id)} className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">Add</button> : (
                        <div className="flex items-center gap-2">
                          <button onClick={()=>rem(item.id)} className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-xs hover:bg-amber-200">-</button>
                          <span className="text-sm font-bold text-gray-900 w-4 text-center">{qty}</span>
                          <button onClick={()=>add(item.id)} className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white font-bold text-xs hover:bg-amber-700">+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ); })}
          </div>
          {cart.size===0 && <p className="text-center text-xs text-amber-400 pt-2">Add items to your cart to checkout</p>}
        </div>
      </main>

      <footer className="py-5 text-center">
        <div className="inline-flex items-center gap-1.5"><span className="text-[10px] text-amber-400">Powered by</span><div className="h-3.5 w-3.5 rounded bg-indigo-600 flex items-center justify-center"><span className="text-[6px] font-bold text-white">B</span></div><span className="text-[10px] font-semibold text-amber-500">Banksi</span></div>
      </footer>

      {/* ── SDK-style Payment Overlay ── */}
      {showPay && (<>
        <style>{`@keyframes bk-up{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={S.overlay}>
          <div style={S.bg} onClick={()=>setShowPay(false)} />
          <div style={S.sheet}>
            <div style={{display:'flex',justifyContent:'center',padding:'10px 0 6px'}}><div style={{width:36,height:4,borderRadius:2,background:'#d1d5db'}} /></div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 20px 12px'}}>
              <span style={{fontSize:16,fontWeight:700,color:'#111'}}>{payStep==='done'?'Payment Confirmed!':`Pay $${total.toFixed(2)}`}</span>
              <button style={{fontSize:22,color:'#9ca3af',background:'none',border:'none',cursor:'pointer'}} onClick={()=>setShowPay(false)}>&times;</button>
            </div>
            <div style={{padding:'0 20px 24px'}}>
              {error && <p style={{fontSize:13,color:'#ef4444',marginBottom:12}}>{error}</p>}

              {payStep==='select' && (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div><p style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Wallet</p>
                    {walletAddr ? (
                      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:10,background:'#f0fdf4',border:'1px solid #bbf7d0',marginBottom:12}}>
                        <span style={{width:8,height:8,borderRadius:'50%',background:'#22c55e',flexShrink:0}} />
                        <span style={{fontSize:12,fontFamily:'monospace',color:'#166534',flex:1}}>{walletAddr.slice(0,6)}...{walletAddr.slice(-4)}</span>
                        <button onClick={()=>setWalletAddr(null)} style={{fontSize:10,color:'#9ca3af',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Disconnect</button>
                      </div>
                    ) : (
                      <button onClick={connectWallet} style={{width:'100%',padding:'10px 16px',fontSize:12,fontWeight:600,borderRadius:10,border:'2px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:12}}>⚡ Connect Wallet</button>
                    )}
                  </div>
                  <div><p style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Network</p>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{chains.map(c=>(<button key={c.id} style={{...chip(selChain===c.id),display:'flex',alignItems:'center',gap:6}} onClick={()=>{setSelChain(c.id);setSelToken('');}}><img src={`/assets/chains/${c.id}.svg`} alt="" width={16} height={16} />{c.name}</button>))}</div>
                  </div>
                  {cd && <div><p style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Token</p>
                    <div style={{display:'flex',gap:6}}>{cd.tokens.map(tk=>(<button key={tk.id} style={{...chip(selToken===tk.id),opacity:loading?0.5:1,display:'flex',alignItems:'center',gap:6}} disabled={loading} onClick={()=>{setSelToken(tk.id);handleToken(selChain,tk.id);}}><img src={`/assets/tokens/${tk.symbol.toLowerCase()}.svg`} alt="" width={16} height={16} />{tk.symbol}</button>))}</div>
                  </div>}
                  {loading && <p style={{fontSize:12,color:'#d97706',textAlign:'center'}}>Creating payment...</p>}
                </div>
              )}

              {payStep==='pay' && payment && (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div style={{textAlign:'center'}}>
                    <p style={{fontSize:10,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Send exactly</p>
                    <p style={{fontSize:28,fontWeight:800,color:'#111',lineHeight:1.2}}>{payment.amountExpected} {payment.tokenSymbol}</p>
                    <p style={{fontSize:11,color:'#9ca3af',marginTop:4}}>${total.toFixed(2)} USD &middot; {payment.chainName}</p>
                  </div>
                  {!wSent ? (
                    <button onClick={handleWallet} disabled={wLoading} style={{width:'100%',padding:12,fontSize:13,fontWeight:700,borderRadius:12,border:'none',background:'#d97706',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:wLoading?0.6:1}}>
                      {wLoading?'Confirm in wallet...':'⚡ Pay with Browser Wallet'}
                    </button>
                  ) : (
                    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:10,borderRadius:10,background:'#ecfdf5',border:'1px solid #a7f3d0'}}>
                      <span style={{fontSize:12,fontWeight:600,color:'#16a34a'}}>✓ Transaction sent! Waiting for confirmation...</span>
                    </div>
                  )}
                  <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{flex:1,height:1,background:'#e5e7eb'}} /><span style={{fontSize:10,color:'#9ca3af'}}>or scan / copy</span><div style={{flex:1,height:1,background:'#e5e7eb'}} /></div>
                  <div style={{display:'flex',justifyContent:'center'}}>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(payment.address)}`} alt="QR" width={160} height={160} style={{borderRadius:8}} />
                  </div>
                  <div>
                    <p style={{fontSize:10,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,textAlign:'center',marginBottom:6}}>Deposit address</p>
                    <div onClick={()=>{navigator.clipboard.writeText(payment.address);setCopied(true);setTimeout(()=>setCopied(false),2000);}}
                      style={{width:'100%',padding:12,fontSize:11,fontFamily:'monospace',borderRadius:10,border:'1px solid #e5e7eb',background:'#f9fafb',color:'#374151',textAlign:'center',wordBreak:'break-all',cursor:'pointer'}}>
                      {payment.address}
                    </div>
                    <p style={{fontSize:10,color:'#9ca3af',textAlign:'center',marginTop:4}}>{copied?'✓ Copied!':'Tap to copy'}</p>
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:8,borderRadius:10,background:'#fffbeb',border:'1px solid #fde68a'}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:'#f59e0b',display:'inline-block'}} /><span style={{fontSize:12,color:'#92400e'}}>Waiting for on-chain confirmation...</span>
                  </div>
                  <button onClick={()=>{setPayStep('select');setPayment(null);setSelToken('');setWSent(false);}} style={{fontSize:12,color:'#6b7280',background:'none',border:'none',cursor:'pointer',textAlign:'center'}}>← Change network / token</button>
                </div>
              )}

              {payStep==='done' && (
                <div style={{textAlign:'center',padding:'16px 0'}}>
                  <div style={{width:56,height:56,borderRadius:'50%',background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p style={{fontSize:18,fontWeight:700,color:'#15803d'}}>Payment Confirmed!</p>
                  <p style={{fontSize:12,color:'#6b7280',marginTop:8}}>Thank you for your donation ☕</p>
                  <button onClick={()=>setShowPay(false)} style={{marginTop:16,padding:'10px 40px',fontSize:13,fontWeight:600,borderRadius:8,border:'none',background:'#d97706',color:'#fff',cursor:'pointer'}}>Done</button>
                </div>
              )}
            </div>
            <div style={{display:'flex',justifyContent:'center',gap:4,padding:'4px 0 14px'}}><span style={{fontSize:9,color:'#d1d5db'}}>Powered by</span><span style={{fontSize:9,fontWeight:600,color:'#9ca3af'}}>Banksi</span></div>
          </div>
        </div>
      </>)}
    </div>
  );
}
