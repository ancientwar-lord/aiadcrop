const API_BASE_URL = 'https://yce-api-01.makeupar.com';
const API_KEY = process.env.YOUCAM_API_KEY!;
import { getYouCamTaskEndpoint, resolveTryOnCategory } from '@/lib/tryon-config';

export interface UploadResult {
  success: boolean;
  file_id?: string;
  error?: string;
}

export interface TaskResult {
  success: boolean;
  task_id?: string;
  polling_interval?: number;
  error?: string;
}

export interface TaskStatusResult {
  success: boolean;
  status: string;
  result?: string;
  error?: string;
}

export async function uploadFileToYouCam(params: {
  fileUrl?: string;
  fileBuffer?: Buffer;
  fileType?: string;
}): Promise<UploadResult> {
  try {
    let body: BodyInit;
    let headers: Record<string, string>;

    if (params.fileUrl) {
      headers = {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      };
      body = JSON.stringify({
        file_url: params.fileUrl,
        file_type: params.fileType || 'image',
      });
    } else if (params.fileBuffer) {
      headers = {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/octet-stream',
      };
      body = new Uint8Array(params.fileBuffer);
    } else {
      return { success: false, error: 'No file source provided' };
    }

    const response = await fetch(`${API_BASE_URL}/s2s/v2.0/file/cloth`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: err };
    }

    const data = await response.json();
    return { success: true, file_id: data.data?.file_id || data.file_id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

export async function createClothesTask(
  productFileId: string,
  userFileId: string,
  options: {
    garment_category?: string;
    change_shoes?: boolean;
  } = {}
): Promise<TaskResult> {
  try {
    const payload = {
      src_file_id: userFileId,
      ref_file_id: productFileId,
      garment_category: options.garment_category || 'tops',
    };

    const response = await fetch(`${API_BASE_URL}/s2s/v2.0/task/cloth`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Task creation failed' };
    }

    return {
      success: true,
      task_id: data.data.task_id,
      polling_interval: 2000,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Task creation failed',
    };
  }
}

export async function getTaskStatus(
  taskId: string,
  productCategory?: string
): Promise<TaskStatusResult> {
  try {
    const { mode } = resolveTryOnCategory(productCategory);
    const taskEndpoint = getYouCamTaskEndpoint(mode);

    const response = await fetch(`${API_BASE_URL}${taskEndpoint}/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      cache: 'no-store',
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, status: 'failed', error: json.error || 'API Error' };
    }

    const data = json.data;

    const status = data.task_status;

    if (status === 'success') {
      return {
        success: true,
        status: 'success',
        result: data.results?.url,
      };
    } else if (status === 'failed') {
      return {
        success: true,
        status: 'error',
        error: data.error || 'AI processing failed',
      };
    } else {
      return {
        success: true,
        status: 'processing',
      };
    }
  } catch (error) {
    return {
      success: false,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Status check failed',
    };
  }
}
