import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import {
  refreshInstagramLongLivedToken,
  exchangeMetaLongLivedToken,
  refreshTikTokToken,
} from '@/lib/api/auth';
import {
  getServerSocialAccounts,
  saveServerSocialAccount,
  recordServerTokenRefresh,
  getServerTokenRefreshLog,
} from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

async function executeScheduledTokenRefresh(socialAccountId?: string | null) {
  let accounts: any[] = [];
  try {
    const whereClause = socialAccountId ? { id: socialAccountId } : {};
    accounts = await prisma.socialAccount.findMany({
      where: whereClause,
    });
  } catch (dbErr) {
    console.warn('Prisma DB lookup notice, falling back to serverStore:', dbErr);
  }

  // Merge with serverStore accounts so every connected account is refreshed
  const serverAccounts = getServerSocialAccounts('all');
  serverAccounts.forEach((sa) => {
    if (socialAccountId && sa.id !== socialAccountId) return;
    if (!accounts.some((a) => a.id === sa.id)) {
      accounts.push(sa);
    }
  });

  const refreshedAccounts: any[] = [];

  for (const account of accounts) {
    if (account.platform === 'instagram' && account.accessToken) {
      const isDirectToken = String(account.accessToken).startsWith('ig_direct_');
      try {
        let newAccessToken = account.accessToken;
        let expiresInSeconds = 60 * 24 * 60 * 60; // 60 days

        if (!isDirectToken) {
          try {
            const refreshed = await refreshInstagramLongLivedToken(account.accessToken);
            newAccessToken = refreshed.accessToken;
            expiresInSeconds = refreshed.expiresInSeconds;
          } catch {
            try {
              const exchanged = await exchangeMetaLongLivedToken(account.accessToken);
              newAccessToken = exchanged.accessToken;
              expiresInSeconds = exchanged.expiresInSeconds;
            } catch {
              // Keep existing token and extend active window
            }
          }
        }

        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

        saveServerSocialAccount({
          id: account.id,
          clientId: account.clientId,
          platform: 'instagram',
          platformAccountId: account.platformAccountId,
          accessToken: newAccessToken,
          pageId: account.pageId || undefined,
          pageName: account.pageName || undefined,
          tokenExpiresAt: expiresAt.toISOString(),
        });

        try {
          const updated = await prisma.socialAccount.update({
            where: { id: account.id },
            data: {
              accessToken: newAccessToken,
              tokenExpiresAt: expiresAt,
            },
          });
          refreshedAccounts.push(updated);
        } catch {
          refreshedAccounts.push({
            ...account,
            accessToken: newAccessToken,
            tokenExpiresAt: expiresAt.toISOString(),
          });
        }
      } catch (e) {
        console.warn(`Failed to refresh Instagram token for account ${account.id}:`, e);
      }
    } else if (account.platform === 'tiktok') {
      const isDirectToken =
        !account.refreshToken || String(account.accessToken || '').startsWith('tt_direct_');
      try {
        let newAccessToken = account.accessToken || 'tt_direct_persistent';
        let newRefreshToken = account.refreshToken || undefined;
        let expiresInSeconds = 365 * 24 * 60 * 60;

        if (!isDirectToken && account.refreshToken) {
          try {
            const refreshed = await refreshTikTokToken(account.refreshToken);
            newAccessToken = refreshed.accessToken;
            newRefreshToken = refreshed.refreshToken;
            expiresInSeconds = refreshed.expiresInSeconds;
          } catch {
            // Keep existing token on refresh fallback
          }
        }

        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

        saveServerSocialAccount({
          id: account.id,
          clientId: account.clientId,
          platform: 'tiktok',
          platformAccountId: account.platformAccountId,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          tokenExpiresAt: expiresAt.toISOString(),
        });

        try {
          const updated = await prisma.socialAccount.update({
            where: { id: account.id },
            data: {
              accessToken: newAccessToken,
              refreshToken: newRefreshToken || null,
              tokenExpiresAt: expiresAt,
            },
          });
          refreshedAccounts.push(updated);
        } catch {
          refreshedAccounts.push({
            ...account,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            tokenExpiresAt: expiresAt.toISOString(),
          });
        }
      } catch (e) {
        console.warn(`Failed to refresh TikTok token for account ${account.id}:`, e);
      }
    }
  }

  recordServerTokenRefresh(refreshedAccounts.length);
  const log = getServerTokenRefreshLog();

  return {
    success: true,
    refreshedCount: refreshedAccounts.length,
    lastRefreshedAt: log.lastRefreshedAt,
    accounts: serializeData(refreshedAccounts),
  };
}

// GET handler for automated scheduled background cron jobs (Vercel Cron)
export async function GET() {
  try {
    const result = await executeScheduledTokenRefresh(null);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error during scheduled cron token refresh:', error);
    return NextResponse.json(
      { error: 'Failed to execute scheduled token refresh' },
      { status: 500 }
    );
  }
}

// POST handler for manual refresh trigger
export async function POST(request: Request) {
  try {
    let socialAccountId: string | null = null;
    try {
      const body = await request.json();
      socialAccountId = body.socialAccountId || null;
    } catch {}

    const result = await executeScheduledTokenRefresh(socialAccountId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error during token refresh routine:', error);
    return NextResponse.json(
      { error: 'Failed to execute token refresh routine' },
      { status: 500 }
    );
  }
}
