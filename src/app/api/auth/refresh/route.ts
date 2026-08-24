import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import { exchangeMetaLongLivedToken, refreshTikTokToken } from '@/lib/api/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { socialAccountId } = body;

    let accounts: any[] = [];
    try {
      if (socialAccountId) {
        const acc = await prisma.socialAccount.findUnique({ where: { id: socialAccountId } });
        if (acc) accounts = [acc];
      } else {
        accounts = await prisma.socialAccount.findMany({});
      }
    } catch {
      console.warn('DB query accounts failed during refresh, returning mock status');
    }

    const refreshResults: Array<{ id: string; platform: string; success: boolean; expiresAt?: string }> = [];

    for (const account of accounts) {
      try {
        if (account.platform === 'instagram') {
          const exchanged = await exchangeMetaLongLivedToken(account.accessToken);
          const newExpiresAt = new Date(Date.now() + exchanged.expiresInSeconds * 1000);

          await prisma.socialAccount.update({
            where: { id: account.id },
            data: {
              accessToken: exchanged.accessToken,
              tokenExpiresAt: newExpiresAt,
            },
          });

          refreshResults.push({
            id: account.id,
            platform: 'instagram',
            success: true,
            expiresAt: newExpiresAt.toISOString(),
          });
        } else if (account.platform === 'tiktok' && account.refreshToken) {
          const refreshed = await refreshTikTokToken(account.refreshToken);
          const newExpiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);

          await prisma.socialAccount.update({
            where: { id: account.id },
            data: {
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken,
              tokenExpiresAt: newExpiresAt,
            },
          });

          refreshResults.push({
            id: account.id,
            platform: 'tiktok',
            success: true,
            expiresAt: newExpiresAt.toISOString(),
          });
        }
      } catch (err) {
        refreshResults.push({
          id: account.id,
          platform: account.platform,
          success: false,
        });
      }
    }

    return NextResponse.json({
      message: 'Token refresh completed',
      results: refreshResults,
    });
  } catch (error) {
    console.error('Error during token refresh routine:', error);
    return NextResponse.json({ error: 'Token refresh routine failed' }, { status: 500 });
  }
}
