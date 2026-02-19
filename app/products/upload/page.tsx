'use client';

import { useState } from 'react';
import { Upload, Copy, Download } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

interface Product {
  id: string;
  name: string;
  category: string;
  cloudinaryUrl: string;
}

interface QRCode {
  productId: string;
  qrCode: string;
  tryOnUrl: string;
}

// ✅ Valid Categories List (YouCam Supported)
const CATEGORIES = [
  { value: 'upper_body', label: 'Upper Body (Tops, Shirts, Jackets)' },
  { value: 'lower_body', label: 'Lower Body (Pants, Skirts, Jeans)' },
  { value: 'full_body', label: 'Full Body (Dresses, Suits, Coats)' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'auto', label: 'Auto Detect (Not confirm)' },
];

export default function UploadProductPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [qrCode, setQrCode] = useState<QRCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    productName: '',
    category: 'auto',
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (!user?.uid) {
        setError('User not authenticated');
        setIsLoading(false);
        return;
      }

      const formDataObj = new FormData(e.currentTarget);
      const imageFile = formDataObj.get('image') as File;

      if (!imageFile) {
        setError('Please select an image');
        setIsLoading(false);
        return;
      }

      const uploadFormData = new FormData();
      uploadFormData.append('image', imageFile);
      uploadFormData.append('productName', formData.productName);
      uploadFormData.append('category', formData.category); // ✅ Ab sahi value jayegi (e.g., 'upper_body')
      uploadFormData.append('sellerId', user.uid);

      const uploadResponse = await fetch('/api/products/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload product');
      }

      const uploadData = await uploadResponse.json();
      setProduct(uploadData.product);
      setSuccess('Product uploaded successfully! Now generate a QR code.');
      // Form reset
      setFormData({ productName: '', category: 'upper_body' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload product');
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!product) {
      setError('Please upload a product first');
      return;
    }

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
      setQrCode(qrData);
      setSuccess('QR code generated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCode?.qrCode) return;

    const link = document.createElement('a');
    link.href = qrCode.qrCode;
    link.download = `qr-code-${product?.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyTryOnUrl = () => {
    if (qrCode?.tryOnUrl) {
      navigator.clipboard.writeText(qrCode.tryOnUrl);
      setSuccess('Try-on URL copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Clothes Try-On</h1>
        <p className="text-gray-600 mb-8">
          Upload your product and generate a QR code for customers to try it on
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Upload Product Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Upload className="w-6 h-6" />
            Step 1: Upload Product Image
          </h2>

          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
              <input
                type="text"
                name="productName"
                value={formData.productName}
                onChange={handleFormChange}
                placeholder="e.g., Red Summer Dress"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Garment Category
              </label>
              {/* ✅ UPDATED DROPDOWN */}
              <select
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select the correct category for best AI results.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  className="hidden"
                  id="imageInput"
                />
                <label htmlFor="imageInput" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">Click to upload or drag and drop</p>
                  <p className="text-gray-400 text-sm">PNG, JPG, GIF up to 10MB</p>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {isLoading ? 'Uploading...' : 'Upload Product'}
            </button>
          </form>
        </div>

        {/* Product Preview Section */}
        {product && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Product Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <img
                  src={product.cloudinaryUrl}
                  alt={product.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-500 text-sm">Product Name</p>
                  <p className="text-gray-900 font-bold">{product.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Category</p>
                  {/* Display user-friendly label if possible */}
                  <p className="text-gray-900 font-bold capitalize">
                    {CATEGORIES.find((c) => c.value === product.category)?.label ||
                      product.category}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Product ID</p>
                  <p className="text-gray-900 font-mono text-sm break-all">{product.id}</p>
                </div>
                <button
                  onClick={generateQRCode}
                  disabled={isLoading}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:bg-gray-400"
                >
                  {isLoading ? 'Generating QR Code...' : 'Generate QR Code'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Section */}
        {qrCode && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">QR Code Generated</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col items-center">
                <img
                  src={qrCode.qrCode}
                  alt="QR Code"
                  className="w-64 h-64 border-4 border-gray-300 rounded-lg"
                />
                <button
                  onClick={downloadQRCode}
                  className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download QR Code
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-500 text-sm mb-2">Try-On URL</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={qrCode.tryOnUrl}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <button
                      onClick={copyTryOnUrl}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700">
                  <p className="font-medium mb-2">Instructions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Print or display the QR code</li>
                    <li>Customers scan to access try-on feature</li>
                    <li>Share the URL directly with customers</li>
                    <li>Users upload their photo to try on the product</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
