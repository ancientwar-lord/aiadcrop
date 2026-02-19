'use client';

import { useState, useEffect } from 'react';
import {  Copy, Download, Loader, AlertCircle, CheckCircle, X, Zap } from 'lucide-react';
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
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
          <button onClick={() => setSuccess(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Products List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Your Products ({products.length})
            </h2>

            {isLoadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-blue-600" />
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
                          <p className="text-sm text-gray-500 capitalize mb-2">
                            {product.category}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(product.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>

                        {/* QR Button */}
                        {!qr ? (
                          <button
                            onClick={() => generateQRCode(product)}
                            disabled={isLoading}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:bg-gray-400 flex items-center gap-2 h-fit"
                          >
                            {isLoading ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              'Generate QR'
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => closeQR(product.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition h-fit"
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
                              className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center gap-2"
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
                                  className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition flex-shrink-0"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                              <p className="font-medium mb-1">Ready to share:</p>
                              <ul className="list-disc list-inside space-y-1 text-blue-600">
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
          </div>
        </div>
      </div>
    </div>
  );
}
