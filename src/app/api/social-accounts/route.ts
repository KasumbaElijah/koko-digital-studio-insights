import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import { exchangeMetaLongLivedToken } from '@/lib/api/auth';
import {
  getServerSocialAccounts,
  saveServerSocialAccount,
  deleteServerSocialAccount,
} from '@/lib/serverStore';

export async function GET(request: Request) {
  let clientId: string | null = null;
  try {
    const { searchParams } = new URL(request.url);
    clientId = searchParams.get('clientId');
  } catch (e) {
    console.warn('URL parse warning on static export:', e);
  }

  if (!clientId) {
    return NextResponse.json([]);
  }

  try {
    const accounts = await prisma.socialAccount.findMany({
      where: { clientId },
      include: { client: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (accounts.length > 0) {
      // Sync to local server store for offline resilience
      accounts.forEach((acc) => {
        saveServerSocialAccount({
          id: acc.id,
          clientId: acc.clientId,
          platform: acc.platform as any,
          platformAccountId: acc.platformAccountId,
          accessToken: acc.accessToken,
          refreshToken: acc.refreshToken || undefined,
          tokenExpiresAt: acc.tokenExpiresAt?.toISOString(),
        });
      });
      return NextResponse.json(serializeData(accounts));
    }

    // Check server persistent store
    const fallbackAccounts = getServerSocialAccounts(clientId);
    return NextResponse.json(fallbackAccounts);
  } catch (error) {
    // Prisma offline: load from server file store
    const fallbackAccounts = getServerSocialAccounts(clientId);
    return NextResponse.json(fallbackAccounts);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, platform, platformAccountId, accessToken, refreshToken } = body;

    if (!clientId || !platform || !platformAccountId || !accessToken) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let finalAccessToken = accessToken;
    let expiresAt = new Date();

    if (platform === 'instagram') {
      try {
        const exchanged = await exchangeMetaLongLivedToken(accessToken);
        finalAccessToken = exchanged.accessToken;
        expiresAt = new Date(Date.now() + exchanged.expiresInSeconds * 1000);
      } catch {
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
      tokenExpiresAt: expiresAt.toISOString(),
    };

    // Always persist to server-side file store
    saveServerSocialAccount({
      ...accountObj,
      platform: platform as any,
      refreshToken: refreshToken || undefined,
    });

    try {
      const socialAccount = await prisma.socialAccount.upsert({
        where: {
          id: `sa_${clientId}_${platform}`,
        },
        update: {
          platformAccountId,
          accessToken: finalAccessToken,
          refreshToken: refreshToken || null,
          tokenExpiresAt: expiresAt,
        },
        create: {
          id: `sa_${clientId}_${platform}`,
          clientId,
          platform,
          platformAccountId,
          accessToken: finalAccessToken,
          refreshToken: refreshToken || null,
          tokenExpiresAt: expiresAt,
        },
      });

      return NextResponse.json(serializeData(socialAccount));
    } catch (e) {
      console.warn('Prisma DB write notice (persisted in server store):', e);
      return NextResponse.json(accountObj);
    }
  } catch (error) {
    console.error('Error connecting social account:', error);
    return NextResponse.json({ error: 'Failed to connect social account' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  let id: string | null = null;
  try {
    const { searchParams } = new URL(request.url);
    id = searchParams.get('id');
  } catch (e) {
    console.warn('URL parse warning on static export:', e);
  }

  if (!id) {
    return NextResponse.json({ error: 'Social account ID is required' }, { status: 400 });
  }

  // Delete from server file store
  deleteServerSocialAccount(id);

  try {
    await prisma.socialAccount.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: true, persisted: true });
  }
}

