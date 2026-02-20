'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/context/AuthContext';
import {
  Sparkles,
  Upload,
  Wand2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  cloudinary_url: string;
  color?: string;
  style?: string;
  best_skin_tones?: string[];
}

interface Template {
  id: string;
  title: string;
  thumb: string;
  category_name: string;
}

const POPULAR_TEMPLATES: Template[] = [
  {
    id: 'male_turtleneck_studio_style',
    title: 'Studio Professional',
    thumb:
      'https://cdn.perfectcorp.com/cms/20570642-d56f-48b4-b8b8-565e8bd30060/1730791704225/M_Turtleneck Studio Style.jpg',
    category_name: 'Professional',
  },
  {
    id: 'male_contemporary_art_gallery',
    title: 'Art Gallery',
    thumb:
      'https://cdn.perfectcorp.com/cms/62c6872c-98d5-4e82-8f7a-3a3aa746892e/1730791574369/M_Contemporary Art Gallery.jpg',
    category_name: 'Lifestyle',
  },
  {
    id: 'male_debonair',
    title: 'Debonair',
    thumb:
      'https://cdn.perfectcorp.com/cms/a29648be-dc61-4f2f-9a79-a2b57ead17ee/1730791674251/mb2 (1) (2).jpg',
    category_name: 'Elegance',
  },
  {
    id: 'male_metropolis',
    title: 'Urban Metropolis',
    thumb:
      'https://cdn.perfectcorp.com/cms/23e29f2b-9e04-47ed-898e-2c06eb296163/1730790663909/male.jpg',
    category_name: 'Urban',
  },
];

const StudioPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(POPULAR_TEMPLATES[0]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [personImagePreview, setPersonImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/products/by-seller?sellerId=${user?.uid}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const pollTaskStatus = async (taskId: string): Promise<string | null> => {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/studio/status?taskId=${taskId}`);
        if (!response.ok) {
          throw new Error('Status check failed');
        }

        const data = await response.json();

        if (data.status === 'success' && data.resultUrl) {
          return data.resultUrl;
        } else if (data.status === 'failed' || data.status === 'error') {
          throw new Error('AI generation failed');
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      } catch (err) {
        throw err;
      }
    }

    throw new Error('Generation timeout');
  };

  const handlePersonImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/studio/upload-person', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setPersonImage(data.url);
      setPersonImagePreview(URL.createObjectURL(file));
      setSuccess('Person photo uploaded successfully!');
    } catch (err) {
      console.error('Person upload error:', err);
      setError('Failed to upload person photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!personImage) {
      setError('Please upload a person photo first');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const response = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: personImage,
          templateId: selectedTemplate.id,
          prompt: prompt || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const { taskId } = await response.json();
      const resultUrl = await pollTaskStatus(taskId);

      if (resultUrl) {
        setGeneratedImage(resultUrl);
        setSuccess('AI Studio image generated successfully!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `studio-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Please log in to access the studio</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1 text-sm font-medium text-emerald-800">
            <Sparkles className="h-4 w-4" />
            AI Studio Generator
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Generate AI Studio Images
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
            Upload a person/model photo and transform it with AI-powered studio photography using
            custom templates and prompts
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
            Step 1 · Upload Person Photo
          </h2>

          <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center transition hover:border-emerald-400 hover:bg-emerald-50">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="personImageInput"
              onChange={handlePersonImageUpload}
              disabled={isUploading}
            />
            <label htmlFor="personImageInput" className="block cursor-pointer">
              {personImagePreview ? (
                <div className="space-y-3">
                  <div className="relative mx-auto h-56 max-w-md overflow-hidden rounded-xl border border-emerald-200 bg-white">
                    <Image
                      src={personImagePreview}
                      alt="Person photo"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <p className="text-sm font-medium text-emerald-700">Person photo uploaded</p>
                  <p className="text-xs text-gray-500">Click to change photo</p>
                </div>
              ) : (
                <>
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                    {isUploading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Upload className="h-6 w-6" />
                    )}
                  </div>
                  <p className="font-medium text-gray-800">
                    {isUploading ? 'Uploading...' : 'Click to upload person/model photo'}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    PNG, JPG, GIF · Recommended: Clear face photo for best results
                  </p>
                </>
              )}
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-lime-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <ImageIcon className="h-6 w-6 text-emerald-600" />
            Step 2 · Product Reference (Optional)
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-12 text-center">
              <ImageIcon className="mx-auto mb-3 h-12 w-12 text-gray-400" />
              <p className="font-medium text-gray-800">No products uploaded yet</p>
              <p className="mt-1 text-sm text-gray-500">
                Products can provide color/style context (optional)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
                    selectedProduct?.id === product.id
                      ? 'border-emerald-500 ring-2 ring-emerald-200'
                      : 'border-gray-200 hover:border-emerald-300'
                  }`}
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
                  {selectedProduct?.id === product.id && (
                    <div className="absolute right-2 top-2 rounded-full bg-gradient-to-br from-lime-600 to-emerald-500 p-1">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="bg-white p-3">
                    <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="truncate text-xs text-gray-500">{product.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-lime-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <Sparkles className="h-6 w-6 text-emerald-600" />
            Step 3 · Choose Style Template
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {POPULAR_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`group overflow-hidden rounded-xl border-2 transition-all ${
                  selectedTemplate.id === template.id
                    ? 'border-emerald-500 ring-2 ring-emerald-200'
                    : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                <div className="relative aspect-square">
                  <Image
                    src={template.thumb}
                    alt={template.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="bg-white p-3">
                  <p className="text-sm font-medium text-gray-900">{template.title}</p>
                  <p className="text-xs text-gray-500">{template.category_name}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-lime-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <Wand2 className="h-6 w-6 text-emerald-600" />
            Step 4 · Add Custom Prompt (Optional)
          </h2>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Professional studio lighting, clean background, elegant pose..."
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            rows={3}
          />

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-lime-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-lime-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating AI Image...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Studio Image
              </>
            )}
          </button>
        </section>

        {generatedImage && (
          <section className="rounded-2xl border border-lime-100 bg-white p-6 shadow-sm md:p-8">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-gray-900">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              Generated Result
            </h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {personImagePreview && (
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Original Person Photo</p>
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-gray-200">
                    <Image
                      src={personImagePreview}
                      alt="Original"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>
              )}

              <div className={personImagePreview ? '' : 'md:col-span-2'}>
                <p className="mb-2 text-sm font-medium text-gray-700">AI Studio Generated</p>
                <div className="relative aspect-square overflow-hidden rounded-xl border border-emerald-200">
                  <Image
                    src={generatedImage}
                    alt="Generated"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <button
                  onClick={downloadImage}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-lime-600 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:from-lime-700 hover:to-emerald-600"
                >
                  <Upload className="h-4 w-4" />
                  Download Image
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default StudioPage;
