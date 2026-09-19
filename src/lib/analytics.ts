import { ContentPostData, FormatCount, DistributionCount } from './types';

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
 * Generates horizontal bar chart breakdown for content formats
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
    { platform: 'Instagram', count: instagram },
    { platform: 'TikTok', count: tiktok },
  ];
}

/**
 * Gets top performing 3 posts sorted by view count
 */
export function getTopPerformingPosts(posts?: ContentPostData[] | null, limit = 3): ContentPostData[] {
  if (!posts || !Array.isArray(posts)) return [];
  return [...posts]
    .filter(Boolean)
    .sort((a, b) => (Number(b?.viewsCount) || 0) - (Number(a?.viewsCount) || 0))
    .slice(0, limit);
}
