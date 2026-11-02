import { NextResponse } from 'next/server';
import { fetchInstagramMetrics } from '@/lib/api/instagram';
import { fetchTikTokMetrics } from '@/lib/api/tiktok';
import { prisma } from '@/lib/prisma';
import { sanitizePostsList, formatTikTokHandle } from '@/lib/managedPages';
import { calculatePctChange } from '@/lib/analytics';

export async function POST(request: Request) {
  try {
    let clientId = '';
    const defaultEnd = new Date();
    const defaultStart = new Date();
    defaultStart.setDate(defaultEnd.getDate() - 30);
    let startDateStr = defaultStart.toISOString().split('T')[0];
    let endDateStr = defaultEnd.toISOString().split('T')[0];
    let bodyAccessToken = '';
    let bodyPlatformAccountId = '';
    let bodyTiktokAccessToken = '';
    let bodyTiktokPlatformAccountId = '';
    let pageId = '';
    let pageName = '';

    let existingPostsFromClient: any[] = [];
    try {
      const body = await request.json();
      clientId = body.clientId || clientId;
      startDateStr = body.startDate || startDateStr;
      endDateStr = body.endDate || endDateStr;
      bodyAccessToken = body.accessToken || '';
      bodyPlatformAccountId =
        typeof body.platformAccountId === 'string' ? body.platformAccountId : '';
      bodyTiktokAccessToken = body.tiktokAccessToken || '';
      bodyTiktokPlatformAccountId =
        typeof body.tiktokPlatformAccountId === 'string'
          ? body.tiktokPlatformAccountId
          : '';
      pageId = typeof body.pageId === 'string' ? body.pageId : '';
      pageName = typeof body.pageName === 'string' ? body.pageName : '';
      if (Array.isArray(body.existingPosts)) {
        existingPostsFromClient = sanitizePostsList(body.existingPosts);
      }
    } catch (e) {
      console.warn('Body parse warning on sync:', e);
    }

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    let socialAccounts: any[] = [];
    try {
      socialAccounts = await prisma.socialAccount.findMany({
        where: { clientId },
      });
    } catch {}

    if (!socialAccounts || socialAccounts.length === 0) {
      try {
        const { getServerSocialAccounts } = await import('@/lib/serverStore');
        socialAccounts = getServerSocialAccounts(clientId);
      } catch {}
    }

    const igAccount = socialAccounts.find((a) => a.platform === 'instagram');
    const ttAccount = socialAccounts.find((a) => a.platform === 'tiktok');

    // Explicit request body selection takes priority over cached DB/store entries (critical when switching Pages)
    const igToken = bodyAccessToken || igAccount?.accessToken || '';
    const igPlatformAccountId =
      bodyPlatformAccountId || igAccount?.platformAccountId || '';
    const effectivePageId = pageId || igAccount?.pageId || '';
    const effectivePageName = pageName || igAccount?.pageName || '';

    const ttToken = bodyTiktokAccessToken || ttAccount?.accessToken || '';
    const rawTtHandle =
      bodyTiktokPlatformAccountId || ttAccount?.platformAccountId || '';
    const effectiveTtHandle = rawTtHandle ? formatTikTokHandle(rawTtHandle) : '';

    const shouldSyncInstagram = Boolean(
      igPlatformAccountId || effectivePageId || effectivePageName || igToken
    );
    const shouldSyncTikTok = Boolean(effectiveTtHandle || ttToken);

    const [igMetrics, ttMetrics] = await Promise.all([
      shouldSyncInstagram
        ? fetchInstagramMetrics(
            igPlatformAccountId,
            igToken,
            startDate,
            endDate,
            effectivePageId,
            effectivePageName
          ).catch((e) => {
            console.warn('Instagram sync error:', e);
            return null;
          })
        : Promise.resolve(null),
      shouldSyncTikTok && effectiveTtHandle
        ? fetchTikTokMetrics(
            effectiveTtHandle,
            ttToken || 'tt_direct_token',
            startDate,
            endDate
          ).catch((e) => {
            console.warn('TikTok sync error:', e);
            return null;
          })
        : Promise.resolve(null),
    ]);

    const igPosts: any[] = (igMetrics?.posts || []).map((p: any, idx: number) => ({
      id: p.postId ? `ig_live_${p.postId}` : `ig_live_${idx}`,
      postId: p.postId || `ig_live_${idx}`,
      clientId,
      platform: 'instagram' as const,
      title:
        p.title ||
        (p.contentFormat === 'Stories'
          ? 'Instagram Story'
          : p.contentFormat === 'Videos'
          ? 'Instagram Reel'
          : 'Instagram Post'),
      caption: p.caption || '',
      permalink: p.permalink || '',
      contentFormat: p.contentFormat,
      format: p.contentFormat,
      viewsCount: Number(p.viewsCount) || 0,
      likesCount: Number(p.likesCount) || 0,
      commentsCount: Number(p.commentsCount) || 0,
      sharesCount: Number(p.sharesCount) || 0,
      newFollowers: Number(p.newFollowers) || 0,
      thumbnailUrl: p.thumbnailUrl || null,
      isTopPerformer: idx < 3,
      publishedAt: p.publishedAt,
    }));

    const ttPosts: any[] = (ttMetrics?.posts || []).map((p: any, idx: number) => ({
      id: p.postId ? `post_tt_${p.postId}` : `post_tt_${idx}`,
      postId: p.postId || `post_tt_${idx}`,
      clientId,
      platform: 'tiktok' as const,
      title: p.title || 'TikTok Video',
      caption: p.caption || '',
      permalink: p.permalink || '',
      contentFormat: p.contentFormat,
      format: p.contentFormat,
      viewsCount: Number(p.viewsCount) || 0,
      likesCount: Number(p.likesCount) || 0,
      commentsCount: Number(p.commentsCount) || 0,
      sharesCount: Number(p.sharesCount) || 0,
      newFollowers: Number(p.newFollowers) || 0,
      thumbnailUrl: p.thumbnailUrl || null,
      isTopPerformer: idx < 3,
      publishedAt: p.publishedAt,
    }));

    const isManualUserPost = (p: any) => /^post_\d{10,15}$/.test(String(p?.id || ''));

    const incomingPosts = [...igPosts, ...ttPosts];
    const incomingIds = new Set(incomingPosts.map((p) => p.postId || p.id));

    // Replace automated posts for any platform synced in this request so page switches never stack old posts
    const preservedPosts = existingPostsFromClient.filter((p) => {
      if (incomingIds.has(p.postId || p.id)) return false;
      if (p.clientId && p.clientId !== clientId) return false;
      const plat = String(p.platform || '').toLowerCase();
      if (plat === 'instagram') {
        return shouldSyncInstagram ? isManualUserPost(p) : false;
      }
      if (plat === 'tiktok') {
        return shouldSyncTikTok
          ? effectiveTtHandle
            ? isManualUserPost(p)
            : true
          : false;
      }
      return false;
    });

    const posts = [...incomingPosts, ...preservedPosts];

    const sDateObj = new Date(startDateStr);
    const eDateObj = new Date(endDateStr);
    const daysDiff = Math.max(
      1,
      Math.round(
        (eDateObj.getTime() - sDateObj.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
    );

    const priorEndObj = new Date(sDateObj);
    priorEndObj.setDate(priorEndObj.getDate() - 1);
    const priorStartObj = new Date(priorEndObj);
    priorStartObj.setDate(priorStartObj.getDate() - daysDiff + 1);
    const priorStartStr = priorStartObj.toISOString().split('T')[0];
    const priorEndStr = priorEndObj.toISOString().split('T')[0];

    const isWithin = (pubAt: string | undefined, s: string, e: string) => {
      if (!pubAt) return false;
      const d = new Date(pubAt);
      if (isNaN(d.getTime())) return false;
      const ds = d.toISOString().split('T')[0];
      return ds >= s && ds <= e;
    };

    const igCurrViews = igPosts
      .filter((p) => isWithin(p.publishedAt, startDateStr, endDateStr))
      .reduce((acc, p) => acc + (Number(p.viewsCount) || 0), 0);
    const igPriorViews = igPosts
      .filter((p) => isWithin(p.publishedAt, priorStartStr, priorEndStr))
      .reduce((acc, p) => acc + (Number(p.viewsCount) || 0), 0);
    const igAllViews = igPosts.reduce(
      (acc, p) => acc + (Number(p.viewsCount) || 0),
      0
    );
    const igAllEng = igPosts.reduce(
      (acc, p) =>
        acc +
        (Number(p.likesCount) || 0) +
        (Number(p.commentsCount) || 0) +
        (Number(p.sharesCount) || 0),
      0
    );

    const igViews = shouldSyncInstagram
      ? igMetrics?.totalViews != null && igMetrics.totalViews > 0
        ? igMetrics.totalViews
        : igAllViews
      : 0;
    const igFollowers = shouldSyncInstagram
      ? Number(igMetrics?.followersGrowth) || 0
      : 0;
    const igEngagement = shouldSyncInstagram
      ? igViews > 0
        ? parseFloat(((igAllEng / igViews) * 100).toFixed(1))
        : Number(igMetrics?.engagementRate) || 0
      : 0;
    const igPctChange =
      shouldSyncInstagram && igPriorViews > 0 && igCurrViews > 0
        ? calculatePctChange(igCurrViews, igPriorViews)
        : 0;

    const ttCurrViews = ttPosts
      .filter((p) => isWithin(p.publishedAt, startDateStr, endDateStr))
      .reduce((acc, p) => acc + (Number(p.viewsCount) || 0), 0);
    const ttPriorViews = ttPosts
      .filter((p) => isWithin(p.publishedAt, priorStartStr, priorEndStr))
      .reduce((acc, p) => acc + (Number(p.viewsCount) || 0), 0);
    const ttAllViews = ttPosts.reduce(
      (acc, p) => acc + (Number(p.viewsCount) || 0),
      0
    );
    const ttAllEng = ttPosts.reduce(
      (acc, p) =>
        acc +
        (Number(p.likesCount) || 0) +
        (Number(p.commentsCount) || 0) +
        (Number(p.sharesCount) || 0),
      0
    );

    const ttViews = shouldSyncTikTok
      ? ttMetrics?.totalViews != null && ttMetrics.totalViews > 0
        ? ttMetrics.totalViews
        : ttAllViews
      : 0;
    const ttFollowers = shouldSyncTikTok
      ? Number(ttMetrics?.followersGrowth) || 0
      : 0;
    const ttEngagement = shouldSyncTikTok
      ? ttViews > 0
        ? parseFloat(((ttAllEng / ttViews) * 100).toFixed(1))
        : Number(ttMetrics?.engagementRate) || 0
      : 0;
    const ttPctChange =
      shouldSyncTikTok && ttPriorViews > 0 && ttCurrViews > 0
        ? calculatePctChange(ttCurrViews, ttPriorViews)
        : 0;

    const insightsList: string[] = [];
    if (shouldSyncInstagram) {
      insightsList.push(
        `Live Instagram analytics synced for ${
          igPlatformAccountId || 'connected account'
        } (${igPosts.length} real posts analyzed, ${igFollowers.toLocaleString()} followers).`
      );
    }
    if (shouldSyncTikTok) {
      insightsList.push(
        `Live TikTok analytics synced for ${
          effectiveTtHandle || 'connected account'
        } (${ttPosts.length} real videos analyzed, ${ttFollowers.toLocaleString()} followers, ${ttEngagement}% engagement rate).`
      );
    }
    if (insightsList.length === 0) {
      insightsList.push(
        'Connect social media channels in Settings to generate automatic live performance insights.'
      );
    }

    const updatedReport = {
      id: `report-${clientId}`,
      clientId,
      startDate: startDateStr,
      endDate: endDateStr,
      goals: [
        'Expand Instagram Reels reach and sustain strong engagement across core audience.',
        'Maintain consistent weekly short-form video publishing cadence across channels.',
      ],
      insights: insightsList,
      nextSteps: [
        'Scale top performing creative formats identified from real post engagement.',
        'Monitor audience retention and engagement rates across upcoming releases.',
      ],
      igFollowersGrowth: igFollowers,
      igViews,
      igViewsPctChange: igPctChange,
      igEngagementRate: igEngagement,
      ttFollowersGrowth: ttFollowers,
      ttViews,
      ttViewsPctChange: ttPctChange,
      ttEngagementRate: ttEngagement,
      syncedPlatforms: {
        instagram: shouldSyncInstagram,
        tiktok: shouldSyncTikTok && Boolean(effectiveTtHandle),
      },
      posts,
    };

    return NextResponse.json({
      ...updatedReport,
      success: true,
      syncedAt: new Date().toISOString(),
      igMetrics,
      ttMetrics,
      report: updatedReport,
    });
  } catch (error) {
    console.error('Error during social sync:', error);
    return NextResponse.json(
      { error: 'Failed to sync social media metrics' },
      { status: 500 }
    );
  }
}
