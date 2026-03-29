'use client';

import { useSession } from '@/components/providers';
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

  const [products, setProducts] = useState<Product[]>([]);
  const [merchantSlug, setMerchantSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [embedProduct, setEmbedProduct] = useState<Product | null>(null);
  const [linkCopiedId, setLinkCopiedId] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Products</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.length === 0 && (
          <div className="col-span-full rounded-lg border border-border bg-surface p-8 text-center text-muted text-sm">
            No products yet. Create your first product above.
          </div>
        )}
        {products.map((product) => (
          <div
            key={product.id}
            className="rounded-lg border border-border bg-surface overflow-hidden flex flex-col"
          >
            {editingId === product.id ? (
              <div className="p-4 space-y-3">
                {/* Edit image */}
                <div className="space-y-2">
                  {editImagePreview && (
                    <div className="relative w-full h-36 rounded-lg border border-border overflow-hidden">
                      <img
                        src={editImagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeEditImage}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
                      >
                        &times;
                      </button>
                    </div>
                  )}
                  <input
                    ref={editFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleEditFileChange}
                    className="block w-full text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
                  />
                  {editUploading && (
                    <p className="text-xs text-primary">Uploading...</p>
                  )}
                </div>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-border rounded px-2 py-1.5 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
                  placeholder="Name"
                />
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full border border-border rounded px-2 py-1.5 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
                  placeholder="Description"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full border border-border rounded px-2 py-1.5 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
                  placeholder="Price"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSaveEdit(product.id)}
                    disabled={saving || editUploading}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-light transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-alt transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {product.imageUrl ? (
                  <div className="h-40 bg-surface-alt">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-surface-alt flex items-center justify-center">
                    <span className="text-3xl text-muted/30">No Image</span>
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-foreground">{product.name}</h3>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        product.isActive
                          ? 'bg-success/10 text-success'
                          : 'bg-error/10 text-error'
                      }`}
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {product.description && (
                    <p className="mt-1 text-sm text-muted flex-1">
                      {product.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">
                      ${product.priceUsd.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {product.isActive && merchantSlug && (
                        <>
                          <button
                            onClick={() => copyPaymentLink(product)}
                            className="rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                            title="Copy payment link"
                          >
                            {linkCopiedId === product.id ? 'Copied!' : 'Link'}
                          </button>
                          <button
                            onClick={() => setEmbedProduct(product)}
                            className="rounded-lg border border-accent/20 bg-accent/5 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
                          >
                            Embed
                          </button>
                        </>
                      )}
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
              </>
            )}
          </div>
        ))}
      </div>

      {/* Embed Modal */}
      {embedProduct && merchantSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 px-4" onClick={() => setEmbedProduct(null)}>
          <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Embed Payment — {embedProduct.name}</h3>
              <button onClick={() => setEmbedProduct(null)} className="text-muted hover:text-foreground transition-colors text-xl">&times;</button>
            </div>

            {/* Direct Link */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Payment Link</p>
              <p className="text-xs text-muted">Share this link or redirect users to it from your app.</p>
              <div className="flex gap-2">
                <input type="text" readOnly value={getPaymentLink(embedProduct)} className="flex-1 rounded-lg border border-border bg-surface-alt px-3 py-2 font-mono text-xs text-foreground" />
                <button onClick={() => copyPaymentLink(embedProduct)} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary-light transition-colors">
                  Copy
                </button>
              </div>
            </div>

            {/* HTML Link */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">HTML Button</p>
              <p className="text-xs text-muted">Paste this into your website.</p>
              <div className="rounded-lg bg-[#0f172a] p-3 overflow-x-auto">
                <pre className="text-xs font-mono text-white whitespace-pre-wrap">{`<a href="${getPaymentLink(embedProduct)}"
   style="display:inline-block;padding:10px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
  Pay $${embedProduct.priceUsd.toFixed(2)} with Crypto
</a>`}</pre>
              </div>
            </div>

            {/* SDK */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">React Component (SDK)</p>
              <p className="text-xs text-muted">Use the Banksi SDK in your React app.</p>
              <div className="rounded-lg bg-[#0f172a] p-3 overflow-x-auto">
                <pre className="text-xs font-mono text-white whitespace-pre-wrap">{`import { BanksiPayButton } from 'banksi/react';

<BanksiPayButton
  amount={${embedProduct.priceUsd}}
  merchantSlug="${merchantSlug}"
  onPaymentConfirmed={(id) => {
    console.log('Paid!', id);
  }}
/>`}</pre>
              </div>
            </div>

            {/* iframe */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Iframe Embed</p>
              <p className="text-xs text-muted">Embed the full payment page in an iframe.</p>
              <div className="rounded-lg bg-[#0f172a] p-3 overflow-x-auto">
                <pre className="text-xs font-mono text-white whitespace-pre-wrap">{`<iframe
  src="${getPaymentLink(embedProduct)}"
  width="450" height="700"
  style="border:none;border-radius:12px"
></iframe>`}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
