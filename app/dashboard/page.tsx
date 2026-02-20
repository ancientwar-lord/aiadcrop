'use client';

import { useState, useEffect } from 'react';
import {
  Copy,
  Download,
  Loader,
  AlertCircle,
  CheckCircle,
  X,
  Zap,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

interface Product {
  id: string;
  name: string;
  category: string;
  cloudinary_url: string;
  uploaded_at: string;
}

interface QRCode {
  productId: string;
  qrCode: string;
  tryOnUrl: string;
}

const CATEGORIES = [
  { value: 'cloth_upper_body', label: 'Clothes · Upper Body (Top, Shirt, Jacket)' },
  { value: 'cloth_lower_body', label: 'Clothes · Lower Body (Jeans, Pants, Skirt)' },
  { value: 'cloth_full_body', label: 'Clothes · Full Body (Dress, Jumpsuit, Set)' },
  { value: 'cloth_auto', label: 'Clothes · Auto Detect' },
  { value: 'ai_bag', label: 'Bag' },
  { value: 'ai_scarf', label: 'Scarf' },
  { value: 'ai_shoes', label: 'Shoes' },
  { value: 'ai_hat', label: 'Hat' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [generatingProductIds, setGeneratingProductIds] = useState<Record<string, boolean>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [productQRCodes, setProductQRCodes] = useState<Record<string, QRCode>>({});
  const [selectedQRProduct, setSelectedQRProduct] = useState<Product | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', category: '' });
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const formatUploadedDate = (dateString: string) => {
    const date = new Date(dateString);
    const formatted = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);

    return formatted.replace(/\b([A-Za-z]{3})\b/, (month) => month.toLowerCase());
  };

  // Fetch seller's products
  useEffect(() => {
    if (user?.uid) {
      fetchSellerProducts();
    }
  }, [user?.uid]);

  const fetchSellerProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const response = await fetch(`/api/products/by-seller?sellerId=${user?.uid}`);

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const generateQRCode = async (product: Product) => {
    setError(null);
    setGeneratingProductIds((prev) => ({ ...prev, [product.id]: true }));

    try {
      const response = await fetch('/api/products/qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL || window.location.origin,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate QR code');
      }

      const qrData = await response.json();
      setProductQRCodes((prev) => ({ ...prev, [product.id]: qrData }));
      setSelectedQRProduct(product);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    } finally {
      setGeneratingProductIds((prev) => {
        const updated = { ...prev };
        delete updated[product.id];
        return updated;
      });
    }
  };

  const copyTryOnUrl = (productId: string) => {
    const qr = productQRCodes[productId];
    if (qr?.tryOnUrl) {
      navigator.clipboard.writeText(qr.tryOnUrl);
      setSuccess('Try-on URL copied to clipboard!');
    }
  };

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setEditForm({ name: product.name, category: product.category });
    setError(null);
  };

  const cancelEditProduct = () => {
    setEditingProductId(null);
    setEditForm({ name: '', category: '' });
  };

  const saveProductChanges = async (productId: string) => {
    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    const name = editForm.name.trim();
    const category = editForm.category.trim();

    if (!name || !category) {
      setError('Name and category are required');
      return;
    }

    setIsSavingProduct(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          sellerId: user.uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product');
      }

      setProducts((prev) =>
        prev.map((product) => (product.id === productId ? { ...product, name, category } : product))
      );
      setSuccess('Product updated successfully');
      cancelEditProduct();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    const shouldDelete = window.confirm('Are you sure you want to delete this product?');
    if (!shouldDelete) return;

    setDeletingProductId(productId);
    setError(null);

    try {
      const response = await fetch(
        `/api/products/${productId}?sellerId=${encodeURIComponent(user.uid)}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }

      setProducts((prev) => prev.filter((product) => product.id !== productId));
      setProductQRCodes((prev) => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
      if (selectedQRProduct?.id === productId) {
        setSelectedQRProduct(null);
      }
      if (editingProductId === productId) {
        cancelEditProduct();
      }
      setSuccess('Product deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setDeletingProductId(null);
    }
  };

  const downloadCombinedImage = async (product: Product) => {
    const qr = productQRCodes[product.id];
    if (!qr) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loadImg = (src: string) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    try {
      const productImg = await loadImg(product.cloudinary_url);
      const qrImg = await loadImg(qr.qrCode);

      canvas.width = productImg.width;
      canvas.height = productImg.height;

      ctx.drawImage(productImg, 0, 0);

      const gradient = ctx.createLinearGradient(0, canvas.height * 0.7, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);

      const qrSize = canvas.width * 0.2;
      const padding = canvas.width * 0.05;
      const qrX = canvas.width - qrSize - padding;
      const qrY = canvas.height - qrSize - padding;

      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 10);
      ctx.fill();

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      ctx.fillStyle = 'white';
      ctx.font = `bold ${canvas.width * 0.04}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText('Try this on you', qrX - 20, qrY + qrSize / 2);

      ctx.strokeStyle = '#a3e635';
      ctx.lineWidth = canvas.width * 0.008;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const arrowStartX = qrX - canvas.width * 0.1;
      const arrowStartY = qrY + qrSize / 2 + canvas.width * 0.02;
      const arrowEndX = qrX - 15;
      const arrowEndY = qrY + qrSize / 2 + canvas.width * 0.02;

      ctx.beginPath();
      ctx.moveTo(arrowStartX, arrowStartY);
      ctx.lineTo(arrowEndX, arrowEndY);
      ctx.lineTo(arrowEndX - canvas.width * 0.02, arrowEndY - canvas.width * 0.02);
      ctx.moveTo(arrowEndX, arrowEndY);
      ctx.lineTo(arrowEndX - canvas.width * 0.02, arrowEndY + canvas.width * 0.02);
      ctx.stroke();

      const link = document.createElement('a');
      link.download = `try-on-ad-${product.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to generate combined image', err);
      setError('Failed to download image. Please try again.');
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1 text-sm font-medium text-emerald-800">
            <Zap className="h-4 w-4" />
            Dashboard
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Your Products
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
            Manage your uploaded products and generate try-on QR codes.
          </p>
        </header>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="flex-1">{error}</p>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="flex-1">{success}</p>
            <button onClick={() => setSuccess(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <section className="rounded-2xl border border-lime-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-gray-900">
            Products ({products.length})
          </h2>

          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No products uploaded yet</p>
              <p className="text-gray-400 text-sm">
                Upload your first product using the form on the left
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => {
                const qr = productQRCodes[product.id];
                const isEditing = editingProductId === product.id;
                const isGeneratingQR = Boolean(generatingProductIds[product.id]);
                return (
                  <div
                    key={product.id}
                    className="relative border border-gray-200 rounded-lg p-4 pr-24 hover:shadow-md transition"
                  >
                    {!isEditing && (
                      <div className="absolute right-4 top-4 flex flex-col items-center gap-8">
                        <div className="flex gap-6">
                          {' '}
                          <button
                            onClick={() => startEditProduct(product)}
                            aria-label="Edit product"
                            className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            disabled={deletingProductId === product.id}
                            aria-label="Delete product"
                            className="bg-rose-500 text-white p-2 rounded-lg hover:bg-rose-600 transition disabled:bg-rose-300"
                          >
                            {deletingProductId === product.id ? (
                              <Loader className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div>
                          {' '}
                          <button
                            onClick={() => generateQRCode(product)}
                            disabled={isGeneratingQR}
                            className="bg-gradient-to-br from-lime-600 to-emerald-500 text-white px-4 py-2 rounded-lg font-medium hover:from-lime-700 hover:to-emerald-600 transition disabled:bg-gray-400 flex items-center gap-2"
                          >
                            {isGeneratingQR ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              'Generate QR'
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4">
                      {/* Product Image */}
                      <img
                        src={product.cloudinary_url}
                        alt={product.name}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />

                      {/* Product Info */}
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, name: e.target.value }))
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              placeholder="Product name"
                            />
                            <select
                              value={editForm.category}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, category: e.target.value }))
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            >
                              {CATEGORIES.map((category) => (
                                <option key={category.value} value={category.value}>
                                  {category.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <>
                            <h3 className="font-bold text-gray-900">{product.name}</h3>
                            <p className="text-sm text-gray-500 mb-2">
                              {CATEGORIES.find((category) => category.value === product.category)
                                ?.label || product.category}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatUploadedDate(product.uploaded_at)}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="flex  gap-2 h-fit">
                        {isEditing && (
                          <>
                            <button
                              onClick={() => saveProductChanges(product.id)}
                              disabled={isSavingProduct}
                              className="bg-gradient-to-br from-lime-600 to-emerald-500 text-white px-4 py-2 rounded-lg font-medium hover:from-lime-700 hover:to-emerald-600 transition disabled:bg-gray-400"
                            >
                              {isSavingProduct ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEditProduct}
                              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* QR Code Modal */}
      {selectedQRProduct && productQRCodes[selectedQRProduct.id] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setSelectedQRProduct(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10 bg-white/80 rounded-full p-1"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-4">Your Try-On Ad</h3>

            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-[3/4] w-full">
              {/* Product Image */}
              <img
                src={selectedQRProduct.cloudinary_url}
                alt={selectedQRProduct.name}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />

              {/* Overlay Gradient for better text visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* QR Code Container */}
              <div className="absolute bottom-4 right-4 flex flex-col items-end">
                <div className="flex items-end">
                  <div className="text-white font-bold text-xs drop-shadow-md flex flex-col items-end">
                    <span>Try this on you</span>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-lime-400 mt-1"
                    >
                      <path d="M3 5c7 0 10 4 10 9v1" />
                      <path d="M9 11l4 4 4-4" />
                    </svg>
                  </div>
                </div>
                <div className="bg-white p-1.5 rounded-lg shadow-lg">
                  <img
                    src={productQRCodes[selectedQRProduct.id]?.qrCode}
                    alt="QR Code"
                    className="w-20 h-20"
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Try-On URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={productQRCodes[selectedQRProduct.id]?.tryOnUrl || ''}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs"
                />
                <button
                  onClick={() => copyTryOnUrl(selectedQRProduct.id)}
                  className="bg-gradient-to-br from-lime-600 to-emerald-500 text-white px-3 py-2 rounded-lg hover:from-lime-700 hover:to-emerald-600 transition flex-shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={() => downloadCombinedImage(selectedQRProduct)}
              className="mt-6 w-full bg-gradient-to-br from-lime-600 to-emerald-500 text-white px-4 py-3 rounded-xl font-bold hover:from-lime-700 hover:to-emerald-600 transition flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Product Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
