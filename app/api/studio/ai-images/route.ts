import { NextRequest, NextResponse } from 'next/server';
import { getAdImagesBySeller } from '@/lib/ad-images-db';

export async function GET(request: NextRequest) {
  try {
    const sellerId = request.nextUrl.searchParams.get('sellerId');

    if (!sellerId) {
      return NextResponse.json({ error: 'Missing sellerId' }, { status: 400 });
    }

    const adImages = await getAdImagesBySeller(sellerId);

    return NextResponse.json({
      success: true,
      adImages,
      count: adImages.length,
    });
  } catch (error) {
    console.error('[AI Images List] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ad images' },
      { status: 500 }
    );
  }
}
