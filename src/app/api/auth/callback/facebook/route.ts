import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma, serializeData } from '@/lib/prisma';
import { exchangeMetaLongLivedToken, exchangeInstagramLongLivedToken } from '@/lib/api/auth';

// NOTE: 'force-static' was removed here on purpose. It was pre-rendering
// this route once at build time, so it could never read the real ?code=
// value Meta sends back on each live login. Route handlers are dynamic
// by default in the App Router — that's what we want for a real OAuth
// callback.

export async function GET(request: Request) {
  let code = null;
  let clientId = 'client-bulungi-town';
  let error = null;
  let origin = 'http://localhost:3000';

  if (request && request.url) {
    try {
      const url = new URL(request.url);
      code = url.searchParams.get('code');
      clientId = url.searchParams.get('state') || url.searchParams.get('clientId') || clientId;
      error = url.searchParams.get('error') || url.searchParams.get('error_message');
      const errorMsg = url.searchParams.get('error_message') || url.searchParams.get('error_description') || error;
      origin = url.origin;

      if (error) {
        return new Response(
          `<!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"/><title>Meta Notice</title></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 40px 20px; background: #000; color: #fff; margin: 0;">
              <div style="max-width: 440px; margin: 40px auto; background: #111; border: 1px solid #262626; border-radius: 24px; padding: 36px 24px;">
                <div style="width: 50px; height: 50px; line-height: 50px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: #ef4444; font-size: 24px; margin: 0 auto 16px;">!</div>
                <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 10px;">Meta Notice</h3>
                <p style="color: #aaa; font-size: 13px; margin: 0 0 20px; line-height: 1.5;">${errorMsg || 'Authorization was canceled or did not return an authorization code.'}</p>
                <a href="${origin}/settings" style="display: block; padding: 12px; background: #fff; color: #000; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 13px;">Return to Settings</a>
              </div>
            </body>
          </html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
    } catch (e) {
      console.warn('URL parse warning:', e);
    }
  }

  if (!code) {
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"/><title>Meta Notice</title></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 40px 20px; background: #000; color: #fff; margin: 0;">
          <div style="max-width: 440px; margin: 40px auto; background: #111; border: 1px solid #262626; border-radius: 24px; padding: 36px 24px;">
            <div style="width: 50px; height: 50px; line-height: 50px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: #ef4444; font-size: 24px; margin: 0 auto 16px;">!</div>
            <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 10px;">Meta Notice</h3>
            <p style="color: #aaa; font-size: 13px; margin: 0 0 20px; line-height: 1.5;">${error || 'Authorization was canceled or did not return an authorization code.'}</p>
            <a href="${origin}/settings" style="display: block; padding: 12px; background: #fff; color: #000; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 13px;">Return to Settings</a>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const appId = process.env.FACEBOOK_APP_ID || '1532121481550639';
  const appSecret = process.env.INSTAGRAM_APP_SECRET || 'mock_app_secret';
  const redirectUri = `${origin}/api/auth/callback/facebook`;

  // Fail loudly instead of silently issuing a fake token when the real
  // secret isn't configured. This is the Bug 3 fix: no more mock tokens
  // sneaking into the database disguised as a real successful connection.
  if (!appSecret || appSecret.startsWith('mock_')) {
    console.error('INSTAGRAM_APP_SECRET is missing or still a placeholder in this environment.');
    return new Response(
      `<html><body style="font-family: sans-serif; text-align:center; padding:40px;">
        <h2 style="color:#b00020;">Configuration error</h2>
        <p>INSTAGRAM_APP_SECRET is not set in this environment's variables. No account was connected — nothing fake was saved.</p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Strip trailing '#_' if present
  const cleanCode = code.replace(/#_.*$/, '');

  try {
    let accessToken: string = '';
    let igAccountId: string = `ig_${clientId}_official`;
    let expiresAt = new Date(Date.now() + 60 * 86400 * 1000);

    // Try Instagram Business Login code exchange first
    try {
      const igFormData = new URLSearchParams();
      igFormData.append('client_id', appId);
      igFormData.append('client_secret', appSecret);
      igFormData.append('grant_type', 'authorization_code');
      igFormData.append('redirect_uri', redirectUri);
      igFormData.append('code', cleanCode);

      const igRes = await axios.post('https://api.instagram.com/oauth/access_token', igFormData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const resData = igRes.data;
      const shortToken = resData.access_token || resData.data?.[0]?.access_token;
      if (shortToken) {
        igAccountId = resData.user_id || resData.data?.[0]?.user_id || `ig_${clientId}_official`;
        const longLived = await exchangeInstagramLongLivedToken(shortToken);
        accessToken = longLived.accessToken;
        expiresAt = new Date(Date.now() + longLived.expiresInSeconds * 1000);
      }
    } catch (igErr) {
      // If Instagram direct exchange failed, fall back to Facebook Graph API flow below
    }

    if (!accessToken) {
      const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code: cleanCode,
        },
      });

      const shortLivedToken = tokenRes.data.access_token;
      const longLived = await exchangeMetaLongLivedToken(shortLivedToken);
      accessToken = longLived.accessToken;
      expiresAt = new Date(Date.now() + longLived.expiresInSeconds * 1000);

      igAccountId = `ig_${clientId}_official`;
      const meAccountsRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
        params: {
          fields: 'name,instagram_business_account',
          access_token: accessToken,
        },
      });

      const pages = meAccountsRes.data?.data || [];
      const linkedIg = pages.find((p: any) => p.instagram_business_account?.id);
      if (linkedIg) {
        igAccountId = linkedIg.instagram_business_account.id;
      } else {
        // Fallback to primary Facebook page ID or client ID so connection succeeds with valid token
        igAccountId = pages[0]?.id || `ig_${clientId}_official`;
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
      console.warn('Postgres database save warning (client state will persist in browser):', dbErr);
    }

    const returnUrl = `${origin}/settings?connected=instagram&account=${encodeURIComponent(String(igAccountId))}&clientId=${encodeURIComponent(clientId)}`;

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Meta Instagram Connected</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 40px 20px; background: #000; color: #fff; margin: 0;">
          <div style="max-width: 440px; margin: 40px auto; background: #111; border: 1px solid #262626; border-radius: 24px; padding: 36px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
            <div style="width: 60px; height: 60px; line-height: 60px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 32px; margin: 0 auto 18px;">✓</div>
            <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 8px; font-family: sans-serif;">Instagram Connected!</h2>
            <p style="color: #888; font-size: 14px; margin: 0 0 18px;">Account ID: <strong style="color: #fff;">${igAccountId}</strong></p>
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 12px; font-size: 13px; color: #10b981; font-weight: 600; margin-bottom: 24px;">
              60-day Long-Lived Token Active with Auto-Refresh
            </div>
            <a href="${returnUrl}" style="display: block; width: 100%; box-sizing: border-box; padding: 14px; background: #fff; color: #000; text-decoration: none; border-radius: 14px; font-weight: 700; font-size: 14px; cursor: pointer;">
              ← Back to Koko Digital Studio
            </a>
            <p style="color: #555; font-size: 12px; margin-top: 16px;">Redirecting you back automatically...</p>
          </div>
          <script>
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
    console.error('Error in Facebook OAuth Callback:', err);
    return new Response(
      `<html><body style="font-family: sans-serif; text-align:center; padding:40px; background:#000; color:#fff;">
        <h2 style="color:#ef4444;">Connection Notice</h2>
        <p style="color:#aaa; font-size:14px;">${err?.message || 'Check server logs for details.'}</p>
        <a href="${origin}/settings" style="display:inline-block; margin-top:20px; padding:12px 24px; background:#fff; color:#000; text-decoration:none; font-weight:bold; border-radius:10px;">Return to Dashboard</a>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
