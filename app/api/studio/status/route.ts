import { NextRequest, NextResponse } from 'next/server';

const YOUCAM_API_KEY = process.env.YOUCAM_API_KEY;
const API_BASE = 'https://yce-api-01.makeupar.com';

export async function GET(request: NextRequest) {
  try {
    const taskId = request.nextUrl.searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const response = await fetch(`${API_BASE}/s2s/v2.0/task/ai_studio/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${YOUCAM_API_KEY}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: `Status check failed: ${error}` }, { status: 500 });
    }

    const data = await response.json();
    const taskStatus = data.data?.task_status;
    const resultUrl = data.data?.results?.url;

    return NextResponse.json({
      success: true,
      status: taskStatus,
      resultUrl: resultUrl || null,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status check failed' },
      { status: 500 }
    );
  }
}
