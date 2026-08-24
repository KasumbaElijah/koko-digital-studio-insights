import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import { exchangeMetaLongLivedToken, refreshTikTokToken } from '@/lib/api/auth';

export const dynamic = 'force-static';

export async function POST(request: Request) {
  try {
    let socialAccountId: string | null = null;
    try {
      const body = await request.json();
      socialAccountId = body.socialAccountId || null;
    } catch (e) {
      console.warn('Body parse warning on static export:', e);
    }

    try {
      const whereClause = socialAccountId ? { id: socialAccountId } : {};
      const accounts = await prisma.socialAccount.findMany({
        where: whereClause,
      });

      const refreshedAccounts = [];

      for (const account of accounts) {
        if (account.platform === 'instagram' && account.accessToken) {
          try {
            const refreshed = await exchangeMetaLongLivedToken(account.accessToken);
            const expiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);
            const updated = await prisma.socialAccount.update({
              where: { id: account.id },
              data: {
                accessToken: refreshed.accessToken,
                tokenExpiresAt: expiresAt,
              },
            });
            refreshedAccounts.push(updated);
          } catch (e) {
            console.warn(`Failed to refresh Meta token for account ${account.id}:`, e);
          }
        } else if (account.platform === 'tiktok' && account.refreshToken) {
          try {
            const refreshed = await refreshTikTokToken(account.refreshToken);
            const expiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);
            const updated = await prisma.socialAccount.update({
              where: { id: account.id },
              data: {
                accessToken: refreshed.accessToken,
                refreshToken: refreshed.refreshToken,
                tokenExpiresAt: expiresAt,
              },
            });
            refreshedAccounts.push(updated);
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
    } catch (dbErr) {
      console.warn('DB refresh fallback:', dbErr);
      return NextResponse.json({
        success: true,
        refreshedCount: 0,
        mock: true,
      });
    }
  } catch (error) {
    console.error('Error during token refresh routine:', error);
    return NextResponse.json({ error: 'Failed to execute token refresh routine' }, { status: 500 });
  }
}
