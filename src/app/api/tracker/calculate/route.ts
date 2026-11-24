import { NextResponse } from 'next/server';
import {
  getTrackerAccounts,
  TrackerAccountConfig,
  TrackerCalculationResult,
} from '@/lib/trackerStore';
import { fetchTikTokProfileVideos } from '@/lib/api/tiktokScraper';
import { fetchInstagramPublicProfile } from '@/lib/api/instagramScraper';
import {
  normalizeInstagramUsername,
  normalizeTikTokUsername,
  formatTikTokHandle,
  resolveInstagramUsername,
} from '@/lib/managedPages';
import { getServerSocialAccounts } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

function isWithinRange(dateStr: string, startDateStr: string, endDateStr: string): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const utcStr = d.toISOString().split('T')[0];
    if (utcStr >= startDateStr && utcStr <= endDateStr) return true;

    const localYear = d.getFullYear();
    const localMonth = String(d.getMonth() + 1).padStart(2, '0');
    const localDay = String(d.getDate()).padStart(2, '0');
    const localStr = `${localYear}-${localMonth}-${localDay}`;
    return localStr >= startDateStr && localStr <= endDateStr;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    let startDate = '';
    let endDate = '';
    let podFilter = 'All';
    let clientConnectedAccounts: TrackerAccountConfig[] = [];

    try {
      const body = await request.json();
      startDate = body.startDate || '';
      endDate = body.endDate || '';
      podFilter = body.podFilter || 'All';
      if (Array.isArray(body.connectedAccounts)) {
        clientConnectedAccounts = body.connectedAccounts;
      }
    } catch {
      // JSON body parse fallback
    }

    const now = new Date();
    if (!startDate) {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }
    if (!endDate) {
      endDate = now.toISOString().split('T')[0];
    }

    const baseAccounts = [...getTrackerAccounts()];

    // Merge server-stored connected social accounts
    try {
      const serverSocial = getServerSocialAccounts('all');
      serverSocial.forEach((sa) => {
        if (sa.platform === 'instagram') {
          const cleanIg = resolveInstagramUsername(sa.platformAccountId, sa.pageId, sa.pageName);
          if (!cleanIg) return;
          const handle = `@${cleanIg}`;
          const exists = baseAccounts.some(
            (a) =>
              normalizeInstagramUsername(a.instagramHandle) === cleanIg.toLowerCase()
          );
          if (!exists) {
            baseAccounts.push({
              id: `acc_ig_${cleanIg}`,
              name: sa.pageName || handle,
              pod: 'Alpha',
              platform: 'instagram',
              instagramHandle: handle,
              targetVideos: 10,
              targetGraphics: 6,
              expectedAvgViews: 10000,
            });
          }
        } else if (sa.platform === 'tiktok' && sa.platformAccountId) {
          const cleanTt = normalizeTikTokUsername(sa.platformAccountId);
          if (!cleanTt) return;
          const handle = formatTikTokHandle(cleanTt);
          const exists = baseAccounts.some(
            (a) =>
              normalizeTikTokUsername(a.tiktokHandle) === cleanTt.toLowerCase()
          );
          if (!exists) {
            baseAccounts.push({
              id: `acc_tt_${cleanTt}`,
              name: handle,
              pod: 'Millions',
              platform: 'tiktok',
              tiktokHandle: handle,
              targetVideos: 12,
              targetGraphics: 4,
              expectedAvgViews: 15000,
            });
          }
        }
      });
    } catch {}

    // Merge any connected accounts sent from browser localStorage
    clientConnectedAccounts.forEach((ca) => {
      if (!ca || !ca.name) return;
      const cleanIg = ca.instagramHandle ? normalizeInstagramUsername(ca.instagramHandle) : '';
      const cleanTt = ca.tiktokHandle ? normalizeTikTokUsername(ca.tiktokHandle) : '';
      const exists = baseAccounts.some((a) => {
        if (a.id === ca.id) return true;
        if (cleanIg && a.platform !== 'tiktok' && normalizeInstagramUsername(a.instagramHandle) === cleanIg) {
          return true;
        }
        if (cleanTt && a.platform === 'tiktok' && normalizeTikTokUsername(a.tiktokHandle) === cleanTt) {
          return true;
        }
        return false;
      });
      if (!exists) {
        baseAccounts.push({
          id: ca.id || `acc_${Date.now()}`,
          name: ca.name,
          pod: ca.pod || 'Alpha',
          platform: ca.platform || (cleanIg ? 'instagram' : 'tiktok'),
          instagramHandle: cleanIg ? `@${cleanIg}` : undefined,
          tiktokHandle: cleanTt ? formatTikTokHandle(cleanTt) : undefined,
          targetVideos: Number(ca.targetVideos) || 10,
          targetGraphics: Number(ca.targetGraphics) || 5,
          expectedAvgViews: Number(ca.expectedAvgViews) || 10000,
        });
      }
    });

    const filteredAccounts =
      podFilter && podFilter.toLowerCase() !== 'all'
        ? baseAccounts.filter((a) => a.pod.toLowerCase() === podFilter.toLowerCase())
        : baseAccounts;

    // Request-scoped caches so shared handles are scraped once
    const igPromiseCache = new Map<string, ReturnType<typeof fetchInstagramPublicProfile>>();
    const ttPromiseCache = new Map<string, ReturnType<typeof fetchTikTokProfileVideos>>();

    const getIgScrape = (username: string) => {
      const key = username.toLowerCase();
      let p = igPromiseCache.get(key);
      if (!p) {
        p = fetchInstagramPublicProfile(username);
        igPromiseCache.set(key, p);
      }
      return p;
    };

    const getTtScrape = (username: string) => {
      const key = username.toLowerCase();
      let p = ttPromiseCache.get(key);
      if (!p) {
        p = fetchTikTokProfileVideos(username);
        ttPromiseCache.set(key, p);
      }
      return p;
    };

    const results: TrackerCalculationResult[] = await Promise.all(
      filteredAccounts.map(async (acc) => {
        try {
          let videoCount = 0;
          let totalViews = 0;
          let followerCount: number | undefined = undefined;
          const statusParts: string[] = [];

          const ttUsername = normalizeTikTokUsername(acc.tiktokHandle);
          const igUsername = normalizeInstagramUsername(acc.instagramHandle);

          const shouldCheckIg =
            Boolean(igUsername) && (acc.platform === 'instagram' || acc.platform === 'both' || !ttUsername);
          const shouldCheckTt =
            Boolean(ttUsername) && (acc.platform === 'tiktok' || acc.platform === 'both' || !igUsername);

          // 1. Live Instagram Public Profile / Embed Scrape
          if (shouldCheckIg && igUsername) {
            try {
              const igScrape = await getIgScrape(igUsername);
              if (igScrape.followerCount != null) {
                followerCount = (followerCount || 0) + (Number(igScrape.followerCount) || 0);
              }
              if (igScrape.success && Array.isArray(igScrape.posts) && igScrape.posts.length > 0) {
                const allIgVideos = igScrape.posts.filter(
                  (p) =>
                    (p.contentFormat || '').toLowerCase() === 'videos' ||
                    (Number(p.viewsCount) || 0) > 0
                );
                const inRangeIgVideos = allIgVideos.filter((p) =>
                  isWithinRange(p.publishedAt, startDate, endDate)
                );
                const activeIgVideos =
                  inRangeIgVideos.length > 0 ? inRangeIgVideos : allIgVideos;

                if (activeIgVideos.length > 0) {
                  videoCount += activeIgVideos.length;
                  totalViews += activeIgVideos.reduce(
                    (sum, v) => sum + (Number(v.viewsCount) || 0),
                    0
                  );
                  statusParts.push(`${activeIgVideos.length} live IG videos (@${igUsername})`);
                }
              }
            } catch (igErr: any) {
              console.warn(`Instagram tracker scrape notice for ${acc.name}:`, igErr?.message);
            }
          }

          // 2. Live TikTok Profile Scrape
          if (shouldCheckTt && ttUsername) {
            try {
              const ttScrape = await getTtScrape(ttUsername);
              if (ttScrape.followerCount != null) {
                followerCount = (followerCount || 0) + (Number(ttScrape.followerCount) || 0);
              }
              if (ttScrape.success && Array.isArray(ttScrape.posts) && ttScrape.posts.length > 0) {
                const allTtVideos = ttScrape.posts.filter(
                  (p) =>
                    (p.contentFormat || '').toLowerCase() === 'videos' ||
                    !p.contentFormat ||
                    (Number(p.viewsCount) || 0) > 0
                );
                const inRangeTtVideos = allTtVideos.filter((p) =>
                  isWithinRange(p.publishedAt, startDate, endDate)
                );
                const activeTtVideos =
                  inRangeTtVideos.length > 0 ? inRangeTtVideos : allTtVideos;

                if (activeTtVideos.length > 0) {
                  videoCount += activeTtVideos.length;
                  totalViews += activeTtVideos.reduce(
                    (sum, v) => sum + (Number(v.viewsCount) || 0),
                    0
                  );
                  statusParts.push(`${activeTtVideos.length} live TikTok videos (@${ttUsername})`);
                }
              }
            } catch (ttErr: any) {
              console.warn(`TikTok tracker scrape notice for ${acc.name}:`, ttErr?.message);
            }
          }

          const actualAvgViews = videoCount > 0 ? Math.round(totalViews / videoCount) : 0;
          const expected = Number(acc.expectedAvgViews) || 1;
          const variancePct =
            videoCount === 0
              ? -100
              : Number((((actualAvgViews - expected) / expected) * 100).toFixed(1));

          return {
            id: acc.id,
            name: acc.name,
            pod: acc.pod,
            platform: acc.platform,
            instagramHandle: igUsername ? `@${igUsername}` : undefined,
            tiktokHandle: ttUsername ? formatTikTokHandle(ttUsername) : undefined,
            followerCount,
            targetVideos: acc.targetVideos,
            targetGraphics: acc.targetGraphics,
            expectedAvgViews: acc.expectedAvgViews,
            actualAvgViews,
            videoCount,
            totalViews,
            variancePct,
            status: videoCount > 0 ? (variancePct >= 0 ? 'success' : 'warning') : 'error',
            statusMessage:
              statusParts.length > 0
                ? `Live: ${statusParts.join(' + ')}`
                : 'No live videos returned for this handle.',
          };
        } catch (itemErr: any) {
          console.error(`Calculation error on account ${acc.name}:`, itemErr);
          return {
            id: acc.id,
            name: acc.name,
            pod: acc.pod,
            platform: acc.platform,
            instagramHandle: acc.instagramHandle,
            tiktokHandle: acc.tiktokHandle,
            targetVideos: acc.targetVideos,
            targetGraphics: acc.targetGraphics,
            expectedAvgViews: acc.expectedAvgViews,
            actualAvgViews: 0,
            videoCount: 0,
            totalViews: 0,
            variancePct: -100,
            status: 'error',
            statusMessage: `Calculation notice: ${itemErr.message || 'Data retrieval issue'}`,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      startDate,
      endDate,
      podFilter,
      totalAccounts: results.length,
      calculatedAt: new Date().toISOString(),
      data: results,
    });
  } catch (error: any) {
    console.error('Fatal error in /api/tracker/calculate:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate tracker metrics' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const accounts = getTrackerAccounts();
    return NextResponse.json({
      success: true,
      accounts,
      total: accounts.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
