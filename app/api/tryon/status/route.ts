/**
 * API Route: GET /api/tryon/status
 * Check the status of an AI try-on task
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTaskStatus } from '@/lib/perfectCorp';

export async function GET(request: NextRequest) {
  try {
    const taskId = request.nextUrl.searchParams.get('taskId');
    const productCategory = request.nextUrl.searchParams.get('productCategory') || undefined;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Library function call karo
    const statusResult = await getTaskStatus(taskId, productCategory);

    // Agar API call hi fail ho gayi (Network error etc)
    if (!statusResult.success) {
      return NextResponse.json(
        {
          success: false,
          status: 'error',
          errorMessage: statusResult.error,
        },
        { status: 500 }
      );
    }

    // Response structure jo frontend expect kar raha hai
    return NextResponse.json(
      {
        success: true,
        taskId: taskId,
        status: statusResult.status, // 'success', 'processing', 'error'
        resultImageUrl: statusResult.result,
        errorMessage: statusResult.error,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking task status:', error);
    return NextResponse.json(
      {
        error: `Failed to check task status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
