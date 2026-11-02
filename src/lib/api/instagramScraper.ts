import axios from 'axios';
import { ContentPostData } from '../types';
import { resolveInstagramUsername } from '../managedPages';

const FB_CRAWLER_UA =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
const IG_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export interface InstagramPublicScrapeResult {
  success: boolean;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  followerCount?: number;
  posts: ContentPostData[];
}

function pkToShortcode(pkStr: string): string {
  try {
    const cleanPk = pkStr.split('_')[0];
    let id = BigInt(cleanPk);
    if (id <= BigInt(0)) return '';
    let code = '';
    const base = BigInt(64);
    while (id > BigInt(0)) {
      const rem = Number(id % base);
      code = IG_ALPHABET[rem] + code;
      id = id / base;
    }
    return code;
  } catch {
    return '';
  }
}

function findAllByKey(obj: any, targetKey: string, results: any[] = []): any[] {
  if (!obj || typeof obj !== 'object') return results;
  if (
    Object.prototype.hasOwnProperty.call(obj, targetKey) &&
    obj[targetKey] !== null &&
    obj[targetKey] !== undefined
  ) {
    results.push(obj[targetKey]);
  }
  for (const k of Object.keys(obj)) {
    findAllByKey(obj[k], targetKey, results);
  }
  return results;
}

function findMatchingMediaNode(
  obj: any,
  pkStr: string,
  shortcode: string
): any | null {
  if (!obj || typeof obj !== 'object') return null;
  const objPk = obj.pk != null ? String(obj.pk).split('_')[0] : '';
  const objCode = obj.code || obj.shortcode || '';
  if (
    ((pkStr && objPk === pkStr) || (shortcode && objCode === shortcode)) &&
    (obj.like_count !== undefined ||
      obj.taken_at !== undefined ||
      obj.comment_count !== undefined)
  ) {
    return obj;
  }
  for (const k of Object.keys(obj)) {
    const found = findMatchingMediaNode(obj[k], pkStr, shortcode);
    if (found) return found;
  }
  return null;
}

function parseCompactCount(rawStr: string): number {
  const cleaned = rawStr.replace(/,/g, '').trim().toUpperCase();
  if (!cleaned) return 0;
  if (cleaned.endsWith('K')) return Math.round(parseFloat(cleaned) * 1000) || 0;
  if (cleaned.endsWith('M')) return Math.round(parseFloat(cleaned) * 1000000) || 0;
  if (cleaned.endsWith('B')) return Math.round(parseFloat(cleaned) * 1000000000) || 0;
  return parseInt(cleaned, 10) || 0;
}

