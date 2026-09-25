import { NextResponse } from 'next/server';
import { getTrackerAccounts, TrackerCalculationResult } from '@/lib/trackerStore';
import { fetchTikTokProfileVideos } from '@/lib/api/tiktokScraper';
import { fetchInstagramMetrics } from '@/lib/api/instagram';
import { prisma } from '@/lib/prisma';
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

    try {
      const body = await request.json();
      startDate = body.startDate || '';
      endDate = body.endDate || '';
      podFilter = body.podFilter || 'All';
    } catch {
      // JSON body parse fallback
    }

    // Default dates: 1st of current month up to today
    const now = new Date();
    if (!startDate) {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }
    if (!endDate) {
      endDate = now.toISOString().split('T')[0];
    }

    const allAccounts = getTrackerAccounts();
    const filteredAccounts = podFilter && podFilter.toLowerCase() !== 'all'
      ? allAccounts.filter((a) => a.pod.toLowerCase() === podFilter.toLowerCase())
      : allAccounts;

    const startObj = new Date(startDate);
    const endObj = new Date(endDate);

    // Calculate metrics for each account with isolated error handling
    const results: TrackerCalculationResult[] = await Promise.all(
      filteredAccounts.map(async (acc) => {
        try {
          let videoCount = 0;
          let totalViews = 0;
          let statusMessage = '';

          const ttUsername = (acc.tiktokHandle || '').replace(/^@/, '').trim();
          const igUsername = (acc.instagramHandle || '').replace(/^@/, '').trim();

          // 1. Fetch TikTok videos if configured
          if (ttUsername) {
            try {
              const ttScrape = await fetchTikTokProfileVideos(ttUsername);
              if (ttScrape.success && Array.isArray(ttScrape.posts) && ttScrape.posts.length > 0) {
                const inRangeVideos = ttScrape.posts.filter((p) => {
                  const isVideo = (p.contentFormat || '').toLowerCase() === 'videos' || !p.contentFormat;
                  return isVideo && isWithinRange(p.publishedAt, startDate, endDate);
                });

                if (inRangeVideos.length > 0) {
                  videoCount += inRangeVideos.length;
                  totalViews += inRangeVideos.reduce((sum, v) => sum + (Number(v.viewsCount) || 0), 0);
                  statusMessage = `Fetched ${inRangeVideos.length} live TikTok videos.`;
                }
              }
            } catch (ttErr: any) {
              console.warn(`TikTok fetch notice for ${acc.name}:`, ttErr?.message);
            }
          }

          // 2. Fetch Instagram videos if configured and videoCount is still 0
          if (igUsername && videoCount === 0) {
            try {
              // Check if we have an active token in Prisma or serverStore for this account
              let token = '';
              let acctId = acc.instagramAccountId || igUsername;

              const serverAccounts = getServerSocialAccounts();
              const matchedSa = serverAccounts.find(
                (sa) =>
                  sa.platform === 'instagram' &&
                  (sa.platformAccountId.toLowerCase().includes(igUsername.toLowerCase()) ||
                   sa.clientId.toLowerCase().includes(acc.id.toLowerCase()))
              );
              if (matchedSa) {
                token = matchedSa.accessToken;
                acctId = matchedSa.platformAccountId;
              }

              if (token) {
                const igMetrics = await fetchInstagramMetrics(acctId, token, startObj, endObj);
                if (igMetrics && Array.isArray(igMetrics.posts)) {
                  const inRangeVideos = igMetrics.posts.filter((p) => {
                    const isVideo = (p.contentFormat || '').toLowerCase() === 'videos';
                    return isVideo && isWithinRange(p.publishedAt, startDate, endDate);
                  });
                  if (inRangeVideos.length > 0) {
                    videoCount += inRangeVideos.length;
                    totalViews += inRangeVideos.reduce((sum, v) => sum + (Number(v.viewsCount) || 0), 0);
                    statusMessage = `Fetched ${inRangeVideos.length} live Instagram Reels.`;
                  }
                }
              }
            } catch (igErr: any) {
              console.warn(`Instagram fetch notice for ${acc.name}:`, igErr?.message);
            }
          }

          // 3. Fallback: Check local Prisma database for any synced ContentPost records for this client/account
          if (videoCount === 0) {
            try {
              const dbPosts = await prisma.contentPost.findMany({
                where: {
                  report: {
                    client: {
                      name: {
                        contains: acc.name,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
                orderBy: { publishedAt: 'desc' },
                take: 20,
              });

              if (dbPosts.length > 0) {
                const inRangeDbVideos = dbPosts.filter((p) => {
                  const isVideo = (p.contentFormat || '').toLowerCase() === 'videos';
                  return isVideo && isWithinRange(p.publishedAt.toISOString(), startDate, endDate);
                });
                if (inRangeDbVideos.length > 0) {
                  videoCount += inRangeDbVideos.length;
                  totalViews += inRangeDbVideos.reduce((sum, v) => sum + (Number(v.viewsCount) || 0), 0);
                  statusMessage = `Found ${inRangeDbVideos.length} synced videos in database.`;
                }
              }
            } catch (dbErr) {
              // Prisma offline fallback
            }
          }

          // Compute actual average views and variance %
          // If an account has zero videos published within the selected date window, display 0 views and -100% variance without throwing divide-by-zero errors.
          const actualAvgViews = videoCount > 0 ? Math.round(totalViews / videoCount) : 0;
          const expected = Number(acc.expectedAvgViews) || 1;
          const variancePct = videoCount === 0
            ? -100
            : Number((((actualAvgViews - expected) / expected) * 100).toFixed(1));

          return {
            id: acc.id,
            name: acc.name,
            pod: acc.pod,
            platform: acc.platform,
            targetVideos: acc.targetVideos,
            targetGraphics: acc.targetGraphics,
            expectedAvgViews: acc.expectedAvgViews,
            actualAvgViews,
            videoCount,
            totalViews,
            variancePct,
            status: videoCount > 0 ? (variancePct >= 0 ? 'success' : 'warning') : 'error',
            statusMessage: statusMessage || (videoCount === 0 ? 'No videos published in selected date window.' : undefined),
          };
        } catch (itemErr: any) {
          console.error(`Calculation error on account ${acc.name}:`, itemErr);
          return {
            id: acc.id,
            name: acc.name,
            pod: acc.pod,
            platform: acc.platform,
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

export async function GET(request: Request) {
  try {
    const accounts = getTrackerAccounts();
    return NextResponse.json({
      success: true,
      accounts,
      total: accounts.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
