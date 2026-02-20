import { useState, useCallback } from 'react';

export interface AdImage {
  id: string;
  seller_id: string;
  prompt: string;
  negative_prompt?: string;
  task_id: string;
  template_id: string;
  status: 'processing' | 'success' | 'failed';
  result_url?: string;
  cloudinary_url?: string;
  cloudinary_public_id?: string;
  error_message?: string;
  created_at: string;
}

export interface AITemplate {
  id: string;
  title: string;
  thumb?: string;
  category_name?: string;
}

export function useAIImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [adImages, setAdImages] = useState<AdImage[]>([]);
  const [aiTemplates, setAiTemplates] = useState<AITemplate[]>([]);

  const pollAIImageStatus = useCallback(
    async (taskId: string): Promise<{ cloudinaryUrl: string; adImage?: AdImage }> => {
      const maxAttempts = 90;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const response = await fetch(`/api/studio/ai-status?taskId=${taskId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get AI image status');
        }

        if (data.status === 'success' && data.cloudinaryUrl) {
          return { cloudinaryUrl: data.cloudinaryUrl, adImage: data.adImage };
        }

        if (data.status === 'failed' || data.status === 'error') {
          throw new Error(data.error || 'Image generation failed');
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      throw new Error('Generation timeout. Please try again.');
    },
    []
  );

  const generateAIImage = useCallback(
    async (params: {
      sellerId: string;
      prompt: string;
      negativePrompt: string;
      templateId: string;
    }) => {
      setIsGenerating(true);
      try {
        const response = await fetch('/api/studio/ai-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to start AI generation');
        }

        const statusData = await pollAIImageStatus(data.taskId);

        if (statusData.adImage) {
          setAdImages((prev) => [
            statusData.adImage!,
            ...prev.filter((img) => img.id !== statusData.adImage!.id),
          ]);
        } else {
          const adImagesRes = await fetch(`/api/studio/ai-images?sellerId=${params.sellerId}`);
          if (adImagesRes.ok) {
            const adImagesData = await adImagesRes.json();
            setAdImages(adImagesData.adImages || []);
          }
        }

        return statusData.cloudinaryUrl;
      } finally {
        setIsGenerating(false);
      }
    },
    [pollAIImageStatus]
  );

  const deleteAIImage = useCallback(async (adImageId: string) => {
    const response = await fetch(`/api/studio/ai-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adImageId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete ad image');
    }

    setAdImages((prev) => prev.filter((img) => img.id !== adImageId));
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/studio/ai-templates?page_size=20');
      if (response.ok) {
        const templatesData = await response.json();
        const templates = templatesData.data?.templates || [];
        setAiTemplates(templates);
        return templates;
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
    return [];
  }, []);

  return {
    isGenerating,
    adImages,
    aiTemplates,
    generateAIImage,
    deleteAIImage,
    fetchTemplates,
    setAdImages,
    setAiTemplates,
  };
}
