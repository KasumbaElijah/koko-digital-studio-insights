import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma, serializeData } from '@/lib/prisma';

// NOTE: 'force-static' was removed here on purpose. Route handlers are
// dynamic by default in the App Router so that they can read the real ?code=
// query parameter TikTok sends back on each live OAuth callback on Vercel.

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
      console.warn('URL parse warning:', e);
    }
  }

  if (error || !code) {
    return new Response(
      `<html><body><script>alert("TikTok authorization canceled or completed."); window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY || process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'awzwmzqb12ijk009';
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET || 'mock_tiktok_secret';
  const redirectUri = `${origin}/api/auth/callback/tiktok`;

  // Fail loudly instead of silently issuing a fake token when real secret isn't configured
  if (!clientSecret || clientSecret.startsWith('mock_')) {
    console.error('TIKTOK_CLIENT_SECRET is missing or placeholder in this environment.');
    return new Response(
      `<html><body style="font-family: sans-serif; text-align:center; padding:40px;">
        <h2 style="color:#b00020;">Configuration error</h2>
        <p>TIKTOK_CLIENT_SECRET is not set in this environment's variables. No account was connected — nothing fake was saved.</p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
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

    const accessToken = tokenRes.data.access_token;
    const refreshToken = tokenRes.data.refresh_token;
    const ttAccountId = tokenRes.data.open_id || `tt_${clientId}_official`;
    const expiresAt = new Date(Date.now() + (tokenRes.data.expires_in || 86400) * 1000);

    if (!accessToken) {
      return new Response(
        `<html><body style="font-family: sans-serif; text-align:center; padding:40px;">
          <h2 style="color:#b00020;">TikTok token exchange failed</h2>
          <p>TikTok did not return an access token: ${JSON.stringify(tokenRes.data)}</p>
        </body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

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

    return new Response(
      `<html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #f8f8f6;">
          <h2 style="color: #111;">TikTok Creator Account Connected!</h2>
          <p style="color: #666; font-size: 14px;">Connected account ID: ${ttAccountId}</p>
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
  } catch (err: any) {
    console.error('Error in TikTok OAuth Callback:', err?.response?.data || err?.message || err);
    return new Response(
      `<html><body><script>alert("Failed to complete TikTok account connection. Check server logs."); window.close();</script></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
