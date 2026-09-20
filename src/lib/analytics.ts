import { ContentPostData, FormatCount, DistributionCount, FormatComparisonItem } from './types';

/**
 * Calculates percentage change between current metric value and prior period.
 * Formula: ((current - prior) / prior) * 100
 */
export function calculatePctChange(current?: number | null, prior?: number | null): number {
  const c = current != null && !isNaN(Number(current)) ? Number(current) : 0;
  const p = prior != null && !isNaN(Number(prior)) ? Number(prior) : 0;
  if (!p || p === 0) {
    return c > 0 ? 100 : 0;
  }
  const diff = c - p;
  const pct = (diff / p) * 100;
  return parseFloat(pct.toFixed(1));
}

/**
 * Formats large view numbers into human-readable shorthand strings (e.g. 167000 -> 167K, 1100 -> +1.1K)
 */
export function formatNumberShort(num?: number | bigint | null): string {
  if (num === null || num === undefined) return '0';
  const value = typeof num === 'bigint' ? Number(num) : Number(num);
  if (isNaN(value)) return '0';

  if (Math.abs(value) >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (Math.abs(value) >= 1_000) {
    return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return value.toString();
}

/**
 * Generates horizontal bar chart breakdown for content formats across all posts
 */
export function getFormatDistribution(posts?: ContentPostData[] | null): FormatCount[] {
  const counts: Record<string, number> = {
    Image: 0,
    Videos: 0,
    Graphic: 0,
    Stories: 0,
  };

  (posts || []).forEach((post) => {
    if (!post) return;
    const format = post.contentFormat || (post as any).format || 'Image';
    if (counts[format] !== undefined) {
      counts[format] += 1;
    } else {
      counts.Image += 1;
    }
  });

  return [
    { format: 'Image', count: counts.Image },
    { format: 'Videos', count: counts.Videos },
    { format: 'Graphic', count: counts.Graphic },
    { format: 'Stories', count: counts.Stories },
  ];
}

/**
 * Generates horizontal bar chart breakdown for content formats filtered by a specific platform
 */
export function getFormatDistributionByPlatform(
  posts?: ContentPostData[] | null,
  platform?: 'instagram' | 'tiktok'
): FormatCount[] {
  if (!platform) return getFormatDistribution(posts);
  const target = platform.toLowerCase();
  const filtered = (posts || []).filter((p) => String(p?.platform || '').toLowerCase() === target);
  return getFormatDistribution(filtered);
}

/**
 * Generates paired comparison format breakdown for Instagram and TikTok
 */
export function getFormatComparison(posts?: ContentPostData[] | null): FormatComparisonItem[] {
  const igCounts: Record<string, number> = { Image: 0, Videos: 0, Graphic: 0, Stories: 0 };
  const ttCounts: Record<string, number> = { Image: 0, Videos: 0, Graphic: 0, Stories: 0 };

  (posts || []).forEach((post) => {
    if (!post) return;
    const p = String(post.platform || '').toLowerCase();
    const format = post.contentFormat || (post as any).format || 'Image';
    const validFormat = ['Image', 'Videos', 'Graphic', 'Stories'].includes(format) ? format : 'Image';

    if (p === 'instagram') {
      igCounts[validFormat] = (igCounts[validFormat] || 0) + 1;
    } else if (p === 'tiktok') {
      ttCounts[validFormat] = (ttCounts[validFormat] || 0) + 1;
    }
  });

  const formats: Array<'Image' | 'Videos' | 'Graphic' | 'Stories'> = ['Videos', 'Image', 'Graphic', 'Stories'];
  return formats.map((fmt) => ({
    format: fmt,
    instagram: igCounts[fmt] || 0,
    tiktok: ttCounts[fmt] || 0,
    total: (igCounts[fmt] || 0) + (ttCounts[fmt] || 0),
  }));
}

/**
 * Generates pie / donut chart distribution of content formats within a specific platform
 */
export function getPlatformFormatDistribution(
  posts: ContentPostData[] | null | undefined,
  platform: 'instagram' | 'tiktok' = 'instagram'
): DistributionCount[] {
  const target = (platform || 'instagram').toLowerCase();
  const filtered = (posts || []).filter((p) => String(p?.platform || '').toLowerCase() === target);
  const formatCounts = getFormatDistribution(filtered);

  // Platform-themed palettes for Instagram vs TikTok
  const igColors: Record<string, string> = {
    Videos: '#e1306c', // Instagram Signature Rose / Reels
    Image: '#833ab4',  // Instagram Royal Purple
    Graphic: '#fd1d1d',// Instagram Coral Orange
    Stories: '#fcaf45',// Instagram Sunset Amber
  };

  const ttColors: Record<string, string> = {
    Videos: '#fe2c55', // TikTok Neon Red / Videos
    Image: '#25f4ee',  // TikTok Electric Cyan / Carousels
    Stories: '#010101',// TikTok Obsidian Black
    Graphic: '#69c9d0',// TikTok Teal / Muted Cyan
  };

  const colorMap = target === 'instagram' ? igColors : ttColors;

  return formatCounts
    .filter((f) => f.count > 0)
    .map((f) => ({
      platform: f.format,
      count: f.count,
      color: colorMap[f.format] || '#e1306c',
    }));
}

/**
 * Generates pie / donut chart distribution split between Instagram and TikTok
 */
export function getPlatformDistribution(posts?: ContentPostData[] | null): DistributionCount[] {
  let instagram = 0;
  let tiktok = 0;

  (posts || []).forEach((post) => {
    if (!post) return;
    const p = String(post.platform || '').toLowerCase();
    if (p === 'instagram') instagram++;
    if (p === 'tiktok') tiktok++;
  });

  return [
    { platform: 'Instagram', count: instagram, color: '#e1306c' },
    { platform: 'TikTok', count: tiktok, color: '#010101' },
  ];
}

/**
 * Gets top performing posts sorted by view count across all platforms
 */
export function getTopPerformingPosts(posts?: ContentPostData[] | null, limit = 3): ContentPostData[] {
  if (!posts || !Array.isArray(posts)) return [];
  return [...posts]
    .filter(Boolean)
    .sort((a, b) => (Number(b?.viewsCount) || 0) - (Number(a?.viewsCount) || 0))
    .slice(0, limit);
}

/**
 * Gets top performing posts sorted by view count filtered by a specific platform
 */
export function getTopPerformingPostsByPlatform(
  posts: ContentPostData[] | null | undefined,
  platform: 'instagram' | 'tiktok' = 'instagram',
  limit = 3
): ContentPostData[] {
  if (!posts || !Array.isArray(posts)) return [];
  const target = (platform || 'instagram').toLowerCase();
  const filtered = posts.filter((p) => String(p?.platform || '').toLowerCase() === target);
  return getTopPerformingPosts(filtered, limit);
}


