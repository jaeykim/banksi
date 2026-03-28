'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

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
  const merchantId = (session?.user as { merchantId?: string })?.merchantId;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function fetchProducts() {
    if (!merchantId) return;
    try {
      const res = await fetch(`/api/merchants/${merchantId}/products`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProducts(data.products);
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
  }

  function cancelEdit() {
    setEditingId(null);
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
              Image URL
            </label>
            <input
              type="url"
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
              placeholder="https://..."
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Product'}
          </button>
        </form>
      )}

      {/* Products table */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left">
              <th className="px-4 py-3 font-medium text-muted">Name</th>
              <th className="px-4 py-3 font-medium text-muted">Description</th>
              <th className="px-4 py-3 font-medium text-muted">Price</th>
              <th className="px-4 py-3 font-medium text-muted">Status</th>
              <th className="px-4 py-3 font-medium text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No products yet. Create your first product above.
                </td>
              </tr>
            )}
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-border hover:bg-surface-alt transition-colors"
              >
                {editingId === product.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border border-border rounded px-2 py-1 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full border border-border rounded px-2 py-1 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-24 border border-border rounded px-2 py-1 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          product.isActive
                            ? 'bg-success/10 text-success'
                            : 'bg-error/10 text-error'
                        }`}
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveEdit(product.id)}
                          disabled={saving}
                          className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-light transition-colors disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-alt transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {product.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      ${product.priceUsd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          product.isActive
                            ? 'bg-success/10 text-success'
                            : 'bg-error/10 text-error'
                        }`}
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(product)}
                          className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-alt transition-colors"
                        >
                          Edit
                        </button>
                        {product.isActive && (
                          <button
                            onClick={() => handleDeactivate(product.id)}
                            className="rounded-lg border border-error/20 px-3 py-1 text-xs font-medium text-error hover:bg-error/5 transition-colors"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