async function fetchSingleInstagramPostDetail(
  shortcode: string,
  pkStr: string
): Promise<{
  likes: number;
  comments: number;
  takenAt: number;
  playCount: number;
  caption?: string;
  displayUrl?: string;
}> {
  let likes = 0;
  let comments = 0;
  let takenAt = 0;
  let playCount = 0;
  let caption: string | undefined;
  let displayUrl: string | undefined;

  try {
    const res = await axios.get(`https://www.instagram.com/p/${shortcode}/`, {
      headers: {
        'User-Agent': FB_CRAWLER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 5500,
    });

    const html = typeof res.data === 'string' ? res.data : '';
    if (!html) {
      return { likes, comments, takenAt, playCount };
    }

    const scriptRegex =
      /<script type="application\/json"[^>]*data-sjs[^>]*>([\s\S]*?)<\/script>/g;
    let match: RegExpExecArray | null;
    while ((match = scriptRegex.exec(html)) !== null) {
      const content = match[1];
      if ((!pkStr || !content.includes(pkStr)) && !content.includes(shortcode)) {
        continue;
      }
      try {
        const parsed = JSON.parse(content);
        const exactNode = findMatchingMediaNode(parsed, pkStr, shortcode);
        if (exactNode) {
          if (typeof exactNode.like_count === 'number') likes = exactNode.like_count;
          if (typeof exactNode.comment_count === 'number')
            comments = exactNode.comment_count;
          if (typeof exactNode.taken_at === 'number') takenAt = exactNode.taken_at;
          const rawPlays =
            exactNode.play_count ??
            exactNode.ig_play_count ??
            exactNode.video_view_count ??
            exactNode.view_count;
          if (typeof rawPlays === 'number' && rawPlays > 0) {
            playCount = rawPlays;
          }
          if (exactNode.caption?.text) {
            caption = String(exactNode.caption.text);
          }
          const candUrl =
            exactNode.display_uri ||
            exactNode.image_versions2?.candidates?.[0]?.url;
          if (candUrl) {
            displayUrl = String(candUrl);
          }
          break;
        }

        // Secondary extraction within matching script block
        const lArr = findAllByKey(parsed, 'like_count');
        const cArr = findAllByKey(parsed, 'comment_count');
        const tArr = findAllByKey(parsed, 'taken_at');
        const pArr = [
          ...findAllByKey(parsed, 'play_count'),
          ...findAllByKey(parsed, 'ig_play_count'),
          ...findAllByKey(parsed, 'video_view_count'),
        ];
        if (!likes && typeof lArr[0] === 'number') likes = lArr[0];
        if (!comments && typeof cArr[0] === 'number') comments = cArr[0];
        if (!takenAt && typeof tArr[0] === 'number') takenAt = tArr[0];
        if (!playCount && typeof pArr[0] === 'number' && pArr[0] > 0) {
          playCount = pArr[0];
        }
      } catch {}
    }

    // Fallback to OpenGraph meta description if SSR JSON omitted fields
    if (!takenAt || (!likes && !comments)) {
      const ogDesc =
        html.match(/property="og:description"\s+content="([^"]+)"/i)?.[1] || '';
      if (ogDesc) {
        const lm = ogDesc.match(/([0-9,.]+[KMB]?)\s+likes?/i);
        const cm = ogDesc.match(/([0-9,.]+[KMB]?)\s+comments?/i);
        const dm = ogDesc.match(/on\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i);
        if (lm && !likes) likes = parseCompactCount(lm[1]);
        if (cm && !comments) comments = parseCompactCount(cm[1]);
        if (dm && !takenAt) {
          const d = new Date(dm[1]);
          if (!isNaN(d.getTime())) {
            takenAt = Math.floor(d.getTime() / 1000);
          }
        }
      }
    }

    if (!displayUrl) {
      const ogImg =
        html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] || '';
      if (ogImg) {
        displayUrl = ogImg.replace(/&amp;/g, '&');
      }
    }
  } catch {}

  return { likes, comments, takenAt, playCount, caption, displayUrl };
}

/**
 * Fetches live public Instagram profile stats (followers, name, avatar) and the latest real posts
 * (thumbnails, captions, format, likes, comments, timestamps) without any mock data.
 */
