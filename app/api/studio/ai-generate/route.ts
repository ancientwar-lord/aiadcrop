import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { createAdImage, ensureAdImagesTable } from '@/lib/ad-images-db';

const YOUCAM_API_KEY = process.env.YOUCAM_API_KEY;
const API_BASE = 'https://yce-api-01.makeupar.com';

interface AIGenerateRequest {
  sellerId: string;
  prompt: string;
  negativePrompt?: string;
  templateId: string;
  steps?: number;
  cfgScale?: number;
  widthRatio?: number;
  heightRatio?: number;
}

async function ensureUserExists(userId: string) {
  const checkUser = await pool.query('SELECT id FROM "user" WHERE id = $1', [userId]);

  if (checkUser.rows.length === 0) {
    await pool.query('INSERT INTO "user" (id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AIGenerateRequest;
    const {
      sellerId,
      prompt,
      negativePrompt,
      templateId,
      steps,
      cfgScale,
      widthRatio,
      heightRatio,
    } = body;

    if (!sellerId || !prompt || !templateId) {
      return NextResponse.json(
        { error: 'Missing required fields: sellerId, prompt, templateId' },
        { status: 400 }
      );
    }

    await ensureAdImagesTable();
    await ensureUserExists(sellerId);

    // Build the YouCam text-to-image task payload
    const taskPayload = {
      prompt,
      negative_prompt: negativePrompt || '',
      template_id: templateId,
      steps: steps || 10,
      cfg_scale: cfgScale || 4,
      width_ratio: widthRatio || 3,
      height_ratio: heightRatio || 4,
    };

    // Call YouCam API to create text-to-image task
    const taskResponse = await fetch(`${API_BASE}/s2s/v2.0/task/text-to-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${YOUCAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskPayload),
    });

    const taskData = await taskResponse.json();

    if (!taskResponse.ok) {
      console.error('[AI Generate] YouCam API error:', taskData);
      return NextResponse.json(
        { error: taskData.error || taskData.message || 'Failed to create AI image task' },
        { status: 500 }
      );
    }

    const taskId = taskData.data?.task_id;

    if (!taskId) {
      return NextResponse.json({ error: 'Failed to get task ID from YouCam' }, { status: 500 });
    }

    const adImageId = `ad_image_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await createAdImage({
      id: adImageId,
      sellerId,
      prompt,
      negativePrompt,
      taskId,
      templateId,
    });

    return NextResponse.json({
      success: true,
      taskId,
      adImageId,
      pollingInterval: 2000,
    });
  } catch (error) {
    console.error('[AI Generate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI generation failed' },
      { status: 500 }
    );
  }
}
