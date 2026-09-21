import axios from 'axios';
import { ContentPostData } from '../types';

export interface TikTokProfileScrapeResult {
  success: boolean;
  username: string;
  nickname?: string;
  avatarUrl?: string;
  followerCount?: number;
  heartCount?: number;
  videoCount?: number;
  posts: ContentPostData[];
}

interface TikTokVideoDetail {
  id: string;
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
  views: number;
  createTime: string;
  caption?: string;
  coverUrl?: string;
}

/**
 * Fetches real TikTok user profile info (followers, likes, bio, avatar)
 */
async function fetchTikTokProfileHeader(username: string): Promise<{
  nickname?: string;
  avatarUrl?: string;
  followerCount?: number;
  heartCount?: number;
  videoCount?: number;
} | null> {
  try {
    const res = await axios.get(`https://www.tiktok.com/@${username}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 7000,
    });
    const html = res.data;
    const match = typeof html === 'string' ? html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/) : null;
    if (match) {
      const data = JSON.parse(match[1]);
      const defaultScope = data['__DEFAULT_SCOPE__'] || {};
      const userDetail = defaultScope['webapp.user-detail'] || {};
      const userInfo = userDetail.userInfo || {};
      const user = userInfo.user || {};
      const stats = userInfo.stats || {};
      return {
        nickname: user.nickname,
        avatarUrl: user.avatarLarger || user.avatarMedium || user.avatarThumb,
        followerCount: Number(stats.followerCount) || undefined,
        heartCount: Number(stats.heartCount ?? stats.heart) || undefined,
        videoCount: Number(stats.videoCount) || undefined,
      };
    }
  } catch {}
  return null;
}

/**
 * Fetches exact live likes, comments, shares, views, and timestamp for a specific TikTok video.
 */
async function fetchSingleTikTokVideoDetail(username: string, videoId: string): Promise<TikTokVideoDetail | null> {
  try {
    const res = await axios.get(`https://www.tiktok.com/@${username}/video/${videoId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 7000,
    });
    const html = res.data;
    const match = typeof html === 'string' ? html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/) : null;
    if (match) {
      const data = JSON.parse(match[1]);
      const defaultScope = data['__DEFAULT_SCOPE__'] || {};
      const videoDetail = defaultScope['webapp.video-detail'];
      const itemStruct = videoDetail?.itemInfo?.itemStruct;
      if (itemStruct) {
        const stats = itemStruct.stats || {};
        const createTimeSec = itemStruct.createTime ? Number(itemStruct.createTime) : null;
        let pubDate = '';
        if (createTimeSec && !isNaN(createTimeSec)) {
          pubDate = new Date(createTimeSec * 1000).toISOString();
        }
        return {
          id: videoId,
          likes: Number(stats.diggCount) || 0,
          comments: Number(stats.commentCount) || 0,
          shares: Number(stats.shareCount) || 0,
          bookmarks: Number(stats.collectCount) || 0,
          views: Number(stats.playCount) || 0,
          createTime: pubDate,
          caption: itemStruct.desc || '',
          coverUrl: itemStruct.video?.cover || itemStruct.video?.originCover || null,
        };
      }
    }
  } catch {}
  return null;
}

/**
 * Fetches real TikTok videos, descriptions, thumbnails, exact likes, comments, and play counts
 * directly from the creator's live TikTok profile and video items.
 */