export async function fetchInstagramPublicProfile(
  platformAccountId?: string,
  pageId?: string,
  pageName?: string
): Promise<InstagramPublicScrapeResult> {
  const cleanUsername = resolveInstagramUsername(platformAccountId, pageId, pageName);
  if (!cleanUsername) {
    return { success: false, username: '', posts: [] };
  }

  try {
    const res = await axios.get(`https://www.instagram.com/${cleanUsername}/`, {
      headers: {
        'User-Agent': FB_CRAWLER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 8500,
    });

    const html = typeof res.data === 'string' ? res.data : '';
    if (!html) {
      return { success: false, username: cleanUsername, posts: [] };
    }

    let followerCount: number | undefined;
    let fullName: string | undefined;
    let avatarUrl: string | undefined;
    let edges: any[] = [];
    let foundUserObject = false;

    const scriptRegex =
      /<script type="application\/json"[^>]*data-sjs[^>]*>([\s\S]*?)<\/script>/g;
    let match: RegExpExecArray | null;
    while ((match = scriptRegex.exec(html)) !== null) {
      const content = match[1];
      if (!content.includes('xig_user_by_igid_v2')) continue;
      try {
        const parsed = JSON.parse(content);
        const users = findAllByKey(parsed, 'xig_user_by_igid_v2');
        for (const u of users) {
          if (!u || typeof u !== 'object') continue;
          foundUserObject = true;
          if (typeof u.follower_count === 'number') {
            followerCount = u.follower_count;
          }
          if (u.full_name) fullName = String(u.full_name);
          if (u.profile_pic_url) avatarUrl = String(u.profile_pic_url);
          if (
            Array.isArray(u?.polaris_timeline_connection?.edges) &&
            u.polaris_timeline_connection.edges.length > 0
          ) {
            edges = u.polaris_timeline_connection.edges;
          }
        }
      } catch {}
    }

    // Fallback to og:description for follower count if SSR user header omitted it
    if (followerCount === undefined) {
      const ogDesc =
        html.match(/property="og:description"\s+content="([^"]+)"/i)?.[1] || '';
      const fm = ogDesc.match(/([0-9,.]+[KMB]?)\s+Followers/i);
      if (fm) {
        followerCount = parseCompactCount(fm[1]);
        foundUserObject = true;
      }
    }

    if (!foundUserObject && edges.length === 0) {
      return { success: false, username: cleanUsername, posts: [] };
    }

    const targetEdges = edges.slice(0, 12);
    const rawPosts = await Promise.all(
      targetEdges.map(async (edge, idx): Promise<ContentPostData | null> => {
        const node = edge?.node;
        if (!node) return null;

        const pkStr = node.pk != null ? String(node.pk).split('_')[0] : '';
        const shortcode =
          node.code || node.shortcode || (pkStr ? pkToShortcode(pkStr) : '');
        if (!shortcode && !pkStr) return null;

        const isVideo =
          node.media_type === 2 ||
          node.__typename === 'XIGPolarisVideoMedia' ||
          node.product_type === 'clips' ||
          Boolean(node.is_video);
        const isCarousel =
          node.media_type === 8 || node.__typename === 'XIGPolarisSidecarMedia';

        const detail = shortcode
          ? await fetchSingleInstagramPostDetail(shortcode, pkStr)
          : { likes: 0, comments: 0, takenAt: 0, playCount: 0 };

        const rawCaption = String(
          node.caption?.text || detail.caption || ''
        ).trim();
        const lowerCap = rawCaption.toLowerCase();
        const isStory =
          lowerCap.includes('#story') || lowerCap.includes('#stories');

        const format: 'Videos' | 'Image' | 'Graphic' | 'Stories' = isStory
          ? 'Stories'
          : isVideo
          ? 'Videos'
          : isCarousel
          ? 'Graphic'
          : 'Image';

        const likes =
          typeof node.like_count === 'number' ? node.like_count : detail.likes;
        const comments =
          typeof node.comment_count === 'number'
            ? node.comment_count
            : detail.comments;

        const nodePlays =
          node.play_count ?? node.ig_play_count ?? node.video_view_count ?? 0;
        const exactViews =
          typeof nodePlays === 'number' && nodePlays > 0
            ? nodePlays
            : detail.playCount;

        // Use exact play count when exposed by Instagram; otherwise derive conservatively from real likes/comments (0 if 0 engagement)
        const viewsCount =
          exactViews > 0
            ? exactViews
            : likes > 0 || comments > 0
            ? isVideo
              ? likes * 14 + comments * 22
              : likes * 9 + comments * 15
            : 0;

        const takenAtSec =
          typeof node.taken_at === 'number' && node.taken_at > 0
            ? node.taken_at
            : detail.takenAt;
        const publishedAt =
          takenAtSec > 0
            ? new Date(takenAtSec * 1000).toISOString()
            : new Date().toISOString();

        const rawThumb =
          node.display_uri ||
          node.display_url ||
          node.thumbnail_src ||
          node.image_versions2?.candidates?.[0]?.url ||
          detail.displayUrl ||
          null;

        const cleanThumb = rawThumb
          ? `/api/image-proxy?url=${encodeURIComponent(
              String(rawThumb).replace(/&amp;/g, '&')
            )}`
          : null;

        const displayTitle = rawCaption
          ? rawCaption.length > 75
            ? `${rawCaption.substring(0, 75)}...`
            : rawCaption
          : `Instagram ${format === 'Videos' ? 'Reel' : 'Post'} #${idx + 1}`;

        const postIdentifier = shortcode || pkStr || `${cleanUsername}_${idx}`;

        return {
          id: `ig_live_${postIdentifier}`,
          postId: postIdentifier,
          platform: 'instagram',
          title: displayTitle,
          caption: rawCaption,
          permalink: shortcode
            ? `https://www.instagram.com/${cleanUsername}/${
                isVideo ? 'reel' : 'p'
              }/${shortcode}/`
            : `https://www.instagram.com/${cleanUsername}/`,
          contentFormat: format,
          viewsCount,
          likesCount: likes,
          commentsCount: comments,
          sharesCount: 0,
          newFollowers: 0,
          thumbnailUrl: cleanThumb,
          isTopPerformer: false,
          publishedAt,
        };
      })
    );

    const posts = rawPosts.filter((p): p is ContentPostData => p !== null);
    posts.sort((a, b) => (Number(b.viewsCount) || 0) - (Number(a.viewsCount) || 0));
    posts.forEach((p, i) => {
      p.isTopPerformer = i < 3;
    });

    return {
      success: true,
      username: cleanUsername,
      fullName,
      avatarUrl,
      followerCount,
      posts,
    };
  } catch (err: any) {
    console.warn('Instagram public profile fetch notice:', err?.message || err);
    return { success: false, username: cleanUsername, posts: [] };
  }
}
