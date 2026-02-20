import { NextResponse } from 'next/server';
import { getYouCamFileEndpoint, resolveTryOnCategory } from '@/lib/tryon-config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileName, fileType, fileSize, productCategory } = body;

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileType, fileSize' },
        { status: 400 }
      );
    }
    const { mode } = resolveTryOnCategory(productCategory);
    const fileEndpoint = getYouCamFileEndpoint(mode);

    const apikey = process.env.YOUCAM_API_KEY;
    const response = await fetch(`https://yce-api-01.makeupar.com${fileEndpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apikey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: [
          {
            content_type: fileType,
            file_name: fileName,
            file_size: fileSize,
          },
        ],
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'YouCam Api Failed');
    }
    const fileData = data.data.files[0];

    return NextResponse.json({
      success: true,
      fileId: fileData.file_id,
      uploadUrl: fileData.requests[0].url,
      headers: fileData.requests[0].headers,
    });
  } catch (error) {
    console.error('Error uploading try-on data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: String(error) },
      { status: 500 }
    );
  }
}
