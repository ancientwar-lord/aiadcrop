import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { ensureStudioTrialsTable } from '@/lib/studio-trials-db';
import { v2 as cloudinary } from 'cloudinary';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
}

interface DeleteTrialRequest {
  trialId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DeleteTrialRequest;
    const { trialId } = body;

    if (!trialId) {
      return NextResponse.json({ error: 'Trial ID is required' }, { status: 400 });
    }

    await ensureStudioTrialsTable();

    // Get trial details to verify ownership and get public_id
    const trialResult = await pool.query(`SELECT * FROM studio_trials WHERE id = $1`, [trialId]);

    if (trialResult.rows.length === 0) {
      return NextResponse.json({ error: 'Trial not found' }, { status: 404 });
    }

    const trial = trialResult.rows[0];

    // Delete from Cloudinary if public_id exists
    if (trial.trial_image_public_id) {
      try {
        await cloudinary.uploader.destroy(trial.trial_image_public_id);
      } catch (cloudinaryError) {
        console.error('Failed to delete from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete from database
    await pool.query(`DELETE FROM studio_trials WHERE id = $1`, [trialId]);

    return NextResponse.json({
      success: true,
      message: 'Trial deleted successfully',
    });
  } catch (error) {
    console.error('[Studio] Delete trial error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
