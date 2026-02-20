'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/context/AuthContext';
import { Loader2, Upload, Sparkles, AlertCircle, Images, Trash2, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  cloudinary_url: string;
}

interface StudioTrial {
  id: string;
  seller_id: string;
  product_id: string;
  person_image_url: string;
  gender: 'female' | 'male';
  task_id: string;
  status: 'processing' | 'success' | 'failed';
  trial_image_url: string | null;
  product_name: string;
  product_category: string;
  product_image_url: string;
  created_at: string;
}

export default function StudioPage() {
  const { user } = useAuth();

  // Trial image states
  const [products, setProducts] = useState<Product[]>([]);
  const [trials, setTrials] = useState<StudioTrial[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [personImagePreview, setPersonImagePreview] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [youcamFileId, setYoucamFileId] = useState<string | null>(null);

  // UI states
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  useEffect(() => {
    if (!user?.uid) return;

    const loadData = async () => {
      setIsPageLoading(true);
      try {
        const [productsRes, trialsRes] = await Promise.all([
          fetch(`/api/products/by-seller?sellerId=${user.uid}`),
          fetch(`/api/studio/trials?sellerId=${user.uid}`),
        ]);

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || []);
        }

        if (trialsRes.ok) {
          const trialsData = await trialsRes.json();
          setTrials(trialsData.trials || []);
        }
      } catch (fetchError) {
        console.error(fetchError);
      } finally {
        setIsPageLoading(false);
      }
    };

    loadData();
  }, [user?.uid]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      // Step 1: Get YouCam signed URLs
      const uploadInitRes = await fetch('/api/studio/upload-seller-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      const uploadInitData = await uploadInitRes.json();

      if (!uploadInitRes.ok) {
        throw new Error(uploadInitData.error || 'Failed to get upload URL');
      }

      const { fileId, uploadUrl, headers } = uploadInitData;

      // Step 2: Upload to YouCam
      const youCamUploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: file,
      });

      if (!youCamUploadRes.ok) {
        throw new Error('Failed to upload to YouCam');
      }

      setYoucamFileId(fileId);
      setPersonImagePreview(URL.createObjectURL(file));
      setSuccess('Seller photo uploaded successfully. Ready to generate trial image.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload image');
      setYoucamFileId(null);
    } finally {
      setIsUploading(false);
    }
  };

  const pollStatus = async (
    taskId: string
  ): Promise<{ resultUrl: string; trial?: StudioTrial }> => {
    const maxAttempts = 90;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`/api/studio/status?taskId=${taskId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get trial status');
      }

      if (data.status === 'success' && data.resultUrl) {
        return { resultUrl: data.resultUrl, trial: data.trial };
      }

      if (data.status === 'failed' || data.status === 'error') {
        throw new Error(data.error || 'Trial generation failed');
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error('Generation timeout. Please try again.');
  };

  const handleGenerate = async () => {
    if (!user?.uid) return;
    if (!youcamFileId) {
      setError('Please upload seller photo first');
      return;
    }
    if (!selectedProductId) {
      setError('Please select a product');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsGenerating(true);
    setGeneratedImageUrl(null);

    try {
      const response = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: user.uid,
          youcamFileId,
          productId: selectedProductId,
          gender,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start generation');
      }

      const statusData = await pollStatus(data.taskId);

      setGeneratedImageUrl(statusData.resultUrl);
      setSuccess('Trial image generated and saved to Cloudinary + database.');

      if (statusData.trial) {
        const trial = statusData.trial;
        setTrials((prev) => [trial, ...prev.filter((t) => t.id !== trial.id)]);
      } else {
        const trialsRes = await fetch(`/api/studio/trials?sellerId=${user.uid}`);
        if (trialsRes.ok) {
          const trialsData = await trialsRes.json();
          setTrials(trialsData.trials || []);
        }
      }
    } catch (generateError) {
      setError(
        generateError instanceof Error ? generateError.message : 'Failed to generate trial image'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const reuseTrialAsInput = (trial: StudioTrial) => {
    setPersonImagePreview(trial.trial_image_url);
    setSelectedProductId(trial.product_id);
    setGender(trial.gender);
    setGeneratedImageUrl(trial.trial_image_url);
    setYoucamFileId(null);
    setError(null);
    setSuccess('Loaded previous trial. Re-upload seller photo to generate a new variant.');
  };

  const handleDeleteTrial = async (trialId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this trial image?')) return;

    try {
      const response = await fetch(`/api/studio/delete-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trialId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete trial');
      }

      setTrials((prev) => prev.filter((t) => t.id !== trialId));
      setSuccess('Trial image deleted successfully.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete trial');
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Please log in to access studio</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl ">
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{success}</p>
          </div>
        )}
        <div className="mb-12 bg-white rounded-2xl p-3">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1 text-sm font-medium text-emerald-800">
            <Sparkles className="h-4 w-4" />
            Ai Studio
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Seller Ad Studio
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
            Upload photo, select your uploaded product, choose gender, and generate your ad image.
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {generatedImageUrl ? (
              <section className="rounded-2xl border border-lime-100 bg-white p-6 shadow-sm md:p-8 relative">
                <button
                  onClick={() => {
                    setGeneratedImageUrl(null);
                    setPersonImagePreview(null);
                    setYoucamFileId(null);
                    setError(null);
                  }}
                  className="absolute top-4 right-4 rounded-lg bg-gray-200 text-gray-700 p-2 hover:bg-gray-300 transition"
                  title="Back to upload"
                >
                  <X className="h-5 w-5" />
                </button>
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Generated Trial Image</h2>
                <div className="rounded-2xl border border-emerald-200 overflow-hidden bg-white">
                  <div className="relative aspect-square">
                    <Image
                      src={generatedImageUrl}
                      alt="Generated trial"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>
              </section>
            ) : (
              <>
                <section className="rounded-2xl border border-lime-100 bg-white p-6 shadow-sm md:p-8">
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">Upload Seller Photo</h2>
                  <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="studioPhotoInput"
                      onChange={handlePhotoUpload}
                      disabled={isUploading}
                    />
                    <label htmlFor="studioPhotoInput" className="block cursor-pointer">
                      {personImagePreview ? (
                        <div className="space-y-3">
                          <div className="relative mx-auto h-56 max-w-md overflow-hidden rounded-xl border border-emerald-200 bg-white">
                            <Image
                              src={personImagePreview}
                              alt="Seller photo"
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                          <p className="text-sm text-gray-600">Click to change photo</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                            {isUploading ? (
                              <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                              <Upload className="h-6 w-6" />
                            )}
                          </div>
                          <p className="font-medium text-gray-800">
                            {isUploading ? 'Uploading...' : 'Click to upload seller photo'}
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </section>
                <section className="rounded-2xl border border-lime-100 bg-white p-6 shadow-sm md:p-8 flex flex-col justify-between">
                  <div>
                    <h2 className="mb-4 text-lg font-semibold text-gray-900">
                      Select Product & Gender
                    </h2>

                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">Gender</span>
                      <button
                        type="button"
                        onClick={() => setGender('female')}
                        className={`rounded-lg px-3 py-1.5 text-sm ${gender === 'female' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                      >
                        Female
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender('male')}
                        className={`rounded-lg px-3 py-1.5 text-sm ${gender === 'male' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                      >
                        Male
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPageLoading(true);
                        setTimeout(() => setIsPageLoading(false), 500);
                        setIsProductModalOpen(true);
                      }}
                      className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-300 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      {selectedProductId
                        ? `Selected: ${products.find((p) => p.id === selectedProductId)?.name}`
                        : 'Select Product'}
                    </button>

                    {selectedProduct && (
                      <div className="mb-4">
                        <p className="mb-2 text-sm font-medium text-gray-700">Product Preview</p>
                        <div className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 h-10 w-10">
                          <Image
                            src={selectedProduct.cloudinary_url}
                            alt={selectedProduct.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !youcamFileId || !selectedProductId}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-br from-lime-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:from-lime-700 hover:to-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Trial Image
                      </>
                    )}
                  </button>
                </section>
              </>
            )}
          </div>

          <section className="rounded-2xl border border-lime-100 bg-white p-6 shadow-sm md:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Images className="h-5 w-5 text-emerald-600" />
              Previous Trial Images
            </h2>

            {trials.length === 0 ? (
              <p className="text-sm text-gray-600">No previous trial images yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {trials.map((trial) => (
                  <div
                    key={trial.id}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition hover:border-emerald-300"
                  >
                    <button
                      onClick={() => reuseTrialAsInput(trial)}
                      disabled={trial.status !== 'success'}
                      className="block w-full disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="relative aspect-square bg-gray-100 group">
                        {trial.trial_image_url ? (
                          <Image
                            src={trial.trial_image_url}
                            alt={trial.product_name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-gray-500">
                            {trial.status === 'processing' ? 'Processing...' : 'Generation failed'}
                          </div>
                        )}
                        <button
                          onClick={(e) => handleDeleteTrial(trial.id, e)}
                          className="absolute top-2 right-2 rounded-lg bg-red-500 text-white p-2 opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                          title="Delete trial"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </button>
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {trial.product_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {trial.product_category} · {trial.gender} · {trial.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {selectedProduct && (
            <p className="mt-4 text-xs text-gray-500">
              Selected product: {selectedProduct.name} ({selectedProduct.category})
            </p>
          )}
        </div>
      </div>

      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-gray-900">Select Product</h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {isPageLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
                No uploaded products found.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setSelectedProductId(product.id);
                      setIsProductModalOpen(false);
                    }}
                    className={`overflow-hidden rounded-xl border-2 text-left transition ${selectedProductId === product.id ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-gray-200 hover:border-emerald-300'}`}
                  >
                    <div className="relative aspect-square">
                      <Image
                        src={product.cloudinary_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="bg-white p-3">
                      <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="truncate text-xs text-gray-500">{product.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
