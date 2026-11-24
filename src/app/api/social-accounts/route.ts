import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import { exchangeMetaLongLivedToken } from '@/lib/api/auth';
import {
  getServerSocialAccounts,
  saveServerSocialAccount,
  deleteServerSocialAccount,
  setServerActiveClientId,
} from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let clientId: string | null = null;
  try {
    const { searchParams } = new URL(request.url);
    clientId = searchParams.get('clientId');
  } catch (e) {
    console.warn('URL parse warning on static export:', e);
  }

  if (!clientId) {
    return NextResponse.json(getServerSocialAccounts('all'));
  }

  try {
    const whereClause = clientId === 'all' ? {} : { clientId };
    const accounts = await prisma.socialAccount.findMany({
      where: whereClause,
      include: { client: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (accounts.length > 0) {
      accounts.forEach((acc) => {
        saveServerSocialAccount({
          id: acc.id,
          clientId: acc.clientId,
          platform: acc.platform as any,
          platformAccountId: acc.platformAccountId,
          accessToken: acc.accessToken,
          refreshToken: acc.refreshToken || undefined,
          pageId: acc.pageId || undefined,
          pageName: acc.pageName || undefined,
          tokenExpiresAt: acc.tokenExpiresAt?.toISOString(),
        });
      });

      const serverMatches = getServerSocialAccounts(clientId);
      const merged: any[] = [...serializeData(accounts)];
      serverMatches.forEach((sa) => {
        if (!merged.some((m: any) => m.clientId === sa.clientId && m.platform === sa.platform)) {
          merged.push(sa);
        }
      });
      return NextResponse.json(merged);
    }

    const fallbackAccounts = getServerSocialAccounts(clientId);
    return NextResponse.json(fallbackAccounts);
  } catch (error) {
    const fallbackAccounts = getServerSocialAccounts(clientId);
    return NextResponse.json(fallbackAccounts);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clientId,
      platform,
      platformAccountId,
      accessToken,
      refreshToken,
      pageId,
      pageName,
    } = body;

    if (!clientId || !platform || !platformAccountId || !accessToken) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let finalAccessToken = accessToken;
    let expiresAt = new Date();

    if (platform === 'instagram') {
      if (!String(accessToken).startsWith('ig_direct_')) {
        try {
          const exchanged = await exchangeMetaLongLivedToken(accessToken);
          finalAccessToken = exchanged.accessToken;
          expiresAt = new Date(Date.now() + exchanged.expiresInSeconds * 1000);
        } catch {
          expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
        }
      } else {
        expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      }
    } else {
      expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    const accountObj = {
      id: `sa_${clientId}_${platform}`,
      clientId,
      platform,
      platformAccountId,
      accessToken: finalAccessToken,
      refreshToken: refreshToken || null,
      pageId: pageId || null,
      pageName: pageName || null,
      tokenExpiresAt: expiresAt.toISOString(),
    };

    // Persist in backend server store
    saveServerSocialAccount({
      ...accountObj,
      platform: platform as any,
      refreshToken: refreshToken || undefined,
      pageId: pageId || undefined,
      pageName: pageName || undefined,
    });
    setServerActiveClientId(clientId);

    let responsePayload: any = accountObj;

    try {
      // Ensure client row exists in PostgreSQL before upserting SocialAccount
      await prisma.client.upsert({
        where: { id: clientId },
        update: {},
        create: {
          id: clientId,
          name: pageName || 'Connected Client',
          logoUrl: '/logos/default.svg',
        },
      });

      const socialAccount = await prisma.socialAccount.upsert({
        where: {
          id: `sa_${clientId}_${platform}`,
        },
        update: {
          platformAccountId,
          accessToken: finalAccessToken,
          refreshToken: refreshToken || null,
          pageId: pageId || null,
          pageName: pageName || null,
          tokenExpiresAt: expiresAt,
        },
        create: {
          id: `sa_${clientId}_${platform}`,
          clientId,
          platform,
          platformAccountId,
          accessToken: finalAccessToken,
          refreshToken: refreshToken || null,
          pageId: pageId || null,
          pageName: pageName || null,
          tokenExpiresAt: expiresAt,
        },
      });

      responsePayload = serializeData(socialAccount);
    } catch (e) {
      console.warn('Prisma DB write notice (persisted in backend server store):', e);
    }

    const res = NextResponse.json(responsePayload);
    // Set persistent HttpOnly cookie so server knows the active client & connected session across restarts
    res.cookies.set('koko_http_active_client', clientId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    });
    return res;
  } catch (error) {
    console.error('Error connecting social account:', error);
    return NextResponse.json({ error: 'Failed to connect social account' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  let id: string | null = null;
  let clientId: string | null = null;
  let platform: string | null = null;
  try {
    const { searchParams } = new URL(request.url);
    id = searchParams.get('id');
    clientId = searchParams.get('clientId');
    platform = searchParams.get('platform');
  } catch (e) {
    console.warn('URL parse warning on static export:', e);
  }

  if (!id && !(clientId && platform)) {
    return NextResponse.json({ error: 'Social account ID or clientId+platform is required' }, { status: 400 });
  }

  const targetId = id || `sa_${clientId}_${platform}`;

  if (clientId && platform) {
    deleteServerSocialAccount(clientId, platform);
  } else if (id) {
    deleteServerSocialAccount(id);
  }

  try {
    await prisma.socialAccount.delete({
      where: { id: targetId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: true, persisted: true });
  }
}
