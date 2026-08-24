import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma, serializeData } from '@/lib/prisma';
import { exchangeMetaLongLivedToken } from '@/lib/api/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const clientId = searchParams.get('clientId') || 'client-bulungi-town';
  const error = searchParams.get('error');

  if (error || !code) {
    return new Response(
      `<html><body><script>alert("Meta authorization canceled or failed."); window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const appId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '113869198637480';
  const appSecret = process.env.INSTAGRAM_APP_SECRET || 'mock_app_secret';
  const redirectUri = `${new URL(request.url).origin}/api/auth/callback/facebook`;

  try {
    let accessToken = `mock_meta_token_${Date.now()}`;
    let igAccountId = `ig_${clientId}_official`;
    let expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

    // If live credentials are available, perform Graph API exchange
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

      // Query linked Instagram Business Account ID
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

    // Upsert into Database
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
