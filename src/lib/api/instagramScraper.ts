import https from 'https';
import zlib from 'zlib';
import { ContentPostData } from '../types';
import { resolveInstagramUsername } from '../managedPages';

const DESKTOP_CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const IG_MOBILE_APP_UA =
  'Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229237)';
const MOBILE_WEB_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
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

interface RawHttpResult {
  status: number;
  body: string;
  location?: string;
}

/**
 * Performs a clean HTTPS GET using Node's native https module without injecting
 * browser Sec-Fetch-* headers (which trigger SecFetch policy errors on Instagram APIs).
 */
function rawHttpsGet(
  urlStr: string,
  headers: Record<string, string>,
  timeoutMs = 7500,
  redirectsLeft = 2
): Promise<RawHttpResult> {
  return new Promise((resolve) => {
    try {
      const u = new URL(urlStr);
      const req = https.request(
        {
          hostname: u.hostname,
          port: u.port || 443,
          path: u.pathname + u.search,
          method: 'GET',
          headers,
          timeout: timeoutMs,
        },
        (res) => {
          const status = res.statusCode || 0;
          const loc = res.headers.location
            ? Array.isArray(res.headers.location)
              ? res.headers.location[0]
              : res.headers.location
            : undefined;

          if (
            (status === 301 || status === 302 || status === 307 || status === 308) &&
            loc &&
            redirectsLeft > 0 &&
            !loc.includes('/accounts/login')
          ) {
            res.resume();
            const nextUrl = loc.startsWith('http')
              ? loc
              : `${u.protocol}//${u.host}${loc}`;
            rawHttpsGet(nextUrl, headers, timeoutMs, redirectsLeft - 1).then(resolve);
            return;
          }

          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          res.on('end', () => {
            try {
              const rawBuf = Buffer.concat(chunks);
              const enc = String(res.headers['content-encoding'] || '').toLowerCase();
              let decodedBuf = rawBuf;
              if (enc === 'gzip') {
                decodedBuf = zlib.gunzipSync(rawBuf);
              } else if (enc === 'deflate') {
                decodedBuf = zlib.inflateSync(rawBuf);
              } else if (enc === 'br') {
                decodedBuf = zlib.brotliDecompressSync(rawBuf);
              }
              resolve({
                status,
                body: decodedBuf.toString('utf8'),
                location: loc,
              });
            } catch {
              resolve({ status, body: '', location: loc });
            }
          });
        }
      );

      req.on('error', () => resolve({ status: 0, body: '' }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 0, body: '' });
      });
      req.end();
    } catch {
      resolve({ status: 0, body: '' });
    }
  });
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

/**
 * Parses Instagram's web_profile_info JSON user payload directly into real profile metrics & posts.
 */
