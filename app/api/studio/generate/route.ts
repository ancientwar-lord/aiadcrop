import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import {
  buildYouCamTaskPayload,
  getYouCamTaskEndpoint,
  resolveTryOnCategory,
} from '@/lib/tryon-config';
import { getProductById } from '@/lib/products-db';
import { createStudioTrial, ensureStudioTrialsTable } from '@/lib/studio-trials-db';

const YOUCAM_API_KEY = process.env.YOUCAM_API_KEY;
const API_BASE = 'https://yce-api-01.makeupar.com';

interface GenerateRequest {
  sellerId: string;
  productId: string;
  gender: 'female' | 'male';
  youcamFileId: string;
}

async function ensureUserExists(userId: string) {
  const checkUser = await pool.query('SELECT id FROM "user" WHERE id = $1', [userId]);

  if (checkUser.rows.length === 0) {
    await pool.query('INSERT INTO "user" (id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateRequest;
    const { sellerId, productId, gender, youcamFileId } = body;

    if (!sellerId || !productId || !youcamFileId) {
      return NextResponse.json(
        { error: 'Missing required fields: sellerId, productId, youcamFileId' },
        { status: 400 }
      );
    }

    const product = await getProductById(productId);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.seller_id !== sellerId) {
      return NextResponse.json({ error: 'Unauthorized for this product' }, { status: 403 });
    }

    await ensureStudioTrialsTable();
    await ensureUserExists(sellerId);

    const resolvedCategory = resolveTryOnCategory(product.category);
    const taskEndpoint = getYouCamTaskEndpoint(resolvedCategory.mode);
    const taskPayload = buildYouCamTaskPayload({
      mode: resolvedCategory.mode,
      userFileId: youcamFileId,
      productImageUrl: product.cloudinary_url,
      garmentCategory: resolvedCategory.garmentCategory,
      gender,
    });

    const taskResponse = await fetch(`${API_BASE}${taskEndpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${YOUCAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskPayload),
    });

    const taskData = await taskResponse.json();

    if (!taskResponse.ok) {
      return NextResponse.json(
        { error: taskData.message || 'Failed to create try-on task' },
        { status: 500 }
      );
    }

    const taskId = taskData.data?.task_id;

    if (!taskId) {
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    const trialId = `studio_trial_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await createStudioTrial({
      id: trialId,
      sellerId,
      productId,
      personImageUrl: '', // Not stored, only final trial image is stored
      gender,
      youcamFileId,
      taskId,
    });

    return NextResponse.json({
      success: true,
      taskId,
      trialId,
      pollingInterval: 2000,
    });
  } catch (error) {
    console.error('[Studio] Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
