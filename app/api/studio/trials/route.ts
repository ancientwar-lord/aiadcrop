import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { ensureStudioTrialsTable, getStudioTrialsBySeller } from '@/lib/studio-trials-db';

async function ensureUserExists(userId: string) {
  const checkUser = await pool.query('SELECT id FROM "user" WHERE id = $1', [userId]);

  if (checkUser.rows.length === 0) {
    await pool.query('INSERT INTO "user" (id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
  }
}

export async function GET(request: NextRequest) {
  try {
    const sellerId = request.nextUrl.searchParams.get('sellerId');

    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID is required' }, { status: 400 });
    }

    await ensureStudioTrialsTable();
    await ensureUserExists(sellerId);

    const trials = await getStudioTrialsBySeller(sellerId);

    return NextResponse.json({
      success: true,
      trials,
      total: trials.length,
    });
  } catch (error) {
    console.error('[Studio Trials] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch studio trials' }, { status: 500 });
  }
}
