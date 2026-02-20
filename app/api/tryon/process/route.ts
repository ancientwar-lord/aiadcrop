import { NextResponse } from 'next/server';
import {
  buildYouCamTaskPayload,
  getYouCamTaskEndpoint,
  resolveTryOnCategory,
} from '@/lib/tryon-config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userFileId, productImageUrl, productCategory, gender } = body;

    if (!userFileId || !productImageUrl) {
      console.error('Missing fields:', { userFileId, productImageUrl });
      return NextResponse.json(
        { error: 'Missing required fields: userFileId or productImageUrl' },
        { status: 400 }
      );
    }

    const apiKey = process.env.YOUCAM_API_KEY;
    const resolvedCategory = resolveTryOnCategory(productCategory);
    const taskEndpoint = getYouCamTaskEndpoint(resolvedCategory.mode);
    const payload = buildYouCamTaskPayload({
      mode: resolvedCategory.mode,
      userFileId,
      productImageUrl,
      garmentCategory: resolvedCategory.garmentCategory,
      gender,
    });

    const response = await fetch(`https://yce-api-01.makeupar.com${taskEndpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('YouCam Task Error:', data);
      throw new Error(data.message || 'Failed to create try-on task');
    }

    return NextResponse.json({
      success: true,
      taskId: data.data.task_id,
      pollingInterval: 2000,
    });
  } catch (error) {
    console.error('Process API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
