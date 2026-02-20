import { NextRequest, NextResponse } from 'next/server';
import { getAdImageByTaskId, updateAdImageSuccess, updateAdImageFailed } from '@/lib/ad-images-db';
import { uploadToCloudinary } from '@/lib/cloudinary-client';

const YOUCAM_API_KEY = process.env.YOUCAM_API_KEY;
const API_BASE = 'https://yce-api-01.makeupar.com';

export async function GET(request: NextRequest) {
  try {
    const taskId = request.nextUrl.searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
    }

    const adImage = await getAdImageByTaskId(taskId);

    if (!adImage) {
      return NextResponse.json({ error: 'Ad image not found' }, { status: 404 });
    }

    // Check status with YouCam API
    const statusResponse = await fetch(`${API_BASE}/s2s/v2.0/task/text-to-image/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${YOUCAM_API_KEY}`,
      },
    });

    const statusData = (await statusResponse.json()) as {
      status?: number;
      error?: string;
      message?: string;
      data?: { task_status?: string; error_message?: string; results?: { url?: string } };
    };

    if (!statusResponse.ok) {
      console.error('[AI Status] YouCam API error:', statusData);

      if (statusData.status === 400 || statusData.error === 'Invalid task id') {
        // Task not found or expired
        await updateAdImageFailed(taskId, 'Task expired or not found');
        return NextResponse.json({
          status: 'failed',
          error: 'Task expired or not found',
        });
      }

      return NextResponse.json(
        { error: statusData.error || 'Failed to get task status' },
        { status: 500 }
      );
    }

    const taskStatus = statusData.data?.task_status;

    if (taskStatus === 'running') {
      return NextResponse.json({
        status: 'processing',
        adImage,
      });
    }

    if (taskStatus === 'failed' || statusData.data?.error_message) {
      const errorMsg = statusData.data?.error_message || 'Image generation failed';
      await updateAdImageFailed(taskId, errorMsg);
      return NextResponse.json({
        status: 'failed',
        error: errorMsg,
        adImage,
      });
    }

    if (taskStatus === 'done' || taskStatus === 'completed') {
      const results = statusData.data?.results;

      if (!results) {
        await updateAdImageFailed(taskId, 'No results in YouCam response');
        return NextResponse.json({
          status: 'failed',
          error: 'No results in response',
          adImage,
        });
      }

      const imageUrl = results.url as string;

      if (!imageUrl) {
        await updateAdImageFailed(taskId, 'No image URL in results');
        return NextResponse.json({
          status: 'failed',
          error: 'No image URL in results',
          adImage,
        });
      }

      // Download image from YouCam and upload to Cloudinary
      try {
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        const cloudinaryResult = (await uploadToCloudinary(imageBuffer, {
          folder: 'aiadcrop/ad-images',
          tags: ['ai-generated', 'text-to-image', adImage.seller_id],
        })) as { secure_url: string; public_id: string };

        const cloudinaryUrl = cloudinaryResult.secure_url;
        const publicId = cloudinaryResult.public_id;

        // Update database with Cloudinary URLs
        const updated = await updateAdImageSuccess({
          taskId,
          resultUrl: imageUrl,
          cloudinaryUrl,
          cloudinaryPublicId: publicId,
        });

        return NextResponse.json({
          status: 'success',
          cloudinaryUrl,
          adImage: updated,
        });
      } catch (uploadError) {
        console.error('[AI Status] Cloudinary upload error:', uploadError);
        await updateAdImageFailed(
          taskId,
          `Cloudinary upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
        );
        return NextResponse.json({
          status: 'failed',
          error: 'Failed to upload to Cloudinary',
          adImage,
        });
      }
    }

    // Unknown status
    return NextResponse.json({
      status: 'processing',
      taskStatus,
      adImage,
    });
  } catch (error) {
    console.error('[AI Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status check failed' },
      { status: 500 }
    );
  }
}
