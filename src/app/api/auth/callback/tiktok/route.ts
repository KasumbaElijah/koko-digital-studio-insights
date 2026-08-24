import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma, serializeData } from '@/lib/prisma';

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
      `<html><body><script>alert("TikTok authorization canceled or completed."); window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY || process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'mock_tiktok_key';
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET || 'mock_tiktok_secret';
  const redirectUri = `${origin}/api/auth/callback/tiktok`;

  try {
    let accessToken = `mock_tt_access_${Date.now()}`;
    let refreshToken = `mock_tt_refresh_${Date.now()}`;
    let ttAccountId = `tt_${clientId}_official`;
    let expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 365 days

    if (clientKey && clientSecret && !clientSecret.startsWith('mock_')) {
      const tokenRes = await axios.post(
        'https://open.tiktokapis.com/v2/oauth/token/',
        new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      accessToken = tokenRes.data.access_token;
      refreshToken = tokenRes.data.refresh_token;
      ttAccountId = tokenRes.data.open_id || ttAccountId;
      expiresAt = new Date(Date.now() + (tokenRes.data.expires_in || 86400) * 1000);
    }

    try {
      await prisma.socialAccount.upsert({
        where: { id: `sa_${clientId}_tiktok` },
        update: {
          platformAccountId: ttAccountId,
          accessToken,
          refreshToken,
          tokenExpiresAt: expiresAt,
        },
        create: {
          id: `sa_${clientId}_tiktok`,
          clientId,
          platform: 'tiktok',
          platformAccountId: ttAccountId,
          accessToken,
          refreshToken,
          tokenExpiresAt: expiresAt,
        },
      });
    } catch (dbErr) {
      console.warn('DB upsert fallback on TikTok OAuth callback:', dbErr);
    }

    return new Response(
      `<html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #f8f8f6;">
          <h2 style="color: #111;">TikTok Creator Account Connected!</h2>
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
    console.error('Error in TikTok OAuth Callback:', err);
    return new Response(
      `<html><body><script>alert("Failed to complete TikTok account connection."); window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
