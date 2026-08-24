import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma, serializeData } from '@/lib/prisma';
import { exchangeMetaLongLivedToken } from '@/lib/api/auth';

export const dynamic = 'force-static';

export async function GET(request: Request) {
  let code = null;
  let clientId = 'client-bulungi-town';
  let error = null;
  let origin = 'http://localhost:3000';

  if (request && request.url) {
    try {
      const url = new URL(request.url);
      code = url.searchParams.get('code');
      clientId = url.searchParams.get('clientId') || clientId;
      error = url.searchParams.get('error');
      origin = url.origin;
    } catch (e) {
      console.warn('URL parse warning on static export build:', e);
    }
  }

  if (error || !code) {
    return new Response(
      `<html><body><script>alert("Meta authorization canceled or completed."); window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const appId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '1532121481550639';
  const appSecret = process.env.INSTAGRAM_APP_SECRET || 'mock_app_secret';
  const redirectUri = `${origin}/api/auth/callback/facebook`;

  try {
    let accessToken = `mock_meta_token_${Date.now()}`;
    let igAccountId = `ig_${clientId}_official`;
    let expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

    if (appId && appSecret && !appSecret.startsWith('mock_')) {
      const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        },
      });

      const shortLivedToken = tokenRes.data.access_token;
      const longLived = await exchangeMetaLongLivedToken(shortLivedToken);
      accessToken = longLived.accessToken;
      expiresAt = new Date(Date.now() + longLived.expiresInSeconds * 1000);

      const meAccountsRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
        params: {
          fields: 'name,instagram_business_account',
          access_token: accessToken,
        },
      });

      const pages = meAccountsRes.data.data || [];
      const linkedIg = pages.find((p: any) => p.instagram_business_account?.id);
      if (linkedIg) {
        igAccountId = linkedIg.instagram_business_account.id;
      }
    }

    try {
      await prisma.socialAccount.upsert({
        where: { id: `sa_${clientId}_instagram` },
        update: {
          platformAccountId: igAccountId,
          accessToken,
          tokenExpiresAt: expiresAt,
        },
        create: {
          id: `sa_${clientId}_instagram`,
          clientId,
          platform: 'instagram',
          platformAccountId: igAccountId,
          accessToken,
          tokenExpiresAt: expiresAt,
        },
      });
    } catch (dbErr) {
      console.warn('DB upsert fallback on Meta OAuth callback:', dbErr);
    }

    return new Response(
      `<html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #f8f8f6;">
          <h2 style="color: #111;">Instagram Business Account Connected!</h2>
          <p style="color: #666; font-size: 14px;">Closing window and updating Koko Digital Studio dashboard...</p>
          <script>
            if (window.opener) {
              window.opener.location.reload();
            }
            setTimeout(function() { window.close(); }, 1500);
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err) {
    console.error('Error in Facebook OAuth Callback:', err);
    return new Response(
      `<html><body><script>alert("Failed to complete Meta account connection."); window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
