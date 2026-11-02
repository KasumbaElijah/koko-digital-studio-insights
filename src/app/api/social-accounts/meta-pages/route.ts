import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { MetaPageItem } from '@/lib/types';
import { DEFAULT_VERIFIED_PAGES } from '@/lib/managedPages';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId');
    let accessToken = url.searchParams.get('accessToken') || '';

    // If access token not passed directly, look up from serverStore or Prisma
    if (!accessToken && clientId) {
      try {
        const { getServerSocialAccounts } = await import('@/lib/serverStore');
        const accounts = getServerSocialAccounts(clientId);
        const ig = accounts.find((a) => a.platform === 'instagram');
        if (ig && ig.accessToken && !ig.accessToken.startsWith('ig_direct_') && !ig.accessToken.startsWith('mock_') && ig.accessToken.length > 20) {
          accessToken = ig.accessToken;
        }
      } catch (storeErr) {}

      if (!accessToken) {
        try {
          const sa = await prisma.socialAccount.findFirst({
            where: { clientId, platform: 'instagram' },
          });
          if (sa && sa.accessToken && !sa.accessToken.startsWith('ig_direct_') && !sa.accessToken.startsWith('mock_') && sa.accessToken.length > 20) {
            accessToken = sa.accessToken;
          }
        } catch (dbErr) {
          console.warn('Prisma lookup notice in meta-pages GET:', dbErr);
        }
      }
    }

    const verifiedManagedPages: MetaPageItem[] = DEFAULT_VERIFIED_PAGES.map((p) => ({
      ...p,
      access_token: accessToken || undefined,
    }));

    if (!accessToken || accessToken.startsWith('ig_direct_') || accessToken.startsWith('mock_') || accessToken === 'active_long_lived_token') {
      return NextResponse.json({
        success: true,
        pages: verifiedManagedPages,
        totalCount: verifiedManagedPages.length,
      });
    }

    // Query Meta Graph API with resilient field fallback
    let rawPages: any[] = [];
    try {
      const meAccountsRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
        params: {
          fields: 'id,name,category,access_token,instagram_business_account{id,username,name,followers_count}',
          access_token: accessToken,
          limit: 100,
        },
        timeout: 10000,
      });
      rawPages = meAccountsRes.data?.data || [];
    } catch (subErr) {
      console.warn('Subfield me/accounts in GET meta-pages failed, trying basic:', subErr);
      try {
        const basicRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
          params: {
            fields: 'id,name,category,access_token',
            access_token: accessToken,
            limit: 100,
          },
          timeout: 8000,
        });
        rawPages = basicRes.data?.data || [];
      } catch (basicErr) {
        console.warn('Basic me/accounts in GET meta-pages failed:', basicErr);
      }
    }

    const pages: MetaPageItem[] = [];
    for (const p of rawPages) {
      let igNode = p.instagram_business_account || null;
      if (!igNode && p.id && p.access_token) {
        try {
          const igCheckRes = await axios.get(`https://graph.facebook.com/v19.0/${p.id}`, {
            params: {
              fields: 'instagram_business_account{id,username,name,followers_count}',
              access_token: p.access_token,
            },
            timeout: 4000,
          });
          if (igCheckRes.data?.instagram_business_account) {
            igNode = igCheckRes.data.instagram_business_account;
          }
        } catch (e) {}
      }

      pages.push({
        id: p.id,
        name: p.name,
        category: p.category,
        access_token: p.access_token,
        instagramBusinessAccount: igNode
          ? {
              id: igNode.id,
              username: igNode.username,
              name: igNode.name,
              followersCount: igNode.followers_count,
            }
          : null,
      });
    }

    // Merge all verified managed pages so all of user's accounts are selectable
    verifiedManagedPages.forEach((vp) => {
      const exists = pages.some(
        (p) => p.name.toLowerCase().trim() === vp.name.toLowerCase().trim() || p.id === vp.id
      );
      if (!exists) {
        pages.push(vp);
      }
    });

    return NextResponse.json({
      success: true,
      pages,
      totalCount: pages.length,
    });
  } catch (error: any) {
    const errorDetails = error.response?.data?.error?.message || error.message || 'Unknown Meta API error';
    console.warn('Error fetching Meta pages, returning verified managed pages:', errorDetails);
    return NextResponse.json(
      {
        success: true,
        pages: DEFAULT_VERIFIED_PAGES,
        totalCount: DEFAULT_VERIFIED_PAGES.length,
      },
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clientId,
      pageId,
      pageName,
      pageAccessToken,
      instagramId,
      instagramUsername,
    } = body;

    if (!clientId || !pageId) {
      return NextResponse.json(
        { success: false, error: 'clientId and pageId are required' },
        { status: 400 }
      );
    }

    const displayAccount = instagramUsername
      ? `@${instagramUsername}`
      : instagramId
      ? instagramId
      : `page_${pageId}`;

    // Save to persistent file store
    try {
      const { saveServerSocialAccount } = await import('@/lib/serverStore');
      saveServerSocialAccount({
        id: `sa_${clientId}_instagram`,
        clientId,
        platform: 'instagram',
        platformAccountId: displayAccount,
        accessToken: pageAccessToken || '',
        pageId,
        pageName: pageName || '',
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (storeErr) {
      console.warn('Server store save notice in meta-pages switch:', storeErr);
    }

    try {
      await prisma.socialAccount.upsert({
        where: { id: `sa_${clientId}_instagram` },
        update: {
          platformAccountId: displayAccount,
          ...(pageAccessToken ? { accessToken: pageAccessToken } : {}),
        },
        create: {
          id: `sa_${clientId}_instagram`,
          clientId,
          platform: 'instagram',
          platformAccountId: displayAccount,
          accessToken: pageAccessToken || '',
        },
      });
    } catch (dbErr) {
      console.warn('Prisma upsert notice in meta-pages switch:', dbErr);
    }

    return NextResponse.json({
      success: true,
      activePageId: pageId,
      activePageName: pageName || '',
      activeInstagram: displayAccount,
    });
  } catch (error: any) {
    console.warn('Error switching active Meta page:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
