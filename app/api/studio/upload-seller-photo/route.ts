import { NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary-client';
import { getYouCamFileEndpoint } from '@/lib/tryon-config';

const YOUCAM_API_KEY = process.env.YOUCAM_API_KEY;
const API_BASE = 'https://yce-api-01.makeupar.com';

interface CloudinaryUploadResult {
  secure_url: string;
  [key: string]: unknown;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileName, fileType, fileSize } = body;

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileType, fileSize' },
        { status: 400 }
      );
    }

    const fileEndpoint = getYouCamFileEndpoint('cloth');

    const youCamResponse = await fetch(`${API_BASE}${fileEndpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${YOUCAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [
          {
            content_type: fileType,
            file_name: fileName,
            file_size: fileSize,
          },
        ],
      }),
    });

    const youCamData = await youCamResponse.json();

    if (!youCamResponse.ok) {
      throw new Error(youCamData.message || 'YouCam file upload failed');
    }

    const fileData = youCamData.data?.files?.[0];

    if (!fileData || !fileData.file_id || !fileData.requests?.[0]) {
      throw new Error('Failed to get YouCam upload URLs');
    }

    return NextResponse.json({
      success: true,
      fileId: fileData.file_id,
      uploadUrl: fileData.requests[0].url,
      headers: fileData.requests[0].headers,
    });
  } catch (error) {
    console.error('[Studio Upload Seller Photo] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize upload' },
      { status: 500 }
    );
  }
}
