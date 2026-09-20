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
  let clientId = '';
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

    // Save to server persistent file store
    try {
      const { saveServerSocialAccount } = await import('@/lib/serverStore');
      saveServerSocialAccount({
        id: `sa_${clientId}_instagram`,
        clientId,
        platform: 'instagram',
        platformAccountId: String(igUserId),
        accessToken,
        tokenExpiresAt: expiresAt.toISOString(),
      });
    } catch (storeErr) {
      console.warn('Server store save notice:', storeErr);
    }

    // Save to PostgreSQL via Prisma with safe offline fallback
    try {
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
    } catch (dbErr) {
      console.warn('Postgres database save warning (client state will persist in browser):', dbErr);
    }

    const returnUrl = `${origin}/settings?connected=instagram&account=${encodeURIComponent(String(igUserId))}&token=${encodeURIComponent(accessToken)}&clientId=${encodeURIComponent(clientId)}`;

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Instagram Connected</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 40px 20px; background: #000; color: #fff; margin: 0;">
          <div style="max-width: 440px; margin: 40px auto; background: #111; border: 1px solid #262626; border-radius: 24px; padding: 36px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
            <div style="width: 60px; height: 60px; line-height: 60px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 32px; margin: 0 auto 18px;">✓</div>
            <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 8px; font-family: sans-serif;">Instagram Connected!</h2>
            <p style="color: #888; font-size: 14px; margin: 0 0 18px;">Account ID: <strong style="color: #fff;">${igUserId}</strong></p>
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 12px; font-size: 13px; color: #10b981; font-weight: 600; margin-bottom: 24px;">
              60-day Long-Lived Token Active with Auto-Refresh
            </div>
            <a href="${returnUrl}" style="display: block; width: 100%; box-sizing: border-box; padding: 14px; background: #fff; color: #000; text-decoration: none; border-radius: 14px; font-weight: 700; font-size: 14px; cursor: pointer;">
              ← Back to Koko Digital Studio
            </a>
            <p style="color: #555; font-size: 12px; margin-top: 16px;">Redirecting you back automatically...</p>
          </div>
          <script>
            var cookieAge = 31536000;
            document.cookie = "koko_selected_client_id=${encodeURIComponent(clientId)}; path=/; max-age=" + cookieAge + "; SameSite=Lax";
            document.cookie = "koko_session_ig_connected=true; path=/; max-age=" + cookieAge + "; SameSite=Lax";
            document.cookie = "koko_session_ig_account=${encodeURIComponent(String(igUserId))}; path=/; max-age=" + cookieAge + "; SameSite=Lax";
            document.cookie = "koko_active_ig_token_${encodeURIComponent(clientId)}=${encodeURIComponent(accessToken)}; path=/; max-age=" + cookieAge + "; SameSite=Lax";

            try {
              if ('${clientId}') {
                localStorage.setItem('koko_selected_client_id', '${clientId}');
                localStorage.setItem('koko_active_ig_token_${clientId}', '${accessToken}');
                localStorage.setItem('koko_active_ig_account_${clientId}', '${igUserId}');
              }
              var stored = localStorage.getItem('koko_connected_social_accounts');
              var list = stored ? JSON.parse(stored) : [];
              var updated = list.filter(function(a) { return !(a.clientId === '${clientId}' && a.platform === 'instagram'); });
              updated.push({
                id: 'sa_${clientId}_instagram',
                clientId: '${clientId}',
                platform: 'instagram',
                platformAccountId: '${igUserId}',
                accessToken: '${accessToken}',
                tokenExpiresAt: new Date(Date.now() + 60 * 86400 * 1000).toISOString()
              });
              localStorage.setItem('koko_connected_social_accounts', JSON.stringify(updated));
            } catch (e) {}

            try {
              if (window.opener && !window.opener.closed) {
                window.opener.location.href = "${returnUrl}";
                setTimeout(function() { window.close(); }, 800);
              } else {
                setTimeout(function() { window.location.href = "${returnUrl}"; }, 1200);
              }
            } catch (e) {
              setTimeout(function() { window.location.href = "${returnUrl}"; }, 1200);
            }
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err: any) {
    console.error('Error in Instagram OAuth Callback:', err?.response?.data || err?.message || err);
    return new Response(
      `<html><body style="font-family: sans-serif; text-align:center; padding:40px; background:#000; color:#fff;">
        <h2 style="color:#ef4444;">Instagram Connection Notice</h2>
        <p style="color:#aaa; font-size:14px;">${err?.response?.data?.error_message || err?.message || 'Check server logs for details.'}</p>
        <a href="${origin}/settings" style="display:inline-block; margin-top:20px; padding:12px 24px; background:#fff; color:#000; text-decoration:none; font-weight:bold; border-radius:10px;">Return to Dashboard</a>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
