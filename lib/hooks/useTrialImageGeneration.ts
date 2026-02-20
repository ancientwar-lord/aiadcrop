import { useState, useCallback } from 'react';

export interface StudioTrial {
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

export function useTrialImageGeneration(userId: string | undefined) {
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [trials, setTrials] = useState<StudioTrial[]>([]);

  const uploadPhoto = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
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

      const youCamUploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: file,
      });

      if (!youCamUploadRes.ok) {
        throw new Error('Failed to upload to YouCam');
      }

      return fileId;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const pollTrialStatus = useCallback(
    async (taskId: string): Promise<{ resultUrl: string; trial?: StudioTrial }> => {
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
    },
    []
  );

  const generateTrial = useCallback(
    async (params: {
      sellerId: string;
      youcamFileId: string;
      productId: string;
      gender: 'female' | 'male';
    }) => {
      setIsGenerating(true);
      try {
        const response = await fetch('/api/studio/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to start generation');
        }

        const statusData = await pollTrialStatus(data.taskId);

        if (statusData.trial) {
          setTrials((prev) => [
            statusData.trial!,
            ...prev.filter((t) => t.id !== statusData.trial!.id),
          ]);
        } else {
          const trialsRes = await fetch(`/api/studio/trials?sellerId=${params.sellerId}`);
          if (trialsRes.ok) {
            const trialsData = await trialsRes.json();
            setTrials(trialsData.trials || []);
          }
        }

        return statusData.resultUrl;
      } finally {
        setIsGenerating(false);
      }
    },
    [pollTrialStatus]
  );

  const deleteTrial = useCallback(async (trialId: string) => {
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
  }, []);

  const setTrialsData = setTrials;

  return {
    isUploading,
    isGenerating,
    trials,
    uploadPhoto,
    generateTrial,
    deleteTrial,
    setTrialsData,
  };
}
