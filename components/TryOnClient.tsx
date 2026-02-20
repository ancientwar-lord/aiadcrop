'use client';

import { useState } from 'react';
import { Upload, Loader, Eye, Share2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ProductData {
  id: string;
  name: string;
  cloudinaryUrl: string;
  category: string;
}

interface TaskStatus {
  success: boolean;
  status: string;
  resultImageUrl?: string;
  errorMessage?: string;
}

interface SkinToneAnalysis {
  skinColor: string;
  detectedTones: string[];
}

interface RecommendedProduct {
  id: string;
  name: string;
  category: string;
  cloudinaryUrl: string;
  color: string;
  style: string;
  bestSkinTones: string[];
}

interface ClientProps {
  product: ProductData;
}

export default function TryOnClient({ product }: ClientProps) {
  // --- States ---
  const [step, setStep] = useState<'upload' | 'processing' | 'results'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gender, setGender] = useState<'female' | 'male'>('female');

  const [userImage, setUserImage] = useState<File | null>(null);
  const [userImagePreview, setUserImagePreview] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const [skinToneAnalysis, setSkinToneAnalysis] = useState<SkinToneAnalysis | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const needsGenderInput = ['ai_bag', 'ai_scarf', 'ai_shoes', 'ai_hat'].includes(product.category);

  // --- Image Preview Handler ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB Check
        setError('File size too large (Max 10MB)');
        return;
      }
      setUserImage(file);
      setError(null);

      const reader = new FileReader();
      reader.onloadend = () => setUserImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- MAIN LOGIC: Upload & Process ---
  const uploadAndProcess = async () => {
    if (!userImage) return;
    setIsLoading(true);
    setError(null);
    setSkinToneAnalysis(null);
    setRecommendedProducts([]);

    try {
      const initRes = await fetch('/api/tryon/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: userImage.name,
          fileType: userImage.type,
          fileSize: userImage.size,
          productCategory: product.category,
        }),
      });

      if (!initRes.ok) {
        const errData = await initRes.json();
        throw new Error(errData.error || 'Upload init failed');
      }

      const { uploadUrl, fileId, headers, skinTone } = await initRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: headers,
        body: userImage,
      });

      if (!uploadRes.ok) throw new Error('Failed to upload image to AI server');

      if (skinTone?.uploadUrl && skinTone?.headers) {
        const skinToneUploadRes = await fetch(skinTone.uploadUrl, {
          method: 'PUT',
          headers: skinTone.headers,
          body: userImage,
        });

        if (!skinToneUploadRes.ok) {
          console.warn('Skin tone image upload failed, continuing with try-on flow');
        }
      }

      const processRes = await fetch('/api/tryon/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userFileId: fileId,
          skinToneFileId: skinTone?.fileId,
          productImageUrl: product.cloudinaryUrl,
          productCategory: product.category,
          gender,
        }),
      });

      const processData = await processRes.json();
      if (!processRes.ok) throw new Error(processData.error || 'Processing failed');

      try {
        const skinToneRes = await fetch('/api/tryon/skin-tone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            skinToneFileId: skinTone?.fileId,
            userFileId: fileId,
          }),
        });

        const skinToneData = await skinToneRes.json();
        if (skinToneRes.ok) {
          setSkinToneAnalysis(skinToneData.skinToneAnalysis || null);
          setRecommendedProducts(
            Array.isArray(skinToneData.recommendations) ? skinToneData.recommendations : []
          );
        } else {
          console.warn('Skin tone analysis failed:', skinToneData?.error || 'Unknown error');
        }
      } catch (skinToneError) {
        console.warn('Skin tone recommendation request failed:', skinToneError);
      }

      // Start Polling
      setStep('processing');
      pollForResults(processData.taskId, processData.pollingInterval);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  // --- Polling Logic ---
  const pollForResults = async (id: string, interval: number) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 mins max

    const poll = async () => {
      try {
        const params = new URLSearchParams({
          taskId: id,
          productCategory: product.category,
        });
        const res = await fetch(`/api/tryon/status?${params.toString()}`);
        const data: TaskStatus = await res.json();

        setPollingCount((prev) => prev + 1);

        if (data.success && data.status === 'success') {
          setResultImage(data.resultImageUrl || null);
          setStep('results');
          setIsLoading(false);
        } else if (data.success && data.status === 'error') {
          setError(data.errorMessage || 'AI processing failed');
          setStep('upload');
          setIsLoading(false);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, interval);
        } else {
          setError('Processing timeout. Please try again.');
          setIsLoading(false);
          setStep('upload');
        }
      } catch (e) {
        console.error('Polling error', e);
        // Continue polling even if one request fails
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, interval);
        }
      }
    };
    poll();
  };

  // --- Share Logic ---
  const shareResult = async () => {
    if (!resultImage) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Virtual Try-On',
          text: `Check out how I look in this ${product.name}!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const downloadResultWithQR = async () => {
    if (!resultImage) return;

    setIsDownloading(true);
    setError(null);

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
        throw new Error(errorData.error || 'Failed to generate QR code for download');
      }

      const qrData = await response.json();
      const tryOnUrl = qrData.tryOnUrl || window.location.href;
      const qrCodeUrl = qrData.qrCode;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to prepare image canvas');

      const resultImg = await loadImg(resultImage);
      const qrImg = await loadImg(qrCodeUrl);

      canvas.width = resultImg.width;
      canvas.height = resultImg.height;

      ctx.drawImage(resultImg, 0, 0);

      const gradient = ctx.createLinearGradient(0, canvas.height * 0.68, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, canvas.height * 0.68, canvas.width, canvas.height * 0.32);

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
      ctx.font = `bold ${Math.max(22, canvas.width * 0.032)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText('Try this on you', padding, qrY + qrSize * 0.45);

      const maxUrlWidth = canvas.width - qrSize - padding * 3;
      ctx.font = `${Math.max(14, canvas.width * 0.018)}px sans-serif`;
      const trimmedUrl =
        ctx.measureText(tryOnUrl).width > maxUrlWidth ? `${tryOnUrl.slice(0, 55)}...` : tryOnUrl;
      ctx.fillText(trimmedUrl, padding, qrY + qrSize * 0.72);

      const link = document.createElement('a');
      link.download = `tryon-result-${product.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to download try-on with QR', err);
      setError(err instanceof Error ? err.message : 'Failed to download image with QR');
    } finally {
      setIsDownloading(false);
    }
  };

  // --- UI RENDER ---
  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 to-pink-100 p-4 md:p-8 md:pt-2">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Welcome to the digital trial room!
        </h1>
        <p className="text-gray-600 mb-8">
          See how this <span className="font-semibold">{product.name}</span> looks on you instantly
          with AI.
        </p>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 animate-pulse">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {step === 'upload' && (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left: Product Info */}
              <div className="bg-gray-50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200">
                <div className="relative aspect-3/4 w-full max-w-sm overflow-hidden rounded-lg shadow-md">
                  <img
                    src={product.cloudinaryUrl}
                    alt={product.name}
                    className="object-cover w-full h-full"
                  />
                </div>
                <h2 className="mt-4 text-xl font-bold text-gray-800">{product.name}</h2>
              </div>

              {/* Right: Upload Area */}
              <div className="p-8 flex flex-col justify-center">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload Your Photo</h2>

                {needsGenderInput && (
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as 'female' | 'male')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                    </select>
                  </div>
                )}

                {!userImagePreview ? (
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-purple-300 border-dashed rounded-lg cursor-pointer bg-purple-50 hover:bg-purple-100 transition duration-300">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-12 h-12 text-purple-500 mb-4" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold text-purple-600">Click to upload</span> or
                        drag and drop
                      </p>
                      <p className="text-xs text-gray-400">PNG, JPG (MAX. 10MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </label>
                ) : (
                  <div className="relative w-full h-64 rounded-lg overflow-hidden group">
                    <img
                      src={userImagePreview}
                      alt="User"
                      className="w-full h-full object-contain bg-gray-900"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => {
                          setUserImage(null);
                          setUserImagePreview(null);
                          setSkinToneAnalysis(null);
                          setRecommendedProducts([]);
                        }}
                        className="text-white underline"
                      >
                        Change Photo
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={uploadAndProcess}
                  disabled={!userImage || isLoading}
                  className={`mt-6 w-full py-4 px-6 rounded-lg font-bold text-white text-lg shadow-lg transform transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2
                            ${!userImage || isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'}
                        `}
                >
                  {isLoading ? (
                    <>
                      <Loader className="animate-spin" /> Processing...
                    </>
                  ) : (
                    'Generate Try-On'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Processing UI */}
        {step === 'processing' && (
          <div className="bg-white rounded-xl shadow-xl p-16 text-center max-w-2xl mx-auto">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-purple-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
              <Loader className="absolute inset-0 m-auto text-purple-600 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Magic in progress...</h2>
            <p className="text-gray-500">
              We are fitting the {product.name} on you. This typically takes 15-20 seconds.
            </p>
            <div className="mt-6 text-xs text-gray-400">Status Check #{pollingCount}</div>
          </div>
        )}

        {/* STEP 3: Results UI */}
        {step === 'results' && resultImage && (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="bg-green-50 p-4 text-center border-b border-green-100">
              <h2 className="text-green-800 font-bold flex items-center justify-center gap-2">
                <Eye className="w-5 h-5" /> Virtual Try-On Successful!
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="p-8 bg-gray-50 flex flex-col items-center">
                <span className="text-gray-500 font-medium mb-4 uppercase text-sm tracking-wider">
                  Before
                </span>
                <img
                  src={userImagePreview || ''}
                  alt="Original"
                  className="max-h-96 rounded-lg shadow-md"
                />
              </div>
              <div className="p-8 bg-white flex flex-col items-center relative">
                <span className="text-purple-600 font-bold mb-4 uppercase text-sm tracking-wider">
                  After (AI Result)
                </span>
                <img
                  src={resultImage}
                  alt="Result"
                  className="max-h-96 rounded-lg shadow-lg border-2 border-purple-100"
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={downloadResultWithQR}
                disabled={isDownloading}
                className="flex-1 max-w-xs bg-gray-900 text-white py-3 px-6 rounded-lg font-medium text-center hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isDownloading ? 'Preparing download...' : 'Download Image'}
              </button>
              <button
                onClick={shareResult}
                className="flex-1 max-w-xs bg-purple-100 text-purple-700 py-3 px-6 rounded-lg font-medium hover:bg-purple-200 transition flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
              <button
                onClick={() => {
                  setStep('upload');
                  setUserImage(null);
                  setUserImagePreview(null);
                  setSkinToneAnalysis(null);
                  setRecommendedProducts([]);
                }}
                className="flex-1 max-w-xs border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-100 transition"
              >
                Try Another Photo
              </button>
            </div>

            {(skinToneAnalysis || recommendedProducts.length > 0) && (
              <div className="border-t border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Personalized recommendation
                </h3>

                {skinToneAnalysis && (
                  <p className="text-sm text-gray-600 mb-4">
                    Detected skin tone color:{' '}
                    <span className="font-medium">{skinToneAnalysis.skinColor}</span>
                    {skinToneAnalysis.detectedTones.length > 0
                      ? ` (${skinToneAnalysis.detectedTones.join(', ')})`
                      : ''}
                  </p>
                )}

                {recommendedProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {recommendedProducts.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-gray-200 overflow-hidden bg-white"
                      >
                        <img
                          src={item.cloudinaryUrl}
                          alt={item.name}
                          className="h-32 w-full object-cover"
                        />
                        <div className="p-3">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No matching products found yet.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
