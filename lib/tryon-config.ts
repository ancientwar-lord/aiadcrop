export type TryOnMode = 'cloth' | 'bag' | 'scarf' | 'shoes' | 'hat';

export interface ResolvedTryOnCategory {
  mode: TryOnMode;
  garmentCategory?: 'full_body' | 'lower_body' | 'upper_body' | 'shoes' | 'auto';
}

const LEGACY_CLOTH_CATEGORIES = new Set(['full_body', 'lower_body', 'upper_body', 'shoes', 'auto']);

export function resolveTryOnCategory(rawCategory?: string): ResolvedTryOnCategory {
  const category = (rawCategory || '').trim();

  if (!category) {
    return { mode: 'cloth', garmentCategory: 'auto' };
  }

  if (LEGACY_CLOTH_CATEGORIES.has(category)) {
    return {
      mode: 'cloth',
      garmentCategory: category as ResolvedTryOnCategory['garmentCategory'],
    };
  }

  if (category.startsWith('cloth_')) {
    const garmentCategory = category.replace('cloth_', '');

    if (LEGACY_CLOTH_CATEGORIES.has(garmentCategory)) {
      return {
        mode: 'cloth',
        garmentCategory: garmentCategory as ResolvedTryOnCategory['garmentCategory'],
      };
    }

    return { mode: 'cloth', garmentCategory: 'auto' };
  }

  if (category === 'ai_bag') return { mode: 'bag' };
  if (category === 'ai_scarf') return { mode: 'scarf' };
  if (category === 'ai_shoes') return { mode: 'shoes' };
  if (category === 'ai_hat') return { mode: 'hat' };

  return { mode: 'cloth', garmentCategory: 'auto' };
}

export function getYouCamFileEndpoint(mode: TryOnMode): string {
  switch (mode) {
    case 'bag':
      return '/s2s/v2.0/file/bag';
    case 'scarf':
      return '/s2s/v2.0/file/scarf';
    case 'shoes':
      return '/s2s/v2.0/file/shoes';
    case 'hat':
      return '/s2s/v2.0/file/hat';
    default:
      return '/s2s/v2.0/file/cloth';
  }
}

export function getYouCamTaskEndpoint(mode: TryOnMode): string {
  switch (mode) {
    case 'bag':
      return '/s2s/v2.0/task/bag';
    case 'scarf':
      return '/s2s/v2.0/task/scarf';
    case 'shoes':
      return '/s2s/v2.0/task/shoes';
    case 'hat':
      return '/s2s/v2.0/task/hat';
    default:
      return '/s2s/v2.0/task/cloth';
  }
}

export function buildYouCamTaskPayload(params: {
  mode: TryOnMode;
  userFileId: string;
  productImageUrl: string;
  garmentCategory?: ResolvedTryOnCategory['garmentCategory'];
  gender?: 'female' | 'male';
}) {
  const { mode, userFileId, productImageUrl, garmentCategory, gender } = params;

  if (mode === 'cloth') {
    return {
      src_file_id: userFileId,
      ref_file_url: productImageUrl,
      garment_category: garmentCategory || 'auto',
    };
  }

  return {
    src_file_id: userFileId,
    ref_file_url: productImageUrl,
    gender: gender || 'female',
    style: 'random',
  };
}
