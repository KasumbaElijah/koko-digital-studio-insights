import axios from 'axios';
import { ContentPostData } from '../types';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

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

interface TikTokProfileHeader {
  secUid?: string;
  nickname?: string;
  avatarUrl?: string;
  followerCount?: number;
  heartCount?: number;
  videoCount?: number;
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
  coverUrl?: string | null;
}

/**
 * Fetches real TikTok user profile info (secUid, followers, likes, videoCount, avatar)
 * using mobile Safari SSR hydration payload to avoid desktop WAF challenge.
 */
async function fetchTikTokProfileHeader(username: string): Promise<TikTokProfileHeader | null> {
  try {
    const res = await axios.get(`https://www.tiktok.com/@${username}`, {
      headers: {
        'User-Agent': IPHONE_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 8000,
    });
    const html = res.data;
    const match =
      typeof html === 'string'
        ? html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/)
        : null;
    if (match) {
      const data = JSON.parse(match[1]);
      const defaultScope = data['__DEFAULT_SCOPE__'] || {};
      const userDetail = defaultScope['webapp.user-detail'] || {};
      const userInfo = userDetail.userInfo || {};
      const user = userInfo.user || {};
      const stats = userInfo.stats || userInfo.statsV2 || {};
      if (!user.id && !user.secUid && !user.uniqueId) {
        return null;
      }
      return {
        secUid: user.secUid,
        nickname: user.nickname,
        avatarUrl: user.avatarLarger || user.avatarMedium || user.avatarThumb,
        followerCount:
          stats.followerCount != null ? Number(stats.followerCount) : undefined,
        heartCount:
          (stats.heartCount ?? stats.heart) != null
            ? Number(stats.heartCount ?? stats.heart)
            : undefined,
        videoCount:
          stats.videoCount != null ? Number(stats.videoCount) : undefined,
      };
    }
  } catch {}
  return null;
}

/**
 * Fetches the creator's latest real video items via TikTok's mobile web creator item_list endpoint.
 */
async function fetchTikTokCreatorItemList(
  username: string,
  secUid: string
): Promise<any[]> {
  try {
    const url = `https://www.tiktok.com/api/creator/item_list/?aid=1988&app_name=tiktok_web&device_platform=web_mobile&count=20&cursor=${Date.now()}&secUid=${encodeURIComponent(secUid)}&type=1`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': IPHONE_UA,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: `https://www.tiktok.com/@${username}`,
      },
      timeout: 9000,
    });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (Array.isArray(data?.itemList) && data.itemList.length > 0) {
      return data.itemList;
    }
  } catch {}
  return [];
}

/**
 * Fetches exact live likes, comments, shares, views, and timestamp for a specific TikTok video.
 */
