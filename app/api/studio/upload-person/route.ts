import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary-client';

interface CloudinaryUploadResult {
  secure_url: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert File to Buffer
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = (await uploadToCloudinary(buffer, {
      folder: 'aiadcrop/studio/persons',
      resource_type: 'image',
    })) as CloudinaryUploadResult;

    return NextResponse.json({
      success: true,
      url: result.secure_url,
    });
  } catch (error) {
    console.error('[Person Upload] Error:', error);
    return NextResponse.json({ error: 'Failed to upload person photo' }, { status: 500 });
  }
}
