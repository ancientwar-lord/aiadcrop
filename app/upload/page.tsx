'use client';

import { useState } from 'react';
import NextImage from 'next/image';
import {
  Upload,
  Copy,
  Download,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  QrCode,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import LoadingOverlay from '@/components/LoadingOverlay';

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
  const [showQRModal, setShowQRModal] = useState(false);
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
      setQrCode(null);
      setShowQRModal(false);
      setSuccess('Product uploaded successfully! Now generate a QR code.');
      setSelectedImagePreview(null);
      setSelectedImageName('');
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
      setShowQRModal(true);
      setSuccess('QR code generated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const copyTryOnUrl = () => {
    if (qrCode?.tryOnUrl) {
      navigator.clipboard.writeText(qrCode.tryOnUrl);
      setSuccess('Try-on URL copied to clipboard!');
    }
  };

  const downloadCombinedImage = async () => {
    if (!product || !qrCode) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loadImg = (src: string) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    try {
      const productImg = await loadImg(product.cloudinaryUrl);
      const qrImg = await loadImg(qrCode.qrCode);

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
      ctx.font = `bold ${canvas.width * 0.02}px sans-serif`;
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
    <div className="min-h-screen  px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
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

        {!product ? (
          <section className="rounded-2xl border border-lime-100 bg-white p-6 shadow-sm md:p-8">
            <div className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8 ">
              <div className=" flex text-3xl font-bold tracking-tight text-gray-900 md:text-4xl gap-2">
                <Upload className="h-8 w-8 mt-2  text-emerald-600" />{' '}
                <h1>Upload product and generate try-on QR</h1>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
                Add your product image once, generate a QR instantly, and share the experience with
                customers in store or online.
              </p>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-6 mt-8">
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
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Product Image
                </label>
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
                          <NextImage
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
                        <p className="font-medium text-gray-800">
                          Click to upload or drag and drop
                        </p>
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
        ) : (
          <section className="rounded-2xl border border-lime-100 bg-white p-6 shadow-sm md:p-8">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-gray-900">
              <Upload className="h-6 w-6 text-emerald-600" />
              Uploaded Product
            </h2>

            <div className="space-y-6">
              <div className="relative mx-auto h-96 w-full max-w-md overflow-hidden rounded-2xl border border-gray-200">
                <NextImage
                  src={product.cloudinaryUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
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
          </section>
        )}
      </div>

      {/* QR Code Modal */}
      {showQRModal && product && qrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10 bg-white/80 rounded-full p-1"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-4">Your Try-On Ad</h3>

            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-[3/4] w-full">
              {/* Product Image */}
              <img
                src={product.cloudinaryUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />

              {/* Overlay Gradient for better text visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* QR Code Container */}
              <div className="absolute bottom-4 right-4 flex flex-col items-end">
                <div className="flex items-end gap-2 mb-2">
                  <div className="text-white font-bold text-sm drop-shadow-md flex flex-col items-end">
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
                    src={qrCode.qrCode}
                    alt="QR Code"
                    className="w-20 h-20"
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
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

            <button
              onClick={downloadCombinedImage}
              className="mt-6 w-full bg-gradient-to-br from-lime-600 to-emerald-500 text-white px-4 py-3 rounded-xl font-bold hover:from-lime-700 hover:to-emerald-600 transition flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Ad Image
            </button>
          </div>
        </div>
      )}

      {isLoading && <LoadingOverlay />}
    </div>
  );
}
