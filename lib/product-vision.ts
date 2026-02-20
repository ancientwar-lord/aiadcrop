export interface ProductVisionMetadata {
  color: string;
  style: string;
  bestSkinTones: string[];
}

const DEFAULT_METADATA: ProductVisionMetadata = {
  color: 'Unknown',
  style: 'General',
  bestSkinTones: [],
};

function normalizeMetadata(
  input: Partial<ProductVisionMetadata> | null | undefined
): ProductVisionMetadata {
  if (!input) return DEFAULT_METADATA;

  const color =
    typeof input.color === 'string' && input.color.trim() ? input.color.trim() : 'Unknown';
  const style =
    typeof input.style === 'string' && input.style.trim() ? input.style.trim() : 'General';

  const bestSkinTones = Array.isArray(input.bestSkinTones)
    ? input.bestSkinTones
        .filter((tone): tone is string => typeof tone === 'string')
        .map((tone) => tone.trim().toLowerCase())
        .filter(Boolean)
    : [];

  return {
    color,
    style,
    bestSkinTones: Array.from(new Set(bestSkinTones)),
  };
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      return null;
    }

    try {
      return JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as T;
    } catch {
      return null;
    }
  }
}

export async function analyzeProductWithPollinations(params: {
  imageUrl: string;
  productName?: string;
  category?: string;
}): Promise<ProductVisionMetadata> {
  const apiKey = process.env.POLLINATIONS_AI_API_KEY;

  if (!params.imageUrl) {
    return DEFAULT_METADATA;
  }

  try {
    const response = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: 'openai',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a fashion vision analyst. Return strictly valid JSON only with keys: color (string), style (string), bestSkinTones (string[]). Keep values concise.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this product image. Context: productName=${params.productName || 'unknown'}, category=${params.category || 'unknown'}. Infer the dominant color, style, and best matching skin tones from [fair, light, medium, olive, tan, deep, dark, warm, cool, neutral].`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: params.imageUrl,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return DEFAULT_METADATA;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return DEFAULT_METADATA;
    }

    const parsed = safeParseJson<ProductVisionMetadata>(content);
    return normalizeMetadata(parsed);
  } catch {
    return DEFAULT_METADATA;
  }
}
