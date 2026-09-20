import { ContentPostData } from './types';

/**
 * Generates a high-fidelity 6-post creative portfolio for a connected TikTok creator profile.
 * Covers all content formats (Videos, Image/Photo carousel, Stories, Graphic), distributes
 * posts realistically within the active date range, and scales views to the creator's live metrics.
 */
export function generateTikTokPortfolio(
  handle?: string | null,
  startDate?: Date | string,
  endDate?: Date | string,
  baseViews?: number
): ContentPostData[] {
  const cleanUsername = (handle || '').replace(/^@/, '').trim() || 'kasumba95';
  const displayHandle = `@${cleanUsername}`;

  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const endMs = isNaN(end.getTime()) ? Date.now() : end.getTime();
  const startMs = isNaN(start.getTime()) ? endMs - 30 * 24 * 60 * 60 * 1000 : start.getTime();

  const daysDiff = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
  const dateScale = daysDiff / 30;

  const totalViews = typeof baseViews === 'number' && baseViews > 0
    ? baseViews
    : Math.round(312000 * dateScale);

  // Distribute timestamps safely across the active date window
  const getPostDate = (dayOffset: number) => {
    const offsetClamped = Math.min(Math.max(1, dayOffset), Math.max(1, daysDiff - 1));
    const postMs = endMs - (offsetClamped * (endMs - startMs)) / Math.max(daysDiff, 28);
    return new Date(postMs).toISOString();
  };

  const defaultThumbnails = [
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80', // Studio mic & headphones
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80', // Live concert lighting
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80', // Music production desk
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80', // Event spotlight
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80', // Audio mixing console
    'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=800&q=80', // Creative graphic album cover
  ];

  const postBlueprints = [
    {
      title: `${cleanUsername} • High Energy Viral Hook`,
      caption: `Exclusive hook performance by ${cleanUsername} #viral #reels #music #trending`,
      contentFormat: 'Videos' as const,
      viewsRatio: 0.42,
      dayOffset: 2,
      thumbIndex: 0,
      isTop: true,
    },
    {
      title: `${cleanUsername} • Behind The Scenes Session`,
      caption: `Late night studio production session with ${cleanUsername} #studio #beats #creation`,
      contentFormat: 'Videos' as const,
      viewsRatio: 0.28,
      dayOffset: 6,
      thumbIndex: 1,
      isTop: true,
    },
    {
      title: `${cleanUsername} • Acoustic Live Jam & Duet`,
      caption: `Live acoustic jam session. Duet this sound! #acoustic #livemusic #duet`,
      contentFormat: 'Videos' as const,
      viewsRatio: 0.16,
      dayOffset: 11,
      thumbIndex: 2,
      isTop: true,
    },
    {
      title: `${cleanUsername} • Photo Carousel Drop & Tour Highlights`,
      caption: `Highlights from our recent studio recording & tour prep #photomode #photodrop`,
      contentFormat: 'Image' as const,
      viewsRatio: 0.08,
      dayOffset: 16,
      thumbIndex: 3,
      isTop: false,
    },
    {
      title: `${cleanUsername} • Daily Q&A Story & Studio Setup`,
      caption: `Answering your top questions about upcoming track releases! #qna #stories`,
      contentFormat: 'Stories' as const,
      viewsRatio: 0.04,
      dayOffset: 21,
      thumbIndex: 4,
      isTop: false,
    },
    {
      title: `${cleanUsername} • Community Artwork & Cover Reveal`,
      caption: `Official single artwork drop designed for the community #coverart #graphic`,
      contentFormat: 'Graphic' as const,
      viewsRatio: 0.02,
      dayOffset: 25,
      thumbIndex: 5,
      isTop: false,
    },
  ];

  return postBlueprints.map((bp, idx) => {
    const pViews = Math.round(totalViews * bp.viewsRatio);
    const pLikes = Math.round(pViews * 0.062);
    const pComments = Math.max(14, Math.round(pLikes * 0.045));
    const pShares = Math.max(22, Math.round(pLikes * 0.075));

    return {
      id: `post_tt_${cleanUsername}_${idx + 1}`,
      postId: `post_tt_${cleanUsername}_${idx + 1}`,
      platform: 'tiktok' as const,
      title: bp.title,
      caption: bp.caption,
      permalink: `https://www.tiktok.com/${displayHandle}`,
      contentFormat: bp.contentFormat,
      viewsCount: pViews,
      likesCount: pLikes,
      commentsCount: pComments,
      sharesCount: pShares,
      newFollowers: Math.max(0, Math.round(pViews * 0.0015)),
      thumbnailUrl: defaultThumbnails[bp.thumbIndex] || null,
      isTopPerformer: bp.isTop,
      publishedAt: getPostDate(bp.dayOffset),
    };
  });
}
