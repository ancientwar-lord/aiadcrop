import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary-client';
import {
  ensureStudioTrialsTable,
  getStudioTrialByTaskId,
  updateStudioTrialFailed,
  updateStudioTrialSuccess,
} from '@/lib/studio-trials-db';
import { getTaskStatus } from '@/lib/perfectCorp';

export async function GET(request: NextRequest) {
  try {
    const taskId = request.nextUrl.searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    await ensureStudioTrialsTable();

    const existingTrial = await getStudioTrialByTaskId(taskId);

    if (!existingTrial) {
      return NextResponse.json({ error: 'Trial record not found for task' }, { status: 404 });
    }

    if (existingTrial.status === 'success' && existingTrial.trial_image_url) {
      return NextResponse.json({
        success: true,
        status: 'success',
        resultUrl: existingTrial.trial_image_url,
        trial: existingTrial,
      });
    }

    if (existingTrial.status === 'failed') {
      return NextResponse.json({
        success: true,
        status: 'failed',
        error: existingTrial.error_message || 'Trial generation failed',
      });
    }

    const statusResult = await getTaskStatus(taskId, existingTrial.product_category);

    if (!statusResult.success) {
      return NextResponse.json(
        { error: statusResult.error || 'Status check failed' },
        { status: 500 }
      );
    }

    const taskStatus = statusResult.status;
    const sourceResultUrl = statusResult.result;

    if (taskStatus === 'success' && sourceResultUrl) {
      const generatedResponse = await fetch(sourceResultUrl);

      if (!generatedResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch generated trial image from provider' },
          { status: 500 }
        );
      }

      const generatedBuffer = Buffer.from(await generatedResponse.arrayBuffer());

      const uploaded = (await uploadToCloudinary(generatedBuffer, {
        folder: 'aiadcrop/studio/trials',
        public_id: `trial-${existingTrial.seller_id}-${Date.now()}`,
        tags: ['studio', 'trial', existingTrial.seller_id],
      })) as { secure_url: string; public_id: string };

      const updatedTrial = await updateStudioTrialSuccess({
        taskId,
        sourceResultUrl,
        trialImageUrl: uploaded.secure_url,
        trialImagePublicId: uploaded.public_id,
      });

      return NextResponse.json({
        success: true,
        status: 'success',
        resultUrl: uploaded.secure_url,
        trial: updatedTrial,
      });
    }

    if (taskStatus === 'failed' || taskStatus === 'error') {
      const errorMessage = statusResult.error || 'AI generation failed';
      await updateStudioTrialFailed(taskId, errorMessage);
    }

    return NextResponse.json({
      success: true,
      status: taskStatus,
      resultUrl: null,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status check failed' },
      { status: 500 }
    );
  }
}
