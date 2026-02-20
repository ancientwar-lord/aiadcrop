import { NextRequest, NextResponse } from 'next/server';

const YOUCAM_API_KEY = process.env.YOUCAM_API_KEY;
const API_BASE = 'https://yce-api-01.makeupar.com';

export async function GET(request: NextRequest) {
  try {
    const pageSize = request.nextUrl.searchParams.get('page_size') || '20';

    // Call YouCam API to get text-to-image templates
    const response = await fetch(
      `${API_BASE}/s2s/v2.0/task/template/text-to-image?page_size=${pageSize}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${YOUCAM_API_KEY}`,
        },
      }
    );

    const data = (await response.json()) as {
      status?: number;
      error?: string;
      data?: {
        templates?: Array<{ id: string; title: string; thumb?: string; category_name?: string }>;
      };
    };

    if (!response.ok) {
      console.error('[AI Templates] YouCam API error:', data);
      return NextResponse.json(
        { error: data.error || 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    // Cache friendly response
    const nextResponse = NextResponse.json({
      status: 200,
      data: data.data,
    });

    // Cache for 1 hour
    nextResponse.headers.set('Cache-Control', 'public, max-age=3600');

    return nextResponse;
  } catch (error) {
    console.error('[AI Templates] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Template fetch failed' },
      { status: 500 }
    );
  }
}
