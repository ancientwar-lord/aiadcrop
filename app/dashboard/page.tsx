'use client';

import { useState, useEffect } from 'react';
import { Copy, Download, Loader, AlertCircle, CheckCircle, X, Zap } from 'lucide-react';
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

export default function DashboardPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [productQRCodes, setProductQRCodes] = useState<Record<string, QRCode>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    setIsLoading(true);

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
      setSuccess('QR code generated!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQRCode = (productId: string) => {
    const qr = productQRCodes[productId];
    if (!qr?.qrCode) return;

    const link = document.createElement('a');
    link.href = qr.qrCode;
    link.download = `qr-code-${productId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyTryOnUrl = (productId: string) => {
    const qr = productQRCodes[productId];
    if (qr?.tryOnUrl) {
      navigator.clipboard.writeText(qr.tryOnUrl);
      setSuccess('Try-on URL copied to clipboard!');
    }
  };

  const closeQR = (productId: string) => {
    setProductQRCodes((prev) => {
      const newQRs = { ...prev };
      delete newQRs[productId];
      return newQRs;
    });
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
                return (
                  <div
                    key={product.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <img
                        src={product.cloudinary_url}
                        alt={product.name}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />

                      {/* Product Info */}
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-500 capitalize mb-2">{product.category}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(product.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* QR Button */}
                      {!qr ? (
                        <button
                          onClick={() => generateQRCode(product)}
                          disabled={isLoading}
                          className="bg-gradient-to-br from-lime-600 to-emerald-500 text-white px-4 py-2 rounded-lg font-medium hover:from-lime-700 hover:to-emerald-600 transition disabled:bg-gray-400 flex items-center gap-2 h-fit"
                        >
                          {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'Generate QR'}
                        </button>
                      ) : (
                        <button
                          onClick={() => closeQR(product.id)}
                          className="bg-rose-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-600 transition h-fit"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* QR Code Display */}
                    {qr && (
                      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                        <div className="flex flex-col items-center">
                          <img
                            src={qr.qrCode}
                            alt="QR Code"
                            className="w-40 h-40 border-2 border-gray-300 rounded-lg"
                          />
                          <button
                            onClick={() => downloadQRCode(product.id)}
                            className="mt-2 bg-gradient-to-br from-lime-600 to-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-lime-700 hover:to-emerald-600 transition flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Try-On URL
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={qr.tryOnUrl}
                                readOnly
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs"
                              />
                              <button
                                onClick={() => copyTryOnUrl(product.id)}
                                className="bg-gradient-to-br from-lime-600 to-emerald-500 text-white px-3 py-2 rounded-lg hover:from-lime-700 hover:to-emerald-600 transition flex-shrink-0"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="bg-emerald-50 p-3 rounded-lg text-xs text-emerald-800 border border-emerald-100">
                            <p className="font-medium mb-1">Ready to share:</p>
                            <ul className="list-disc list-inside space-y-1 text-emerald-700">
                              <li>Print QR code</li>
                              <li>Share URL directly</li>
                              <li>Customers scan to try-on</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
