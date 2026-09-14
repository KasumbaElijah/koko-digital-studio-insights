import axios from 'axios';

export interface InstagramMetricResult {
  followersGrowth: number;
  totalViews: number;
  engagementRate: number;
  posts: Array<{
    postId: string;
    contentFormat: 'Image' | 'Videos' | 'Graphic' | 'Stories';
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    thumbnailUrl?: string;
    publishedAt: string;
  }>;
}

export async function fetchInstagramMetrics(
  platformAccountId: string,
  accessToken: string,
  startDate: Date,
  endDate: Date
): Promise<InstagramMetricResult> {
  const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true' || !accessToken || accessToken.startsWith('mock_');

  if (isMockMode) {
    // Generate realistic calculated numbers based on date interval
    const durationDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const multiplier = durationDays / 30;

    return {
      followersGrowth: Math.round(1100 * multiplier),
      totalViews: Math.round(167000 * multiplier),
      engagementRate: 4.5,
      posts: [
        {
          postId: `ig_mock_${Date.now()}_1`,
          contentFormat: 'Videos',
          viewsCount: Math.round(87200 * multiplier),
          likesCount: 3395,
          commentsCount: 107,
          sharesCount: 1223,
          thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
          publishedAt: new Date(startDate.getTime() + 86400000 * 3).toISOString(),
        },
        {
          postId: `ig_mock_${Date.now()}_2`,
          contentFormat: 'Graphic',
          viewsCount: Math.round(15400 * multiplier),
          likesCount: 890,
          commentsCount: 42,
          sharesCount: 120,
          thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
          publishedAt: new Date(startDate.getTime() + 86400000 * 7).toISOString(),
        },
      ],
    };
  }

  try {
    // Try Instagram Graph API endpoint first (for Instagram User Access Tokens)
    let data: any[] = [];
    try {
      const igUrl = 'https://graph.instagram.com/v19.0/me/insights';
      const igRes = await axios.get(igUrl, {
        params: {
          metric: 'impressions,reach,profile_views',
          period: 'day',
          since: Math.floor(startDate.getTime() / 1000),
          until: Math.floor(endDate.getTime() / 1000),
          access_token: accessToken,
        },
      });
      data = igRes.data?.data || [];
    } catch {
      // Fall back to Meta Facebook Graph API
      const fbUrl = `https://graph.facebook.com/v19.0/${platformAccountId}/insights`;
      const fbRes = await axios.get(fbUrl, {
        params: {
          metric: 'follower_count,impressions,reach,profile_views',
          period: 'day',
          since: Math.floor(startDate.getTime() / 1000),
          until: Math.floor(endDate.getTime() / 1000),
          access_token: accessToken,
        },
      });
      data = fbRes.data?.data || [];
    }

    let totalViews = 0;
    let followersGrowth = 0;

    data.forEach((metric: { name: string; values: Array<{ value: number }> }) => {
      const sum = metric.values?.reduce((acc, curr) => acc + (curr.value || 0), 0) || 0;
      if (metric.name === 'impressions' || metric.name === 'reach') totalViews += sum;
      if (metric.name === 'follower_count') followersGrowth += sum;
    });

    return {
      followersGrowth: followersGrowth || 0,
      totalViews: totalViews || 0,
      engagementRate: 0,
      posts: [],
    };
  } catch (error) {
    console.warn('Instagram metrics request failed, returning baseline 0 metrics:', error);
    return {
      followersGrowth: 0,
      totalViews: 0,
      engagementRate: 0,
      posts: [],
    };
  }
}
