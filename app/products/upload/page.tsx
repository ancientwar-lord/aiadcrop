'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Upload,
  Copy,
  Download,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  QrCode,
  Shirt,
} from 'lucide-react';
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
  { value: 'cloth_upper_body', label: 'Clothes · Upper Body (Top, Shirt, Jacket)' },
  { value: 'cloth_lower_body', label: 'Clothes · Lower Body (Jeans, Pants, Skirt)' },
  { value: 'cloth_full_body', label: 'Clothes · Full Body (Dress, Jumpsuit, Set)' },
  { value: 'cloth_auto', label: 'Clothes · Auto Detect' },
  { value: 'ai_bag', label: 'Bag' },
  { value: 'ai_scarf', label: 'Scarf' },
  { value: 'ai_shoes', label: 'Shoes' },
  { value: 'ai_hat', label: 'Hat' },
];

export default function UploadProductPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [qrCode, setQrCode] = useState<QRCode | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    productName: '',
    category: 'cloth_auto',
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      setSelectedImagePreview(null);
      setSelectedImageName('');
      return;
    }

    setSelectedImageName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
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
      uploadFormData.append('category', formData.category);
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
      setSelectedImagePreview(null);
      setSelectedImageName('');
      // Form reset
      setFormData({ productName: '', category: 'cloth_auto' });
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
    <div className="min-h-screen  px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1 text-sm font-medium text-emerald-800">
            <Sparkles className="h-4 w-4" />
            Seller Studio
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Upload product and generate try-on QR
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
            Add your product image once, generate a QR instantly, and share the experience with
            customers in store or online.
          </p>
        </header>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        <section className="rounded-2xl border border-lime-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <Upload className="h-6 w-6 text-emerald-600" />
            Step 1 · Upload Product
          </h2>

          <form onSubmit={handleFileUpload} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Product Name</label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleFormChange}
                  placeholder="e.g., Red Summer Dress"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Try-On Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  This selection controls which YouCam endpoint QR try-on will use.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Product Image</label>
              <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center transition hover:border-emerald-400 hover:bg-emerald-50">
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  className="hidden"
                  id="imageInput"
                  onChange={handleImageChange}
                />
                <label htmlFor="imageInput" className="block cursor-pointer">
                  {selectedImagePreview ? (
                    <div className="space-y-3">
                      <div className="relative mx-auto h-56 max-w-md overflow-hidden rounded-xl border border-emerald-200 bg-white">
                        <Image
                          src={selectedImagePreview}
                          alt="Selected product"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <p className="text-sm font-medium text-emerald-700">{selectedImageName}</p>
                      <p className="text-xs text-gray-500">Click to change image</p>
                    </div>
                  ) : (
                    <>
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="font-medium text-gray-800">Click to upload or drag and drop</p>
                      <p className="mt-1 text-sm text-gray-500">PNG, JPG, GIF · up to 10MB</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-lime-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-lime-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              <Upload className="h-4 w-4" />
              {isLoading ? 'Uploading...' : 'Upload Product'}
            </button>
          </form>
        </section>

        {product && (
          <section className="rounded-2xl border border-lime-100 bg-white p-6 shadow-sm md:p-8">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-gray-900">
              <Shirt className="h-6 w-6 text-emerald-600" />
              Step 2 · Product Preview
            </h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-gray-200">
                <Image
                  src={product.cloudinaryUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              <div className="space-y-5">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Product Name
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">{product.name}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Category
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {CATEGORIES.find((c) => c.value === product.category)?.label ||
                      product.category}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Product ID
                  </p>
                  <p className="mt-1 break-all font-mono text-sm text-gray-800">{product.id}</p>
                </div>

                <button
                  onClick={generateQRCode}
                  disabled={isLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-lime-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:from-lime-700 hover:to-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  <QrCode className="h-4 w-4" />
                  {isLoading ? 'Generating QR Code...' : 'Generate QR Code'}
                </button>
              </div>
            </div>
          </section>
        )}

        {qrCode && (
          <section className="rounded-2xl border border-lime-100 bg-white p-6 shadow-sm md:p-8">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-gray-900">
              <QrCode className="h-6 w-6 text-emerald-600" />
              Step 3 · QR Ready
            </h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-gray-50 p-6">
                <Image
                  src={qrCode.qrCode}
                  alt="QR Code"
                  width={256}
                  height={256}
                  className="h-64 w-64 rounded-xl border-4 border-white shadow"
                  unoptimized
                />
                <button
                  onClick={downloadQRCode}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-lime-600 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:from-lime-700 hover:to-emerald-600"
                >
                  <Download className="h-4 w-4" />
                  Download QR Code
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Try-On URL</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={qrCode.tryOnUrl}
                      readOnly
                      className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-700"
                    />
                    <button
                      onClick={copyTryOnUrl}
                      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-lime-600 to-emerald-500 px-4 py-2.5 text-white transition hover:from-lime-700 hover:to-emerald-600"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="mb-2 font-semibold">How to use</p>
                  <ul className="list-disc space-y-1 pl-5 text-emerald-800">
                    <li>Print or display the QR code</li>
                    <li>Customers scan to open try-on</li>
                    <li>Share URL directly in chat or social</li>
                    <li>Customers upload photo and preview fit</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
