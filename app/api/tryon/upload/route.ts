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

    let skinToneFileData: {
      fileId: string;
      uploadUrl: string;
      headers: HeadersInit;
    } | null = null;

    try {
      const skinToneResponse = await fetch(
        'https://yce-api-01.makeupar.com/s2s/v2.0/file/skin-tone-analysis',
        {
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
        }
      );

      if (skinToneResponse.ok) {
        const skinToneData = await skinToneResponse.json();
        const skinToneFile = skinToneData?.data?.files?.[0];
        if (skinToneFile?.file_id && skinToneFile?.requests?.[0]?.url) {
          skinToneFileData = {
            fileId: skinToneFile.file_id,
            uploadUrl: skinToneFile.requests[0].url,
            headers: skinToneFile.requests[0].headers,
          };
        }
      }
    } catch (skinToneError) {
      console.warn('Skin tone upload init failed:', skinToneError);
    }

    return NextResponse.json({
      success: true,
      fileId: fileData.file_id,
      uploadUrl: fileData.requests[0].url,
      headers: fileData.requests[0].headers,
      skinTone: skinToneFileData,
    });
  } catch (error) {
    console.error('Error uploading try-on data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: String(error) },
      { status: 500 }
    );
  }
}
