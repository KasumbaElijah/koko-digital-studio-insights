import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { MetaPageItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId');
    let accessToken = url.searchParams.get('accessToken') || '';

    // If access token not passed directly, look up from Prisma
    if (!accessToken && clientId) {
      try {
        const sa = await prisma.socialAccount.findFirst({
          where: { clientId, platform: 'instagram' },
        });
        if (sa && sa.accessToken) {
          accessToken = sa.accessToken;
        }
      } catch (dbErr) {
        console.warn('Prisma lookup notice in meta-pages GET:', dbErr);
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, pages: [], error: 'No active Meta access token provided or found.' },
        { status: 400 }
      );
    }

    // Query Meta Graph API for all managed Facebook Pages and linked Instagram accounts
    const meAccountsRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: {
        fields: 'id,name,category,access_token,instagram_business_account{id,username,name,followers_count,profile_picture_url}',
        access_token: accessToken,
        limit: 50,
      },
      timeout: 12000,
    });

    const rawPages = meAccountsRes.data?.data || [];
    const pages: MetaPageItem[] = rawPages.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      access_token: p.access_token,
      instagramBusinessAccount: p.instagram_business_account
        ? {
            id: p.instagram_business_account.id,
            username: p.instagram_business_account.username,
            name: p.instagram_business_account.name,
            followersCount: p.instagram_business_account.followers_count,
            profilePictureUrl: p.instagram_business_account.profile_picture_url,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      pages,
      totalCount: pages.length,
    });
  } catch (error: any) {
    const errorDetails = error.response?.data?.error?.message || error.message || 'Unknown Meta API error';
    console.warn('Error fetching Meta pages:', errorDetails);
    return NextResponse.json(
      { success: false, pages: [], error: errorDetails },
      { status: 500 }
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
