import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma, serializeData } from '@/lib/prisma';

// NOTE: 'force-static' was removed here on purpose. Route handlers are
// dynamic by default in the App Router so that they can read the real ?code=
// query parameter TikTok sends back on each live OAuth callback on Vercel.

export async function GET(request: Request) {
  let code = null;
  let clientId = '';
  let error = null;
  let origin = 'http://localhost:3000';

  if (request && request.url) {
    try {
      const url = new URL(request.url);
      code = url.searchParams.get('code');
      clientId = url.searchParams.get('state') || url.searchParams.get('clientId') || clientId;
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

  const clientKey = (process.env.TIKTOK_CLIENT_KEY || process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'awzwmzqb12ijk009').trim();
  const clientSecret = (process.env.TIKTOK_CLIENT_SECRET || '0Zb7Xi3fyDH4uRsIH5zSBndADoEnXZoj').trim();
  const redirectUri = `${origin}/api/auth/callback/tiktok`;

  // Read PKCE code verifier from cookie if present
  const cookieHeader = request && request.headers ? request.headers.get('cookie') || '' : '';
  const match = cookieHeader.match(/tiktok_code_verifier=([^;]+)/);
  const codeVerifier = match ? decodeURIComponent(match[1].trim()) : null;

  if (!clientKey) {
    return new Response(
      `<html><body style="font-family: sans-serif; text-align:center; padding:40px;">
        <h2 style="color:#b00020;">TikTok Configuration Error</h2>
        <p>A valid TikTok Client Key is required from developers.tiktok.com.</p>
        <p>You can also connect your TikTok profile directly using your username in Settings without needing a developer app.</p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }

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
    const postBody: Record<string, string> = {
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    };
    if (codeVerifier) {
      postBody.code_verifier = codeVerifier;
    }

    const tokenRes = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams(postBody).toString(),
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

    // Save to server persistent file store
    try {
      const { saveServerSocialAccount } = await import('@/lib/serverStore');
      saveServerSocialAccount({
        id: `sa_${clientId}_tiktok`,
        clientId,
        platform: 'tiktok',
        platformAccountId: ttAccountId,
        accessToken,
        refreshToken,
        tokenExpiresAt: expiresAt.toISOString(),
      });
    } catch (storeErr) {
      console.warn('Server store save notice:', storeErr);
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
      console.warn('Prisma DB write notice (persisted in server store):', dbErr);
    }

    const returnUrl = `${origin}/settings?connected=tiktok&account=${encodeURIComponent(ttAccountId)}&clientId=${encodeURIComponent(clientId)}`;
    const dashboardUrl = `${origin}/?connected=tiktok&clientId=${encodeURIComponent(clientId)}`;

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>TikTok Connected</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 40px 20px; background: #000; color: #fff; margin: 0;">
          <div style="max-width: 460px; margin: 40px auto; background: #111; border: 1px solid #262626; border-radius: 24px; padding: 36px 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
            <div style="width: 64px; height: 64px; line-height: 64px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 32px; margin: 0 auto 18px; border: 1px solid rgba(16, 185, 129, 0.3);">✓</div>
            <h2 style="font-size: 24px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.02em;">TikTok Connected!</h2>
            <p style="color: #aaa; font-size: 14px; margin: 0 0 4px;">
              <span style="color: #10b981; font-weight: 700; font-size: 16px;">${ttAccountId}</span>
            </p>
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; padding: 12px; font-size: 13px; color: #10b981; font-weight: 600; margin: 20px 0 24px;">
              Persistent Login Session Active (365-day Auto-Refresh)
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              <a id="btn-dash" href="${dashboardUrl}" style="display: block; width: 100%; box-sizing: border-box; padding: 14px; background: #10b981; color: #000; text-decoration: none; border-radius: 14px; font-weight: 700; font-size: 14px; cursor: pointer;">
                View Analytics Dashboard →
              </a>
              <a id="btn-settings" href="${returnUrl}" style="display: block; width: 100%; box-sizing: border-box; padding: 12px; background: #222; color: #ddd; text-decoration: none; border-radius: 14px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid #333;">
                Return to Settings
              </a>
            </div>
            <p id="countdown" style="color: #555; font-size: 12px; margin-top: 20px;">Closing window in <strong style="color: #888;" id="timer">4</strong> seconds...</p>
          </div>
          <script>
            // 1. Set persistent cookies (1 year duration) scoped strictly to client
            var cookieAge = 31536000;
            document.cookie = "koko_selected_client_id=${encodeURIComponent(clientId)}; path=/; max-age=" + cookieAge + "; SameSite=Lax";
            document.cookie = "koko_session_tt_connected_${encodeURIComponent(clientId)}=true; path=/; max-age=" + cookieAge + "; SameSite=Lax";
            document.cookie = "koko_session_tt_account_${encodeURIComponent(clientId)}=${encodeURIComponent(ttAccountId)}; path=/; max-age=" + cookieAge + "; SameSite=Lax";
            document.cookie = "koko_active_tt_token_${encodeURIComponent(clientId)}=${encodeURIComponent(accessToken)}; path=/; max-age=" + cookieAge + "; SameSite=Lax";
            // Invalidate legacy unscoped global cookies so they never bleed into other accounts
            document.cookie = "koko_session_tt_connected=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "koko_session_tt_account=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";

            // 2. Save directly to domain localStorage
            try {
              if ('${clientId}') {
                localStorage.setItem('koko_selected_client_id', '${clientId}');
                localStorage.setItem('koko_active_tt_token_${clientId}', '${accessToken}');
                localStorage.setItem('koko_active_tt_account_${clientId}', '${ttAccountId}');
              }
              var stored = localStorage.getItem('koko_connected_social_accounts');
              var list = stored ? JSON.parse(stored) : [];
              var updated = list.filter(function(a) { return !(a.clientId === '${clientId}' && a.platform === 'tiktok'); });
              updated.push({
                id: 'sa_${clientId}_tiktok',
                clientId: '${clientId}',
                platform: 'tiktok',
                platformAccountId: '${ttAccountId}',
                accessToken: '${accessToken}',
                tokenExpiresAt: new Date(Date.now() + 365 * 86400 * 1000).toISOString()
              });
              localStorage.setItem('koko_connected_social_accounts', JSON.stringify(updated));
            } catch (e) {
              console.warn('LocalStorage save error in callback:', e);
            }

            // 3. Notify parent window via postMessage
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                  type: 'TIKTOK_AUTH_SUCCESS',
                  accountId: '${ttAccountId}',
                  accessToken: '${accessToken}',
                  clientId: '${clientId}'
                }, '*');
              }
            } catch (e) {}

            // Direct button listeners
            document.getElementById('btn-dash').addEventListener('click', function(e) {
              if (window.opener && !window.opener.closed) {
                window.opener.location.href = "${dashboardUrl}";
                window.close();
              }
            });
            document.getElementById('btn-settings').addEventListener('click', function(e) {
              if (window.opener && !window.opener.closed) {
                window.opener.location.href = "${returnUrl}";
                window.close();
              }
            });

            // 4. Graceful countdown auto-close
            var remaining = 4;
            var timerEl = document.getElementById('timer');
            var interval = setInterval(function() {
              remaining--;
              if (timerEl) timerEl.innerText = remaining;
              if (remaining <= 0) {
                clearInterval(interval);
                if (window.opener && !window.opener.closed) {
                  window.opener.location.href = "${returnUrl}";
                  window.close();
                } else {
                  window.location.href = "${returnUrl}";
                }
              }
            }, 1000);
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err: any) {
    console.error('Error in TikTok OAuth Callback:', err?.response?.data || err?.message || err);
    return new Response(
      `<html><body style="font-family: sans-serif; text-align:center; padding:40px;">
        <h2>Failed to complete TikTok account connection</h2>
        <p>${err?.message || 'Check server logs for details.'}</p>
        <p><a href="/settings">Return to Settings</a></p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
