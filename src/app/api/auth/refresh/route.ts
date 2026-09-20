import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import { refreshInstagramLongLivedToken, exchangeMetaLongLivedToken, refreshTikTokToken } from '@/lib/api/auth';
import { getServerSocialAccounts, saveServerSocialAccount } from '@/lib/serverStore';

export async function POST(request: Request) {
  try {
    let socialAccountId: string | null = null;
    try {
      const body = await request.json();
      socialAccountId = body.socialAccountId || null;
    } catch (e) {
      console.warn('Body parse warning on static export:', e);
    }

    let accounts: any[] = [];
    try {
      const whereClause = socialAccountId ? { id: socialAccountId } : {};
      accounts = await prisma.socialAccount.findMany({
        where: whereClause,
      });
    } catch (dbErr) {
      console.warn('Prisma DB lookup notice, falling back to serverStore:', dbErr);
    }

    if (!accounts || accounts.length === 0) {
      accounts = getServerSocialAccounts(socialAccountId ? undefined : undefined);
      if (socialAccountId) {
        accounts = accounts.filter((a) => a.id === socialAccountId);
      }
    }

    const refreshedAccounts: any[] = [];

    for (const account of accounts) {
      if (account.platform === 'instagram' && account.accessToken) {
        try {
          let refreshed;
          try {
            refreshed = await refreshInstagramLongLivedToken(account.accessToken);
          } catch {
            refreshed = await exchangeMetaLongLivedToken(account.accessToken);
          }
          const expiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);
          
          saveServerSocialAccount({
            id: account.id,
            clientId: account.clientId,
            platform: 'instagram',
            platformAccountId: account.platformAccountId,
            accessToken: refreshed.accessToken,
            tokenExpiresAt: expiresAt.toISOString(),
          });

          try {
            const updated = await prisma.socialAccount.update({
              where: { id: account.id },
              data: {
                accessToken: refreshed.accessToken,
                tokenExpiresAt: expiresAt,
              },
            });
            refreshedAccounts.push(updated);
          } catch {
            refreshedAccounts.push({
              ...account,
              accessToken: refreshed.accessToken,
              tokenExpiresAt: expiresAt.toISOString(),
            });
          }
        } catch (e) {
          console.warn(`Failed to refresh Instagram token for account ${account.id}:`, e);
        }
      } else if (account.platform === 'tiktok' && account.refreshToken) {
        try {
          const refreshed = await refreshTikTokToken(account.refreshToken);
          const expiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);

          saveServerSocialAccount({
            id: account.id,
            clientId: account.clientId,
            platform: 'tiktok',
            platformAccountId: account.platformAccountId,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            tokenExpiresAt: expiresAt.toISOString(),
          });

          try {
            const updated = await prisma.socialAccount.update({
              where: { id: account.id },
              data: {
                accessToken: refreshed.accessToken,
                refreshToken: refreshed.refreshToken,
                tokenExpiresAt: expiresAt,
              },
            });
            refreshedAccounts.push(updated);
          } catch {
            refreshedAccounts.push({
              ...account,
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken,
              tokenExpiresAt: expiresAt.toISOString(),
            });
          }
        } catch (e) {
          console.warn(`Failed to refresh TikTok token for account ${account.id}:`, e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      refreshedCount: refreshedAccounts.length,
      accounts: serializeData(refreshedAccounts),
    });
  } catch (error) {
    console.error('Error during token refresh routine:', error);
    return NextResponse.json({ error: 'Failed to execute token refresh routine' }, { status: 500 });
  }
}