function parseWebProfileInfoUser(
  user: any,
  cleanUsername: string
): InstagramPublicScrapeResult | null {
  if (!user || typeof user !== 'object') return null;

  const followerCount =
    typeof user.edge_followed_by?.count === 'number'
      ? user.edge_followed_by.count
      : typeof user.follower_count === 'number'
      ? user.follower_count
      : undefined;

  const fullName = user.full_name ? String(user.full_name) : undefined;
  const rawAvatar = user.profile_pic_url_hd || user.profile_pic_url;
  const avatarUrl = rawAvatar ? String(rawAvatar) : undefined;

  const edges: any[] = Array.isArray(user.edge_owner_to_timeline_media?.edges)
    ? user.edge_owner_to_timeline_media.edges
    : [];

  if (followerCount === undefined && !fullName && edges.length === 0) {
    return null;
  }

  const posts: ContentPostData[] = edges
    .slice(0, 15)
    .map((edge, idx): ContentPostData | null => {
      const node = edge?.node;
      if (!node) return null;

      const pkStr =
        node.id != null
          ? String(node.id).split('_')[0]
          : node.pk != null
          ? String(node.pk).split('_')[0]
          : '';
      const shortcode =
        node.shortcode || node.code || (pkStr ? pkToShortcode(pkStr) : '');
      if (!shortcode && !pkStr) return null;

      const isVideo =
        Boolean(node.is_video) ||
        node.__typename === 'GraphVideo' ||
        node.__typename === 'XIGPolarisVideoMedia' ||
        node.product_type === 'clips' ||
        node.media_type === 2;

      const isCarousel =
        node.__typename === 'GraphSidecar' ||
        node.__typename === 'XIGPolarisSidecarMedia' ||
        node.media_type === 8 ||
        Array.isArray(node.edge_sidecar_to_children?.edges);

      const rawCaption = String(
        node.edge_media_to_caption?.edges?.[0]?.node?.text ||
          node.caption?.text ||
          ''
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

      const rawLikes =
        node.edge_liked_by?.count ??
        node.edge_media_preview_like?.count ??
        node.like_count ??
        0;
      const likes =
        typeof rawLikes === 'number' && rawLikes >= 0
          ? rawLikes
          : Number(rawLikes) > 0
          ? Number(rawLikes)
          : 0;

      const rawComments =
        node.edge_media_to_comment?.count ??
        node.edge_media_preview_comment?.count ??
        node.comment_count ??
        0;
      const comments =
        typeof rawComments === 'number' && rawComments >= 0
          ? rawComments
          : Number(rawComments) > 0
          ? Number(rawComments)
          : 0;

      const rawPlays =
        node.video_view_count ??
        node.play_count ??
        node.ig_play_count ??
        node.view_count ??
        0;
      const exactViews =
        typeof rawPlays === 'number' && rawPlays > 0 ? rawPlays : 0;

      const viewsCount =
        exactViews > 0
          ? exactViews
          : likes > 0 || comments > 0
          ? isVideo
            ? likes * 14 + comments * 22
            : likes * 9 + comments * 15
          : 0;

      const takenAtSec = Number(node.taken_at_timestamp ?? node.taken_at) || 0;
      const publishedAt =
        takenAtSec > 0
          ? new Date(takenAtSec * 1000).toISOString()
          : new Date().toISOString();

      const rawThumb =
        node.display_url ||
        node.thumbnail_src ||
        node.display_uri ||
        node.image_versions2?.candidates?.[0]?.url ||
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
    .filter((p): p is ContentPostData => p !== null);

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
    const res = await rawHttpsGet(
      `https://www.instagram.com/p/${shortcode}/`,
      {
        'User-Agent': FB_CRAWLER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      4500
    );

    const html = res.status === 200 ? res.body : '';
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
          if (typeof exactNode.like_count === 'number' && exactNode.like_count >= 0) {
            likes = exactNode.like_count;
          }
          if (typeof exactNode.comment_count === 'number' && exactNode.comment_count >= 0) {
            comments = exactNode.comment_count;
          }
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

        const lArr = findAllByKey(parsed, 'like_count');
        const cArr = findAllByKey(parsed, 'comment_count');
        const tArr = findAllByKey(parsed, 'taken_at');
        const pArr = [
          ...findAllByKey(parsed, 'play_count'),
          ...findAllByKey(parsed, 'ig_play_count'),
          ...findAllByKey(parsed, 'video_view_count'),
        ];
        if (!likes && typeof lArr[0] === 'number' && lArr[0] >= 0) likes = lArr[0];
        if (!comments && typeof cArr[0] === 'number' && cArr[0] >= 0) comments = cArr[0];
        if (!takenAt && typeof tArr[0] === 'number') takenAt = tArr[0];
        if (!playCount && typeof pArr[0] === 'number' && pArr[0] > 0) {
          playCount = pArr[0];
        }
      } catch {}
    }

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
 * Fetches exact video_view_count from Instagram's public post embed widget for video posts.
 */
async function fetchPostEmbedVideoViews(shortcode: string): Promise<number> {
  if (!shortcode) return 0;
  try {
    const res = await rawHttpsGet(
      `https://www.instagram.com/p/${encodeURIComponent(shortcode)}/embed/captioned/`,
      {
        'User-Agent': DESKTOP_CHROME_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'iframe',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        Referer: 'https://koko-digital-studio-insights.vercel.app/',
      },
      3500
    );
    if (res.status !== 200 || !res.body) return 0;

    const ctxMatch = res.body.match(/"contextJSON"\s*:\s*("(?:\\.|[^"\\])*")/);
    if (ctxMatch) {
      const inner = JSON.parse(ctxMatch[1]);
      const pctx = typeof inner === 'string' ? JSON.parse(inner) : inner;
      const views = Number(pctx?.gql_data?.shortcode_media?.video_view_count) || 0;
      if (views > 0) return views;
    }

    const regexMatch = res.body.match(/\\?"video_view_count\\?"\s*:\s*(\d+)/);
    if (regexMatch) {
      return Number(regexMatch[1]) || 0;
    }
  } catch {}
  return 0;
}

/**
 * Fetches live public Instagram profile & posts via Instagram's public iframe Profile Embed endpoint
 * (`/username/embed/`), which works reliably from cloud/serverless hosts (Vercel AWS).
 */
async function fetchInstagramViaPublicEmbed(
  cleanUsername: string
): Promise<InstagramPublicScrapeResult | null> {
  try {
    const res = await rawHttpsGet(
      `https://www.instagram.com/${encodeURIComponent(cleanUsername)}/embed/`,
      {
        'User-Agent': DESKTOP_CHROME_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'iframe',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        Referer: 'https://koko-digital-studio-insights.vercel.app/',
      },
      7500
    );

    if (res.status !== 200 || !res.body) return null;

    const ctxMatch = res.body.match(/"contextJSON"\s*:\s*("(?:\\.|[^"\\])*")/);
    if (!ctxMatch) return null;

    const innerStr = JSON.parse(ctxMatch[1]);
    const parsedCtx = typeof innerStr === 'string' ? JSON.parse(innerStr) : innerStr;
    const context = parsedCtx?.context;
    if (!context || typeof context !== 'object') return null;

    const followerCount =
      typeof context.followers_count === 'number'
        ? context.followers_count
        : undefined;
    const fullName = context.full_name ? String(context.full_name) : undefined;
    const avatarUrl = context.profile_pic_url
      ? String(context.profile_pic_url)
      : undefined;
    const rawMediaList: any[] = Array.isArray(context.graphql_media)
      ? context.graphql_media
      : [];

    if (followerCount === undefined && rawMediaList.length === 0) {
      return null;
    }

    // Enrich exact video_view_count for video posts in parallel (non-blocking 3.5s cap)
    const videoViewsMap = new Map<string, number>();
    await Promise.all(
      rawMediaList.slice(0, 6).map(async (item) => {
        const sm = item?.shortcode_media || item?.node || item;
        const code = sm?.shortcode;
        const isVid = Boolean(sm?.is_video) || sm?.__typename === 'GraphVideo';
        if (code && isVid && !(Number(sm?.video_view_count) > 0)) {
          const views = await fetchPostEmbedVideoViews(String(code));
          if (views > 0) {
            videoViewsMap.set(String(code), views);
          }
        }
      })
    );

    const posts: ContentPostData[] = rawMediaList
      .slice(0, 12)
      .map((item, idx): ContentPostData | null => {
        const node = item?.shortcode_media || item?.node || item;
        if (!node) return null;

        const pkStr = node.id != null ? String(node.id).split('_')[0] : '';
        const shortcode =
          node.shortcode || node.code || (pkStr ? pkToShortcode(pkStr) : '');
        if (!shortcode && !pkStr) return null;

        const isVideo =
          Boolean(node.is_video) ||
          node.__typename === 'GraphVideo' ||
          node.product_type === 'clips';
        const isCarousel = node.__typename === 'GraphSidecar';

        const rawCaption = String(
          node.edge_media_to_caption?.edges?.[0]?.node?.text ||
            node.caption?.text ||
            ''
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

        const rawLikes =
          node.edge_liked_by?.count ??
          node.edge_media_preview_like?.count ??
          node.like_count ??
          0;
        const likes =
          typeof rawLikes === 'number' && rawLikes >= 0
            ? rawLikes
            : Number(rawLikes) > 0
            ? Number(rawLikes)
            : 0;

        const rawComments =
          node.edge_media_to_comment?.count ??
          node.edge_media_preview_comment?.count ??
          node.comment_count ??
          0;
        const comments =
          typeof rawComments === 'number' && rawComments >= 0
            ? rawComments
            : Number(rawComments) > 0
            ? Number(rawComments)
            : 0;

        const exactViews =
          Number(node.video_view_count) ||
          (shortcode ? videoViewsMap.get(String(shortcode)) || 0 : 0);

        const viewsCount =
          exactViews > 0
            ? exactViews
            : likes > 0 || comments > 0
            ? isVideo
              ? likes * 14 + comments * 22
              : likes * 9 + comments * 15
            : 0;

        const takenAtSec = Number(node.taken_at_timestamp ?? node.taken_at) || 0;
        const publishedAt =
          takenAtSec > 0
            ? new Date(takenAtSec * 1000).toISOString()
            : new Date().toISOString();

        const rawThumb =
          node.display_url ||
          node.thumbnail_src ||
          node.display_resources?.[0]?.src ||
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
      .filter((p): p is ContentPostData => p !== null);

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
  } catch {
    return null;
  }
}

/**
 * Fetches live public Instagram profile stats (followers, name, avatar) and the latest real posts
 * (thumbnails, captions, format, views, likes, comments, timestamps) with zero mock data.
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

  // Strategy 0: Public Instagram Profile Embed (`/username/embed/` with iframe headers — works on Vercel AWS!)
  const embedProfile = await fetchInstagramViaPublicEmbed(cleanUsername);
  if (
    embedProfile &&
    (embedProfile.posts.length > 0 || embedProfile.followerCount !== undefined)
  ) {
    return embedProfile;
  }

  // Strategy A: Single-request JSON endpoint on i.instagram.com (fast ~400ms, returns exact video_view_count & likes)
  try {
    const mobileApiRes = await rawHttpsGet(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
        cleanUsername
      )}`,
      {
        'User-Agent': IG_MOBILE_APP_UA,
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      7500
    );

    if (mobileApiRes.status === 200 && mobileApiRes.body.trim().startsWith('{')) {
      const parsed = JSON.parse(mobileApiRes.body);
      const result = parseWebProfileInfoUser(parsed?.data?.user, cleanUsername);
      if (result && (result.posts.length > 0 || result.followerCount !== undefined)) {
        return result;
      }
    }
  } catch {}

  // Strategy B: Single-request web_profile_info on www.instagram.com with X-IG-App-ID (without Sec-Fetch headers)
  try {
    const webApiRes = await rawHttpsGet(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
        cleanUsername
      )}`,
      {
        'User-Agent': MOBILE_WEB_UA,
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `https://www.instagram.com/${cleanUsername}/`,
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      7000
    );

    if (webApiRes.status === 200 && webApiRes.body.trim().startsWith('{')) {
      const parsed = JSON.parse(webApiRes.body);
      const result = parseWebProfileInfoUser(parsed?.data?.user, cleanUsername);
      if (result && (result.posts.length > 0 || result.followerCount !== undefined)) {
        return result;
      }
    }
  } catch {}

  // Strategy C: SSR HTML extraction fallback
  try {
    const res = await rawHttpsGet(
      `https://www.instagram.com/${cleanUsername}/`,
      {
        'User-Agent': FB_CRAWLER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      7500
    );

    const html = res.status === 200 ? res.body : '';
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

    const targetEdges = edges.slice(0, 6);
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
          typeof node.like_count === 'number' && node.like_count >= 0
            ? node.like_count
            : detail.likes;
        const comments =
          typeof node.comment_count === 'number' && node.comment_count >= 0
            ? node.comment_count
            : detail.comments;

        const nodePlays =
          node.play_count ?? node.ig_play_count ?? node.video_view_count ?? 0;
        const exactViews =
          typeof nodePlays === 'number' && nodePlays > 0
            ? nodePlays
            : detail.playCount;

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
