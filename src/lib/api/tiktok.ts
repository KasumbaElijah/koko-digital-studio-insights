import axios from 'axios';
import { fetchTikTokProfileVideos } from './tiktokScraper';

export interface TikTokMetricResult {
  followersGrowth: number;
  totalViews: number;
  engagementRate: number;
  posts: Array<{
    postId: string;
    title?: string;
    caption?: string;
    permalink?: string;
    contentFormat: 'Image' | 'Videos' | 'Graphic' | 'Stories';
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    newFollowers?: number;
    thumbnailUrl?: string | null;
    publishedAt: string;
  }>;
}

export async function fetchTikTokMetrics(
  platformAccountId: string,
  accessToken: string,
  startDate: Date,
  endDate: Date
): Promise<TikTokMetricResult> {
  const cleanUsername = (platformAccountId || '').replace(/^@/, '').trim();
  const displayHandle = `@${cleanUsername}`;

  let totalViews = 0;
  let totalEngagements = 0;
  let followersCount = 0;
  let postsList: TikTokMetricResult['posts'] = [];

  const isRealToken =
    accessToken &&
    !accessToken.startsWith('mock_') &&
    !accessToken.startsWith('tt_direct_') &&
    !accessToken.startsWith('active_') &&
    accessToken.length > 20;

  if (isRealToken) {
    try {
      const startMs = startDate.getTime();
      const endMs = new Date(endDate).setHours(23, 59, 59, 999);

      const isInDateRange = (timestamp?: number | string | null) => {
        if (!timestamp) return true;
        const t =
          typeof timestamp === 'number'
            ? timestamp * 1000
            : new Date(timestamp).getTime();
        return !isNaN(t) && t >= startMs && t <= endMs;
      };

      // Fetch user info follower count ifuser.info.stats scope is granted
      try {
        const userInfoRes = await axios.get(
          'https://open.tiktokapis.com/v2/user/info/',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { fields: 'display_name,follower_count,likes_count,video_count' },
            timeout: 6000,
          }
        );
        const fc = userInfoRes.data?.data?.user?.follower_count;
        if (typeof fc === 'number') {
          followersCount = fc;
        }
      } catch {}

      // 1. Query TikTok Display API v2 video list
      try {
        const response = await axios.post(
          'https://open.tiktokapis.com/v2/video/list/',
          { max_count: 20 },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            params: {
              fields:
                'id,title,video_description,duration,cover_image_url,embed_html,embed_link,like_count,comment_count,share_count,view_count,create_time',
            },
            timeout: 10000,
          }
        );

        const videos = response.data?.data?.videos || [];
        if (videos.length > 0) {
          postsList = videos.map((v: any, idx: number) => {
            const views = Number(v.view_count) || 0;
            const likes = Number(v.like_count) || 0;
            const comments = Number(v.comment_count) || 0;
            const shares = Number(v.share_count) || 0;

            const publishDate = v.create_time
              ? new Date(v.create_time * 1000).toISOString()
              : new Date().toISOString();
            const inRange = isInDateRange(v.create_time || publishDate);

            if (inRange) {
              totalViews += views;
              totalEngagements += likes + comments + shares;
            }

            const rawTitle = v.title || v.video_description || '';
            const displayTitle = rawTitle
              ? rawTitle.length > 75
                ? `${rawTitle.substring(0, 75)}...`
                : rawTitle
              : 'TikTok Video';

            const proxiedThumb = v.cover_image_url
              ? `/api/image-proxy?url=${encodeURIComponent(v.cover_image_url)}`
              : null;

            return {
              postId: v.id || `tt_live_${idx}`,
              title: displayTitle,
              caption: rawTitle,
              permalink:
                v.embed_link ||
                (cleanUsername && v.id
                  ? `https://www.tiktok.com/${displayHandle}/video/${v.id}`
                  : `https://www.tiktok.com/${displayHandle}`),
              contentFormat: 'Videos' as const,
              viewsCount: views,
              likesCount: likes,
              commentsCount: comments,
              sharesCount: shares,
              newFollowers: 0,
              thumbnailUrl: proxiedThumb,
              publishedAt: publishDate,
            };
          });
        }
      } catch {}
    } catch (e) {
      console.warn('TikTok live API error notice:', e);
    }
  }

  // 2. Fetch real TikTok profile & videos directly from creator's live public profile
  if ((postsList.length === 0 || followersCount === 0) && cleanUsername) {
    try {
      const realProfile = await fetchTikTokProfileVideos(cleanUsername);
      if (realProfile) {
        if (realProfile.followerCount != null && followersCount === 0) {
          followersCount = Number(realProfile.followerCount) || 0;
        }
        if (postsList.length === 0 && Array.isArray(realProfile.posts) && realProfile.posts.length > 0) {
          postsList = realProfile.posts.map((p) => ({
            postId: p.postId,
            title: p.title,
            caption: p.caption,
            permalink: p.permalink || undefined,
            contentFormat: p.contentFormat,
            viewsCount: p.viewsCount,
            likesCount: p.likesCount,
            commentsCount: p.commentsCount,
            sharesCount: p.sharesCount,
            newFollowers: 0,
            thumbnailUrl: p.thumbnailUrl,
            publishedAt: p.publishedAt,
          }));
        }
      }
    } catch (scrapeErr) {
      console.warn('TikTok scraper notice:', scrapeErr);
    }
  }

  if (postsList.length > 0 && totalViews === 0) {
    totalViews = postsList.reduce((sum, p) => sum + (Number(p.viewsCount) || 0), 0);
    totalEngagements = postsList.reduce(
      (acc, p) =>
        acc +
        (Number(p.likesCount) || 0) +
        (Number(p.commentsCount) || 0) +
        (Number(p.sharesCount) || 0),
      0
    );
  }

  const engagementRate =
    totalViews > 0 ? parseFloat(((totalEngagements / totalViews) * 100).toFixed(1)) : 0;

  return {
    followersGrowth: followersCount,
    totalViews,
    engagementRate,
    posts: postsList,
  };
}
