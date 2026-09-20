import axios from 'axios';

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
  const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true' || !accessToken || accessToken.startsWith('mock_');

  if (isMockMode) {
    return {
      followersGrowth: 0,
      totalViews: 0,
      engagementRate: 0,
      posts: [],
    };
  }

  try {
    let postsList: TikTokMetricResult['posts'] = [];
    let totalViews = 0;
    let totalEngagements = 0;

    const startMs = startDate.getTime();
    const endMs = new Date(endDate).setHours(23, 59, 59, 999);

    const isInDateRange = (timestamp?: number | string | null) => {
      if (!timestamp) return true;
      const t = typeof timestamp === 'number' ? timestamp * 1000 : new Date(timestamp).getTime();
      return !isNaN(t) && t >= startMs && t <= endMs;
    };

    // 1. Query TikTok Display API v2 video list
    try {
      const response = await axios.post(
        'https://open.tiktokapis.com/v2/video/list/',
        {
          max_count: 20,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            fields: 'id,title,video_description,duration,cover_image_url,embed_html,embed_link,like_count,comment_count,share_count,view_count,create_time',
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

          const publishDate = v.create_time ? new Date(v.create_time * 1000).toISOString() : new Date().toISOString();
          const inRange = isInDateRange(v.create_time || publishDate);

          if (inRange) {
            totalViews += views;
            totalEngagements += likes + comments + shares;
          }

          const rawTitle = v.title || v.video_description || '';
          const displayTitle = rawTitle
            ? (rawTitle.length > 75 ? `${rawTitle.substring(0, 75)}...` : rawTitle)
            : 'TikTok Video';

          return {
            postId: v.id || `tt_live_${idx}`,
            title: displayTitle,
            caption: rawTitle,
            permalink: v.embed_link || '',
            contentFormat: 'Videos' as const,
            viewsCount: views,
            likesCount: likes,
            commentsCount: comments,
            sharesCount: shares,
            thumbnailUrl: v.cover_image_url || null,
            publishedAt: publishDate,
            inRange,
          };
        });
      }
    } catch (listErr) {
      // If video/list/ fails, try research/video/query
      try {
        const cleanUsername = platformAccountId.replace(/^@/, '');
        const resQuery = await axios.post(
          'https://open.tiktokapis.com/v2/research/video/query/',
          {
            query: {
              and: [{ field_name: 'username', operation: 'EQ', field_values: [cleanUsername] }],
            },
            start_date: startDate.toISOString().split('T')[0].replace(/-/g, ''),
            end_date: endDate.toISOString().split('T')[0].replace(/-/g, ''),
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );
        const videos = resQuery.data?.data?.videos || [];
        videos.forEach((v: any) => {
          totalViews += v.view_count || 0;
          totalEngagements += (v.like_count || 0) + (v.comment_count || 0) + (v.share_count || 0);
        });
      } catch (qErr) {}
    }

    const engagementRate = totalViews > 0 ? parseFloat(((totalEngagements / totalViews) * 100).toFixed(1)) : 0;

    return {
      followersGrowth: 0,
      totalViews,
      engagementRate,
      posts: postsList,
    };
  } catch (error) {
    console.warn('TikTok Display API request notice:', error);
    return {
      followersGrowth: 0,
      totalViews: 0,
      engagementRate: 0,
      posts: [],
    };
  }
}
