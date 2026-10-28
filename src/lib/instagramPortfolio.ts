import { ContentPostData } from './types';

/**
 * Generates a high-fidelity 6-post creative portfolio for a connected Instagram creator profile.
 * Covers all content formats (Videos/Reels, Image, Stories, Graphic/Carousels), distributes
 * posts realistically within the active date range, and scales views to the creator's live metrics.
 */
export function generateInstagramPortfolio(
  handle?: string | null,
  startDate?: Date | string,
  endDate?: Date | string,
  baseViews?: number
): ContentPostData[] {
  const cleanUsername = (handle || '').replace(/^@/, '').trim() || 'creator';
  const displayHandle = `@${cleanUsername}`;

  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const endMs = isNaN(end.getTime()) ? Date.now() : end.getTime();
  const startMs = isNaN(start.getTime()) ? endMs - 30 * 24 * 60 * 60 * 1000 : start.getTime();

  const daysDiff = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
  const dateScale = daysDiff / 30;

  const totalViews = typeof baseViews === 'number' && baseViews > 0
    ? baseViews
    : Math.round(264000 * dateScale);

  // Distribute timestamps safely across the active date window
  const getPostDate = (dayOffset: number) => {
    const offsetClamped = Math.min(Math.max(1, dayOffset), Math.max(1, daysDiff - 1));
    const postMs = endMs - (offsetClamped * (endMs - startMs)) / Math.max(daysDiff, 28);
    return new Date(postMs).toISOString();
  };

  const defaultThumbnails = [
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80', // Studio visual
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80', // Concert & event stage
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80', // Creative production desk
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80', // Editorial lighting
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80', // Audio session
    'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=800&q=80', // Creative graphic artwork
  ];

  const postBlueprints = [
    {
      title: `${cleanUsername} • High Traction Video Reel`,
      caption: `Signature visual reel and creative storytelling with ${displayHandle} #reels #explore #creative #viral`,
      contentFormat: 'Videos' as const,
      viewsRatio: 0.44,
      dayOffset: 3,
      thumbIndex: 0,
      isTop: true,
    },
    {
      title: `${cleanUsername} • Editorial Studio Carousel`,
      caption: `Behind-the-scenes perspectives and creative journey #photography #carousel #bts`,
      contentFormat: 'Graphic' as const,
      viewsRatio: 0.26,
      dayOffset: 8,
      thumbIndex: 1,
      isTop: true,
    },
    {
      title: `${cleanUsername} • Creative Showcase & Sound Drop`,
      caption: `New visual teaser. Drop your thoughts in the comments below! #studio #sound #visuals`,
      contentFormat: 'Videos' as const,
      viewsRatio: 0.16,
      dayOffset: 14,
      thumbIndex: 2,
      isTop: true,
    },
    {
      title: `${cleanUsername} • Featured Production Post`,
      caption: `Special collaboration moment and project milestone #milestone #creator #digital`,
      contentFormat: 'Image' as const,
      viewsRatio: 0.08,
      dayOffset: 19,
      thumbIndex: 3,
      isTop: false,
    },
    {
      title: `${cleanUsername} • Daily Interactive Story Cadence`,
      caption: `Daily studio updates & community Q&A session #daily #stories #qna`,
      contentFormat: 'Stories' as const,
      viewsRatio: 0.04,
      dayOffset: 23,
      thumbIndex: 4,
      isTop: false,
    },
    {
      title: `${cleanUsername} • Community Concept & Cover Design`,
      caption: `Concept art and typographic design drop for the new season #design #branding #art`,
      contentFormat: 'Graphic' as const,
      viewsRatio: 0.02,
      dayOffset: 27,
      thumbIndex: 5,
      isTop: false,
    },
  ];

  return postBlueprints.map((bp, idx) => {
    const pViews = Math.round(totalViews * bp.viewsRatio);
    const pLikes = Math.round(pViews * 0.058);
    const pComments = Math.max(12, Math.round(pLikes * 0.042));
    const pShares = Math.max(18, Math.round(pLikes * 0.068));

    return {
      id: `post_ig_${cleanUsername}_${idx + 1}`,
      postId: `post_ig_${cleanUsername}_${idx + 1}`,
      platform: 'instagram' as const,
      title: bp.title,
      caption: bp.caption,
      permalink: `https://www.instagram.com/${cleanUsername}/`,
      contentFormat: bp.contentFormat,
      viewsCount: pViews,
      likesCount: pLikes,
      commentsCount: pComments,
      sharesCount: pShares,
      newFollowers: Math.max(0, Math.round(pViews * 0.0018)),
      thumbnailUrl: defaultThumbnails[bp.thumbIndex] || null,
      isTopPerformer: bp.isTop,
      publishedAt: getPostDate(bp.dayOffset),
    };
  });
}
