'use client';

import { useSession } from '@/components/providers';
import { usePortalI18n } from '@/i18n/use-portal-i18n';
import { useEffect, useState, useRef } from 'react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  priceUsd: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function MerchantProductsPage() {
  const { data: session } = useSession();
  const merchantId = session?.user?.merchantId;
  const t = usePortalI18n();

  const [products, setProducts] = useState<Product[]>([]);
  const [merchantSlug, setMerchantSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkCopiedId, setLinkCopiedId] = useState<string | null>(null);
  const [storeLinkCopied, setStoreLinkCopied] = useState(false);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const formFileRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editUploading, setEditUploading] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  async function fetchProducts() {
    if (!merchantId) return;
    try {
      const [prodRes, merchantRes] = await Promise.all([
        fetch(`/api/merchants/${merchantId}/products`),
        fetch(`/api/merchants/${merchantId}`),
      ]);
      if (!prodRes.ok) throw new Error('Failed to fetch');
      const prodData = await prodRes.json();
      setProducts(prodData.products);
      if (merchantRes.ok) {
        const mData = await merchantRes.json();
        setMerchantSlug(mData.merchant?.slug || '');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (merchantId) fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  function getPaymentLink(product: Product) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/pay/select/${merchantSlug}/${product.id}`;
  }

  async function copyPaymentLink(product: Product) {
    await navigator.clipboard.writeText(getPaymentLink(product));
    setLinkCopiedId(product.id);
    setTimeout(() => setLinkCopiedId(null), 2000);
  }

  async function uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to upload image');
    }
    const data = await res.json();
    return data.imageUrl;
  }

  async function handleFormFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormImagePreview(URL.createObjectURL(file));
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      setFormImageUrl(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      setFormImagePreview(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleEditFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImagePreview(URL.createObjectURL(file));
    setEditUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      setEditImageUrl(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      setEditImagePreview(null);
    } finally {
      setEditUploading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/merchants/${merchantId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          priceUsd: parseFloat(formPrice),
          imageUrl: formImageUrl || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create product');
      }
      setFormName('');
      setFormDescription('');
      setFormPrice('');
      setFormImageUrl('');
      setFormImagePreview(null);
      if (formFileRef.current) formFileRef.current.value = '';
      setShowForm(false);
      await fetchProducts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditName(product.name);
    setEditDescription(product.description || '');
    setEditPrice(product.priceUsd.toString());
    setEditImageUrl(product.imageUrl || '');
    setEditImagePreview(product.imageUrl || null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditImagePreview(null);
    if (editFileRef.current) editFileRef.current.value = '';
  }

  async function handleSaveEdit(productId: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/merchants/${merchantId}/products/${productId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editName,
            description: editDescription,
            priceUsd: parseFloat(editPrice),
            imageUrl: editImageUrl || null,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to update product');
      }
      setEditingId(null);
      setEditImagePreview(null);
      if (editFileRef.current) editFileRef.current.value = '';
      await fetchProducts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(productId: string) {
    if (!confirm('Deactivate this product?')) return;
    try {
      const res = await fetch(
        `/api/merchants/${merchantId}/products/${productId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to deactivate product');
      }
      await fetchProducts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate product');
    }
  }

  function removeFormImage() {
    setFormImageUrl('');
    setFormImagePreview(null);
    if (formFileRef.current) formFileRef.current.value = '';
  }

  function removeEditImage() {
    setEditImageUrl('');
    setEditImagePreview(null);
    if (editFileRef.current) editFileRef.current.value = '';
  }

  if (!merchantId) {
    return (
      <div className="rounded-lg border border-error/20 bg-error/5 p-5">
        <p className="text-sm text-error">No merchant assigned to your account.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-muted text-sm">Loading...</div>;
  }

  const isDemo = products.length === 0;
  const demoProducts: Product[] = [
    { id: 'demo-1', name: 'Americano', description: 'Classic black coffee', priceUsd: 4.50, imageUrl: '/uploads/products/americano.svg', isActive: true, createdAt: '' },
    { id: 'demo-2', name: 'Cafe Latte', description: 'Espresso with steamed milk', priceUsd: 5.50, imageUrl: '/uploads/products/cafe-latte.svg', isActive: true, createdAt: '' },
    { id: 'demo-3', name: 'Matcha Latte', description: 'Premium Japanese matcha', priceUsd: 6.50, imageUrl: '/uploads/products/matcha-latte.svg', isActive: true, createdAt: '' },
    { id: 'demo-4', name: 'Croissant', description: 'Freshly baked butter croissant', priceUsd: 3.50, imageUrl: '/uploads/products/croissant.svg', isActive: true, createdAt: '' },
  ];
  const displayProducts = isDemo ? demoProducts : products;

  const storeUrl = merchantSlug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/store/${merchantSlug}` : '';

  async function copyStoreLink() {
    if (!storeUrl) return;
    await navigator.clipboard.writeText(storeUrl);
    setStoreLinkCopied(true);
    setTimeout(() => setStoreLinkCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">{t.products.title}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {/* Store link */}
      {merchantSlug && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
          <span className="text-xs text-muted flex-shrink-0">Store</span>
          <code className="flex-1 text-xs font-mono text-foreground truncate">{storeUrl}</code>
          <button onClick={copyStoreLink} className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-foreground hover:bg-surface-alt transition-colors flex-shrink-0">
            {storeLinkCopied ? 'Copied!' : 'Copy'}
          </button>
          <a href={storeUrl} target="_blank" rel="noopener noreferrer"
            className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-foreground hover:bg-surface-alt transition-colors flex-shrink-0 inline-flex items-center gap-1">
            Open
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
          </a>
        </div>
      )}

      {/* Demo banner */}
      {isDemo && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <svg className="h-4 w-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
          <p className="text-xs text-primary">Showing demo products. Add your own products above to replace these.</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      {/* Create product form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-border bg-surface p-5 space-y-4"
        >
          <h2 className="text-lg font-medium text-foreground">New Product</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
                placeholder="Product name"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Price (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                required
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
              placeholder="Optional description"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Product Image
            </label>
            <div className="flex items-start gap-4">
              {formImagePreview && (
                <div className="relative w-24 h-24 rounded-lg border border-border overflow-hidden flex-shrink-0">
                  <img
                    src={formImagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeFormImage}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
                  >
                    &times;
                  </button>
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input
                  ref={formFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFormFileChange}
                  className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
                />
                <p className="text-xs text-muted">Or enter URL directly:</p>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => {
                    setFormImageUrl(e.target.value);
                    setFormImagePreview(e.target.value || null);
                  }}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
                  placeholder="https://..."
                />
              </div>
            </div>
            {uploading && (
              <p className="text-xs text-primary">Uploading image...</p>
            )}
          </div>
          <button
            type="submit"
            disabled={creating || uploading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Product'}
          </button>
        </form>
      )}

      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayProducts.map((product) => (
          <div key={product.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm hover:shadow-md transition-shadow">
            {editingId === product.id ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  {editImagePreview && (
                    <div className="relative w-16 h-16 rounded-xl border border-border overflow-hidden">
                      <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={removeEditImage} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[8px] flex items-center justify-center">&times;</button>
                    </div>
                  )}
                  <input ref={editFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleEditFileChange}
                    className="block w-full text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary" />
                  {editUploading && <p className="text-xs text-primary">Uploading...</p>}
                </div>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name"
                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light" />
                <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description"
                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light" />
                <input type="number" step="0.01" min="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="Price"
                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light" />
                <div className="flex items-center gap-2">
                  <button onClick={() => handleSaveEdit(product.id)} disabled={saving || editUploading}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-light disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                  <button onClick={cancelEdit} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-alt">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                {product.imageUrl ? (
                  <div className="h-14 w-14 rounded-xl bg-surface-alt overflow-hidden flex-shrink-0">
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-surface-alt flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl text-muted/30">☕</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">{product.name}</h3>
                    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium flex-shrink-0 ${product.isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {product.description && (
                    <p className="text-[11px] text-muted mt-0.5 line-clamp-1">{product.description}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">${product.priceUsd.toFixed(2)}</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => startEdit(product)}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-alt transition-colors"
                      >
                        Edit
                      </button>
                      {product.isActive && (
                        <button
                          onClick={() => handleDeactivate(product.id)}
                          className="rounded-lg border border-error/20 px-2.5 py-1 text-xs font-medium text-error hover:bg-error/5 transition-colors"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
