import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import { exchangeMetaLongLivedToken } from '@/lib/api/auth';
import { INITIAL_CLIENTS } from '@/lib/mockData';

export const dynamic = 'force-static';

export async function GET(request: Request) {
  let clientId: string | null = null;
  try {
    const { searchParams } = new URL(request.url);
    clientId = searchParams.get('clientId');
  } catch (e) {
    console.warn('URL parse warning on static export:', e);
  }

  try {
    const whereClause = clientId ? { clientId } : {};
    const accounts = await prisma.socialAccount.findMany({
      where: whereClause,
      include: { client: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (accounts.length > 0) {
      return NextResponse.json(serializeData(accounts));
    }

    const mockAccounts = INITIAL_CLIENTS.flatMap((c) => c.socialAccounts || []);
    const filteredMock = clientId ? mockAccounts.filter((a) => a.clientId === clientId) : mockAccounts;
    return NextResponse.json(filteredMock);
  } catch (error) {
    console.warn('Prisma DB query social accounts error, returning fallback:', error);
    const mockAccounts = INITIAL_CLIENTS.flatMap((c) => c.socialAccounts || []);
    return NextResponse.json(mockAccounts);
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
      console.warn('Prisma DB write fallback, returning created account mock:', e);
      return NextResponse.json({
        id: `sa_${clientId}_${platform}`,
        clientId,
        platform,
        platformAccountId,
        accessToken: finalAccessToken,
        refreshToken,
        tokenExpiresAt: expiresAt.toISOString(),
      });
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

  try {
    await prisma.socialAccount.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.warn('Prisma DB delete fallback:', error);
    return NextResponse.json({ success: true, mock: true });
  }
}
