import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

interface SkinToneAnalysisResult {
  skinColor: string;
  detectedTones: string[];
}

interface RecommendedProduct {
  id: string;
  name: string;
  category: string;
  cloudinaryUrl: string;
  color: string;
  style: string;
  bestSkinTones: string[];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractSkinColor(results: unknown): string | null {
  if (!results || typeof results !== 'object') return null;

  const resultRecord = results as Record<string, unknown>;
  const direct = resultRecord.skin_color;

  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }

  const nested = resultRecord.result as Record<string, unknown> | undefined;
  const nestedColor = nested?.skin_color;
  if (typeof nestedColor === 'string' && nestedColor.trim()) {
    return nestedColor.trim();
  }

  return null;
}

function normalizeHexColor(hex: string): string | null {
  const normalized = hex.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;
  if (/^[0-9a-f]{6}$/.test(normalized)) return `#${normalized}`;
  return null;
}

function detectSkinTonesFromHex(hex: string): string[] {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return [];

  const red = parseInt(normalized.slice(1, 3), 16);
  const green = parseInt(normalized.slice(3, 5), 16);
  const blue = parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  let depthTone = 'medium';
  if (luminance >= 0.78) depthTone = 'fair';
  else if (luminance >= 0.68) depthTone = 'light';
  else if (luminance >= 0.56) depthTone = 'medium';
  else if (luminance >= 0.48) depthTone = 'olive';
  else if (luminance >= 0.38) depthTone = 'tan';
  else if (luminance >= 0.28) depthTone = 'deep';
  else depthTone = 'dark';

  let undertone = 'neutral';
  if (red - blue >= 14) undertone = 'warm';
  else if (blue - red >= 14) undertone = 'cool';

  return [depthTone, undertone];
}

async function runSkinToneAnalysis(
  fileId: string,
  apiKey: string
): Promise<SkinToneAnalysisResult> {
  const startResponse = await fetch(
    'https://yce-api-01.makeupar.com/s2s/v2.0/task/skin-tone-analysis',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        src_file_id: fileId,
        face_angle_strictness_level: 'high',
      }),
    }
  );

  const startData = await startResponse.json();
  if (!startResponse.ok) {
    throw new Error(startData?.message || 'Failed to start skin tone analysis');
  }

  const taskId = startData?.data?.task_id as string | undefined;
  if (!taskId) {
    throw new Error('Missing skin tone task ID');
  }

  const pollingInterval = Number(startData?.data?.polling_interval) || 1500;

  for (let attempt = 0; attempt < 40; attempt++) {
    await sleep(pollingInterval);

    const statusResponse = await fetch(
      `https://yce-api-01.makeupar.com/s2s/v2.0/task/skin-tone-analysis/${taskId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        cache: 'no-store',
      }
    );

    const statusData = await statusResponse.json();
    if (!statusResponse.ok) {
      throw new Error(statusData?.message || 'Failed to poll skin tone task');
    }

    const taskStatus = statusData?.data?.task_status;
    if (taskStatus === 'running') {
      continue;
    }

    if (taskStatus !== 'success') {
      throw new Error(statusData?.data?.error || 'Skin tone analysis failed');
    }

    const skinColor = extractSkinColor(statusData?.data?.results);
    if (!skinColor) {
      throw new Error('Skin tone analysis returned no skin color');
    }

    return {
      skinColor,
      detectedTones: detectSkinTonesFromHex(skinColor),
    };
  }

  throw new Error('Skin tone analysis polling timed out');
}

async function getRecommendedProducts(detectedTones: string[]): Promise<RecommendedProduct[]> {
  const normalizedTones = Array.from(
    new Set(detectedTones.map((tone) => tone.trim().toLowerCase()).filter(Boolean))
  );

  const result = await pool.query(
    `
      SELECT
        id,
        name,
        category,
        cloudinary_url,
        color,
        style,
        best_skin_tones,
        (
          SELECT COUNT(*)
          FROM unnest(COALESCE(best_skin_tones, ARRAY[]::TEXT[])) AS tone
          WHERE lower(tone) = ANY($1::text[])
        ) AS tone_match_score
      FROM products
      ORDER BY tone_match_score DESC, uploaded_at DESC
      LIMIT 8
    `,
    [normalizedTones]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    cloudinaryUrl: row.cloudinary_url,
    color: row.color || 'Unknown',
    style: row.style || 'General',
    bestSkinTones: Array.isArray(row.best_skin_tones) ? row.best_skin_tones : [],
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { skinToneFileId, userFileId } = body;

    const fileIdForAnalysis =
      typeof skinToneFileId === 'string' && skinToneFileId.trim()
        ? skinToneFileId.trim()
        : typeof userFileId === 'string' && userFileId.trim()
          ? userFileId.trim()
          : '';

    if (!fileIdForAnalysis) {
      return NextResponse.json(
        { error: 'Missing required fields: skinToneFileId or userFileId' },
        { status: 400 }
      );
    }

    const apiKey = process.env.YOUCAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'YOUCAM_API_KEY is not configured' }, { status: 500 });
    }

    const skinToneAnalysis = await runSkinToneAnalysis(fileIdForAnalysis, apiKey);
    const recommendations = await getRecommendedProducts(skinToneAnalysis.detectedTones);

    return NextResponse.json(
      {
        success: true,
        skinToneAnalysis,
        recommendations,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze skin tone',
      },
      { status: 500 }
    );
  }
}
