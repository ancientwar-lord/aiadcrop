import { NextRequest, NextResponse } from 'next/server';
import { deleteAdImage } from '@/lib/ad-images-db';
import { deleteFromCloudinary } from '@/lib/cloudinary-client';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { adImageId?: string };
    const { adImageId } = body;

    if (!adImageId) {
      return NextResponse.json({ error: 'Missing adImageId' }, { status: 400 });
    }

    const adImage = await deleteAdImage(adImageId);

    if (!adImage) {
      return NextResponse.json({ error: 'Ad image not found' }, { status: 404 });
    }

    // Delete from Cloudinary if URL exists
    if (adImage.cloudinary_public_id) {
      try {
        await deleteFromCloudinary(adImage.cloudinary_public_id);
      } catch (deleteError) {
        console.error('[AI Delete] Cloudinary delete error:', deleteError);
        // Don't fail if Cloudinary delete fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Ad image deleted successfully',
    });
  } catch (error) {
    console.error('[AI Delete] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete ad image' },
      { status: 500 }
    );
  }
}
