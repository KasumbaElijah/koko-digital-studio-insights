import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { exchangeInstagramLongLivedToken } from '@/lib/api/auth';

// Business Login for Instagram (March 2026 update)
// Endpoints:
// - Dialog: https://www.instagram.com/oauth/authorize
// - Code Exchange: POST https://api.instagram.com/oauth/access_token
// - Long-Lived Token: GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token
// - Refresh: GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token

export async function GET(request: Request) {
  let code: string | null = null;
  let clientId = 'client-bulungi-town';
  let error: string | null = null;
  let errorDescription: string | null = null;
  let origin = 'http://localhost:3000';

  if (request && request.url) {
    try {
      const url = new URL(request.url);
      code = url.searchParams.get('code');
      clientId = url.searchParams.get('state') || url.searchParams.get('clientId') || clientId;
      error = url.searchParams.get('error');
      errorDescription = url.searchParams.get('error_description');
      origin = url.origin;
    } catch (e) {
      console.warn('URL parse warning on Instagram callback:', e);
    }
  }

  // Handle user denied or canceled authorization
  if (error || !code) {
    console.warn('Instagram authorization canceled or failed:', error, errorDescription);
    return new Response(
      `<html><body style="font-family: sans-serif; text-align:center; padding:40px;">
        <h2 style="color:#b00020;">Authorization Canceled</h2>
        <p>${errorDescription || 'Instagram authorization was canceled or denied.'}</p>
        <script>setTimeout(function() { window.close(); }, 2500);</script>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const appId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '1762099978384335';
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = `${origin}/api/auth/callback/instagram`;

  if (!appSecret || appSecret.startsWith('mock_')) {
    console.error('INSTAGRAM_APP_SECRET is not configured in this environment.');
    return new Response(
      `<html><body style="font-family: sans-serif; text-align:center; padding:40px;">
        <h2 style="color:#b00020;">Configuration error</h2>
        <p>INSTAGRAM_APP_SECRET is not set in Vercel environment variables. No account was connected.</p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // NOTE: Strip any '#_' appended to the end of the code parameter as per official Meta guidelines
  const cleanCode = code.replace(/#_.*$/, '');

  try {
    // Step 2: Exchange authorization code for short-lived token and Instagram User ID
    const formData = new URLSearchParams();
    formData.append('client_id', appId);
    formData.append('client_secret', appSecret);
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', redirectUri);
    formData.append('code', cleanCode);

    const tokenRes = await axios.post('https://api.instagram.com/oauth/access_token', formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const resData = tokenRes.data;
    const shortLivedToken = resData.access_token || resData.data?.[0]?.access_token;
    const igUserId = resData.user_id || resData.data?.[0]?.user_id || `ig_${clientId}_official`;

    if (!shortLivedToken) {
      throw new Error(`Failed to extract access_token from Instagram response: ${JSON.stringify(resData)}`);
    }

    // Step 3: Exchange short-lived token for 60-day long-lived token
    const longLived = await exchangeInstagramLongLivedToken(shortLivedToken);
    const accessToken = longLived.accessToken;
    const expiresAt = new Date(Date.now() + longLived.expiresInSeconds * 1000);

    // Save to PostgreSQL via Prisma
    await prisma.socialAccount.upsert({
      where: { id: `sa_${clientId}_instagram` },
      update: {
        platformAccountId: String(igUserId),
        accessToken,
        tokenExpiresAt: expiresAt,
      },
      create: {
        id: `sa_${clientId}_instagram`,
        clientId,
        platform: 'instagram',
        platformAccountId: String(igUserId),
        accessToken,
        tokenExpiresAt: expiresAt,
      },
    });

    return new Response(
      `<html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #f8f8f6;">
          <h2 style="color: #111;">Instagram Business Account Connected!</h2>
          <p style="color: #666; font-size: 14px;">Connected Instagram Account ID: <strong>${igUserId}</strong></p>
          <p style="color: #10b981; font-size: 13px; font-weight: bold;">60-day Long-Lived Token Active with Auto-Refresh</p>
          <p style="color: #888; font-size: 13px; margin-top: 15px;">Closing window and updating dashboard...</p>
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
    console.error('Error in Instagram OAuth Callback:', err?.response?.data || err?.message || err);
    return new Response(
      `<html><body style="font-family: sans-serif; text-align:center; padding:40px;">
        <h2 style="color:#b00020;">Instagram Connection Failed</h2>
        <p style="color:#555; font-size:13px;">${err?.response?.data?.error_message || err?.message || 'Check server logs for details.'}</p>
        <button onclick="window.close()" style="margin-top:20px; padding:10px 20px; background:#111; color:#fff; border:none; border-radius:8px; cursor:pointer;">Close Window</button>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