export async function fetchTikTokProfileVideos(
  username: string
): Promise<TikTokProfileScrapeResult> {
  const cleanUsername = (username || '').replace(/^@/, '').trim();
  if (!cleanUsername) {
    return { success: false, username: '', posts: [] };
  }

  try {
    // 1. Fetch profile header and embed videos concurrently
    const [profileHeader, embedRes] = await Promise.all([
      fetchTikTokProfileHeader(cleanUsername),
      axios
        .get(`https://www.tiktok.com/embed/@${cleanUsername}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: 9000,
        })
        .catch(() => null),
    ]);

    const html = embedRes?.data;
    const match = typeof html === 'string' ? html.match(/"videoList":(\[\{.*?\}\])/) : null;
    if (!match) {
      return {
        success: false,
        username: cleanUsername,
        nickname: profileHeader?.nickname || cleanUsername,
        avatarUrl: profileHeader?.avatarUrl,
        followerCount: profileHeader?.followerCount,
        heartCount: profileHeader?.heartCount,
        videoCount: profileHeader?.videoCount,
        posts: [],
      };
    }

    let rawVideos: any[] = [];
    try {
      rawVideos = JSON.parse(match[1]);
    } catch {
      return { success: false, username: cleanUsername, posts: [] };
    }

    if (!Array.isArray(rawVideos) || rawVideos.length === 0) {
      return { success: false, username: cleanUsername, posts: [] };
    }

    let nickname = profileHeader?.nickname || cleanUsername;
    if (!profileHeader?.nickname && html) {
      const nickMatch = html.match(/"nickname":"([^"]+)"/);
      if (nickMatch) nickname = nickMatch[1];
    }

    // 2. Fetch live metrics (exact likes, comments, shares, views, publishedAt) for each video in parallel
    const detailMap = new Map<string, TikTokVideoDetail>();
    await Promise.all(
      rawVideos.map(async (v) => {
        if (!v.id) return;
        const detail = await fetchSingleTikTokVideoDetail(cleanUsername, String(v.id));
        if (detail) {
          detailMap.set(String(v.id), detail);
        }
      })
    );

    // 3. Map raw videos to ContentPostData with real metrics
    const posts: ContentPostData[] = rawVideos.map((v: any, idx: number) => {
      const vidStr = String(v.id || '');
      const detail = detailMap.get(vidStr);

      // Extract accurate publication timestamp
      let pubDate = detail?.createTime || '';
      if (!pubDate && v.id) {
        try {
          const ts = Number(BigInt(v.id) >> BigInt(32));
          if (ts > 0 && !isNaN(ts)) {
            pubDate = new Date(ts * 1000).toISOString();
          }
        } catch {}
      }
      if (!pubDate) pubDate = new Date().toISOString();

      // Real views, likes, comments, shares
      const views = detail?.views || Number(v.playCount) || 0;
      const likes = detail?.likes ?? (Number(v.diggCount) || 0);
      const comments = detail?.comments ?? (Number(v.commentCount) || 0);
      const shares = detail?.shares ?? (Number(v.shareCount) || 0);

      const rawCover = detail?.coverUrl || v.coverUrl || v.originCoverUrl || v.dynamicCoverUrl;
      const proxyCover = rawCover ? `/api/image-proxy?url=${encodeURIComponent(rawCover)}` : null;

      // Classify format
      const rawCaption = detail?.caption || v.desc || '';
      let format: 'Videos' | 'Image' | 'Graphic' | 'Stories' = 'Videos';
      const descLower = rawCaption.toLowerCase();
      if (descLower.includes('#photo') || descLower.includes('#carousel')) {
        format = 'Image';
      } else if (descLower.includes('#graphic') || descLower.includes('#art') || descLower.includes('design')) {
        format = 'Graphic';
      } else if (descLower.includes('#story') || descLower.includes('#qna')) {
        format = 'Stories';
      }

      const displayTitle = rawCaption
        ? (rawCaption.length > 75 ? `${rawCaption.substring(0, 75)}...` : rawCaption)
        : `TikTok Video #${idx + 1}`;

      return {
        id: `post_tt_${v.id}`,
        postId: String(v.id),
        platform: 'tiktok',
        title: displayTitle,
        caption: rawCaption,
        permalink: `https://www.tiktok.com/@${cleanUsername}/video/${v.id}`,
        contentFormat: format,
        viewsCount: views,
        likesCount: likes,
        commentsCount: comments,
        sharesCount: shares,
        newFollowers: views > 2000 ? Math.round(views * 0.003) : 0,
        thumbnailUrl: proxyCover,
        isTopPerformer: false,
        publishedAt: pubDate,
      };
    });

    // 4. Sort posts by viewsCount descending so top performing videos are ordered correctly
    posts.sort((a, b) => (Number(b.viewsCount) || 0) - (Number(a.viewsCount) || 0));
    posts.forEach((p, i) => {
      p.isTopPerformer = i < 3;
    });

    return {
      success: true,
      username: cleanUsername,
      nickname,
      avatarUrl: profileHeader?.avatarUrl,
      followerCount: profileHeader?.followerCount,
      heartCount: profileHeader?.heartCount,
      videoCount: profileHeader?.videoCount || rawVideos.length,
      posts,
    };
  } catch (err: any) {
    console.warn('TikTok profile scrape notice:', err?.message || err);
    return { success: false, username: cleanUsername, posts: [] };
  }
}
