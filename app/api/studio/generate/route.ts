import { NextRequest, NextResponse } from 'next/server';

const YOUCAM_API_KEY = process.env.YOUCAM_API_KEY;
const API_BASE = 'https://yce-api-01.makeupar.com';

interface GenerateRequest {
  imageUrl: string;
  templateId?: string;
  prompt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateRequest;
    const { imageUrl, templateId = 'male_turtleneck_studio_style', prompt } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    console.log('[Studio] Starting generation:', { imageUrl, templateId, prompt });

    // Step 1: Fetch image and prepare for upload
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error('[Studio] Failed to fetch image:', imageResponse.statusText);
      return NextResponse.json({ error: 'Failed to fetch image from URL' }, { status: 500 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    console.log('[Studio] Image fetched, size:', imageBuffer.byteLength);

    // Step 2: Upload as binary with octet-stream (selfie endpoint for AI Studio)
    const uploadResponse = await fetch(`${API_BASE}/s2s/v2.0/file/selfie`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${YOUCAM_API_KEY}`,
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(imageBuffer),
    });

    const uploadResponseText = await uploadResponse.text();
    console.log('[Studio] Upload response:', uploadResponse.status, uploadResponseText);

    if (!uploadResponse.ok) {
      return NextResponse.json({ error: `Upload failed: ${uploadResponseText}` }, { status: 500 });
    }

    let uploadData;
    try {
      uploadData = JSON.parse(uploadResponseText);
    } catch (e) {
      console.error('[Studio] Failed to parse upload response:', e);
      return NextResponse.json({ error: 'Invalid upload response' }, { status: 500 });
    }

    const fileId = uploadData.data?.file_id || uploadData.file_id;

    if (!fileId) {
      console.error('[Studio] No file_id in response:', uploadData);
      return NextResponse.json({ error: 'Failed to get file ID' }, { status: 500 });
    }

    console.log('[Studio] File uploaded successfully, file_id:', fileId);

    // Step 3: Create AI Studio task
    const taskPayload: Record<string, string> = {
      file_id: fileId,
      template_id: templateId,
    };

    if (prompt) {
      taskPayload.prompt = prompt;
    }

    console.log('[Studio] Creating task with payload:', taskPayload);

    const taskResponse = await fetch(`${API_BASE}/s2s/v2.0/task/ai_studio`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${YOUCAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskPayload),
    });

    const taskResponseText = await taskResponse.text();
    console.log('[Studio] Task response:', taskResponse.status, taskResponseText);

    if (!taskResponse.ok) {
      return NextResponse.json({ error: `Task creation failed: ${taskResponseText}` }, { status: 500 });
    }

    let taskData;
    try {
      taskData = JSON.parse(taskResponseText);
    } catch (e) {
      console.error('[Studio] Failed to parse task response:', e);
      return NextResponse.json({ error: 'Invalid task response' }, { status: 500 });
    }

    const taskId = taskData.data?.task_id;

    if (!taskId) {
      console.error('[Studio] No task_id in response:', taskData);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    console.log('[Studio] Task created successfully, task_id:', taskId);

    return NextResponse.json({
      success: true,
      taskId,
      fileId,
    });
  } catch (error) {
    console.error('[Studio] Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