async function fetchSingleTikTokVideoDetail(
  username: string,
  videoId: string
): Promise<TikTokVideoDetail | null> {
  try {
    const res = await axios.get(`https://www.tiktok.com/@${username}/video/${videoId}`, {
      headers: {
        'User-Agent': IPHONE_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 7000,
    });
    const html = res.data;
    const match =
      typeof html === 'string'
        ? html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/)
        : null;
    if (match) {
      const data = JSON.parse(match[1]);
      const defaultScope = data['__DEFAULT_SCOPE__'] || {};
      const videoDetail = defaultScope['webapp.video-detail'];
      const itemStruct = videoDetail?.itemInfo?.itemStruct;
      if (itemStruct) {
        const stats = itemStruct.stats || itemStruct.statsV2 || {};
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

function mapTikTokItemToPost(
  v: any,
  idx: number,
  cleanUsername: string,
  detail?: TikTokVideoDetail
): ContentPostData {
  const vidStr = String(v.id || '');
  const stats = v.stats || v.statsV2 || {};

  let pubDate = detail?.createTime || '';
  if (!pubDate && v.createTime) {
    const tsSec = Number(v.createTime);
    if (tsSec > 0 && !isNaN(tsSec)) {
      pubDate = new Date(tsSec * 1000).toISOString();
    }
  }
  if (!pubDate && vidStr && /^\d+$/.test(vidStr)) {
    try {
      const ts = Number(BigInt(vidStr) >> BigInt(32));
      if (ts > 0 && !isNaN(ts)) {
        pubDate = new Date(ts * 1000).toISOString();
      }
    } catch {}
  }
  if (!pubDate) pubDate = new Date().toISOString();

  const views = detail?.views ?? (Number(stats.playCount ?? v.playCount) || 0);
  const likes = detail?.likes ?? (Number(stats.diggCount ?? v.diggCount) || 0);
  const comments = detail?.comments ?? (Number(stats.commentCount ?? v.commentCount) || 0);
  const shares = detail?.shares ?? (Number(stats.shareCount ?? v.shareCount) || 0);

  const rawCover =
    detail?.coverUrl ||
    v.video?.cover ||
    v.video?.originCover ||
    v.video?.dynamicCover ||
    v.imagePost?.cover?.imageURL?.urlList?.[0] ||
    v.imagePost?.images?.[0]?.imageURL?.urlList?.[0] ||
    v.coverUrl ||
    v.originCoverUrl ||
    v.dynamicCoverUrl ||
    null;

  const proxyCover = rawCover ? `/api/image-proxy?url=${encodeURIComponent(rawCover)}` : null;

  const rawCaption = String(detail?.caption || v.desc || '').trim();
  const descLower = rawCaption.toLowerCase();

  let format: 'Videos' | 'Image' | 'Graphic' | 'Stories' = 'Videos';
  if (v.imagePost) {
    format =
      Array.isArray(v.imagePost.images) && v.imagePost.images.length > 1
        ? 'Graphic'
        : 'Image';
  } else if (descLower.includes('#story') || descLower.includes('#stories') || v.is_story) {
    format = 'Stories';
  } else if (descLower.includes('#graphic') || descLower.includes('#carousel')) {
    format = 'Graphic';
  } else if (descLower.includes('#photo') || v.is_photo) {
    format = 'Image';
  }

  const displayTitle = rawCaption
    ? rawCaption.length > 75
      ? `${rawCaption.substring(0, 75)}...`
      : rawCaption
    : `TikTok Video #${idx + 1}`;

  return {
    id: `post_tt_${vidStr}`,
    postId: vidStr,
    platform: 'tiktok',
    title: displayTitle,
    caption: rawCaption,
    permalink: `https://www.tiktok.com/@${cleanUsername}/video/${vidStr}`,
    contentFormat: format,
    viewsCount: views,
    likesCount: likes,
    commentsCount: comments,
    sharesCount: shares,
    newFollowers: 0,
    thumbnailUrl: proxyCover,
    isTopPerformer: false,
    publishedAt: pubDate,
  };
}

/**
 * Fetches real TikTok videos, descriptions, thumbnails, exact likes, comments, and play counts
 * directly from the creator's live TikTok profile and creator item list.
 */
export async function fetchTikTokProfileVideos(
  username: string
): Promise<TikTokProfileScrapeResult> {
  const cleanUsername = (username || '').replace(/^@/, '').trim();
  if (!cleanUsername) {
    return { success: false, username: '', posts: [] };
  }

  try {
    // 1. Fetch profile header via mobile Safari UA
    const profileHeader = await fetchTikTokProfileHeader(cleanUsername);

    // 2. Primary path: fetch real videos with complete stats via creator/item_list
    if (profileHeader?.secUid) {
      const itemList = await fetchTikTokCreatorItemList(cleanUsername, profileHeader.secUid);
      if (itemList.length > 0) {
        const posts = itemList.map((v, idx) => mapTikTokItemToPost(v, idx, cleanUsername));
        posts.sort((a, b) => (Number(b.viewsCount) || 0) - (Number(a.viewsCount) || 0));
        posts.forEach((p, i) => {
          p.isTopPerformer = i < 3;
        });

        return {
          success: true,
          username: cleanUsername,
          nickname: profileHeader.nickname || cleanUsername,
          avatarUrl: profileHeader.avatarUrl,
          followerCount: profileHeader.followerCount,
          heartCount: profileHeader.heartCount,
          videoCount: profileHeader.videoCount ?? posts.length,
          posts,
        };
      }
    }

    // 3. Secondary fallback: check /embed/@username if item_list was unavailable
    const embedRes = await axios
      .get(`https://www.tiktok.com/embed/@${cleanUsername}`, {
        headers: {
          'User-Agent': IPHONE_UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 8000,
      })
      .catch(() => null);

    const html = embedRes?.data;
    let userInfo: any = null;
    let rawVideos: any[] = [];

    const frontityMatch =
      typeof html === 'string'
        ? html.match(/<script id="__FRONTITY_CONNECT_STATE__"[^>]*>([\s\S]*?)<\/script>/)
        : null;
    if (frontityMatch) {
      try {
        const state = JSON.parse(frontityMatch[1]);
        const dataMap = state.source?.data || {};
        const key = Object.keys(dataMap).find((k) =>
          k.toLowerCase().includes(cleanUsername.toLowerCase())
        );
        if (key && dataMap[key]) {
          userInfo = dataMap[key].userInfo;
          if (Array.isArray(dataMap[key].videoList)) {
            rawVideos = dataMap[key].videoList;
          }
        }
      } catch {}
    }

    if (!userInfo && typeof html === 'string') {
      const vMatch = html.match(/"videoList":(\[\{.*?\}\]|\[\])/);
      if (vMatch) {
        try {
          rawVideos = JSON.parse(vMatch[1]);
        } catch {}
      }
    }

    const followerCount = userInfo?.followerCount ?? profileHeader?.followerCount;
    const nickname = userInfo?.nickname ?? profileHeader?.nickname ?? cleanUsername;
    const avatarUrl = userInfo?.avatarThumbUrl ?? profileHeader?.avatarUrl;
    const heartCount = userInfo?.heartCount ?? profileHeader?.heartCount ?? 0;
    const videoCount = rawVideos.length || profileHeader?.videoCount || 0;

    if (!userInfo && !profileHeader && rawVideos.length === 0) {
      return {
        success: false,
        username: cleanUsername,
        nickname: cleanUsername,
        posts: [],
      };
    }

    if (rawVideos.length === 0) {
      return {
        success: true,
        username: cleanUsername,
        nickname,
        avatarUrl,
        followerCount,
        heartCount,
        videoCount,
        posts: [],
      };
    }

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

    const posts = rawVideos.map((v, idx) =>
      mapTikTokItemToPost(v, idx, cleanUsername, detailMap.get(String(v.id || '')))
    );

    posts.sort((a, b) => (Number(b.viewsCount) || 0) - (Number(a.viewsCount) || 0));
    posts.forEach((p, i) => {
      p.isTopPerformer = i < 3;
    });

    return {
      success: true,
      username: cleanUsername,
      nickname,
      avatarUrl,
      followerCount,
      heartCount,
      videoCount,
      posts,
    };
  } catch (err: any) {
    console.warn('TikTok profile scrape notice:', err?.message || err);
    return { success: false, username: cleanUsername, posts: [] };
  }
}
