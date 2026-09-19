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
  let clientId = '';
  let error = null;

  const host = request?.headers?.get('x-forwarded-host') || request?.headers?.get('host') || '';
  let origin = 'https://koko-digital-studio-insights.vercel.app';
  if (host.includes('localhost')) {
    origin = 'http://localhost:3000';
  } else if (host.includes('github.io')) {
    origin = 'https://kasumbaelijah.github.io/koko-digital-studio-insights';
  }

  if (request && request.url) {
    try {
      const url = new URL(request.url);
      code = url.searchParams.get('code');
      clientId = url.searchParams.get('state') || url.searchParams.get('clientId') || clientId;
      error = url.searchParams.get('error') || url.searchParams.get('error_message');
      const errorMsg = url.searchParams.get('error_message') || url.searchParams.get('error_description') || error;

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

  const redirectUri = `${origin}/api/auth/callback/facebook`;

  const appId = '1532121481550639';
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim() || '6986eab2100e2e9caf9d858650fb873f';

  // Strip trailing '#_' if present
  const cleanCode = code.replace(/#_.*$/, '');

  try {
    let accessToken: string = '';
    let igAccountId: string = `ig_${clientId}_official`;
    let expiresAt = new Date(Date.now() + 60 * 86400 * 1000);

    // Direct exchange of Facebook OAuth code for access token
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code: cleanCode,
      },
    });

    const shortLivedToken = tokenRes.data.access_token;
    accessToken = shortLivedToken;

    // Exchange for 60-day long-lived token
    try {
      const longLived = await exchangeMetaLongLivedToken(shortLivedToken, appId, appSecret);
      accessToken = longLived.accessToken;
      expiresAt = new Date(Date.now() + longLived.expiresInSeconds * 1000);
    } catch (e) {
      console.warn('Long-lived token exchange notice, using short token:', e);
    }

    // Retrieve linked Instagram accounts or managed Pages
    let discoveredPages: any[] = [];
    let selectedPageId = '';
    let selectedPageName = '';
    let igUsername = '';

    try {
      const meAccountsRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
        params: {
          fields: 'id,name,category,access_token,instagram_business_account{id,username,name,followers_count}',
          access_token: accessToken,
        },
      });

      const pages = meAccountsRes.data?.data || [];
      discoveredPages = pages.map((p: any) => ({
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
            }
          : null,
      }));

      const linkedIgPage = pages.find((p: any) => p.instagram_business_account?.id) || pages[0];
      if (linkedIgPage) {
        selectedPageId = linkedIgPage.id;
        selectedPageName = linkedIgPage.name || '';
        if (linkedIgPage.instagram_business_account?.id) {
          igAccountId = linkedIgPage.instagram_business_account.id;
          if (linkedIgPage.instagram_business_account.username) {
            igUsername = linkedIgPage.instagram_business_account.username;
          }
        } else if (linkedIgPage.id) {
          igAccountId = linkedIgPage.id;
        }
      }
    } catch (accountsErr) {
      console.warn('me/accounts query notice:', accountsErr);
    }

    if (!igUsername && igAccountId) {
      try {
        const igProfileRes = await axios.get(`https://graph.facebook.com/v19.0/${igAccountId}`, {
          params: {
            fields: 'id,username,name',
            access_token: accessToken,
          },
        });
        if (igProfileRes.data?.username) {
          igUsername = igProfileRes.data.username;
        }
      } catch (profileErr) {
        console.warn('Profile fetch notice:', profileErr);
      }
    }

    try {
      await prisma.socialAccount.upsert({
        where: { id: `sa_${clientId}_instagram` },
        update: {
          platformAccountId: igUsername ? `@${igUsername}` : igAccountId,
          accessToken,
          tokenExpiresAt: expiresAt,
        },
        create: {
          id: `sa_${clientId}_instagram`,
          clientId,
          platform: 'instagram',
          platformAccountId: igUsername ? `@${igUsername}` : igAccountId,
          accessToken,
          tokenExpiresAt: expiresAt,
        },
      });
    } catch (dbErr) {
      console.warn('Postgres database save warning (client state will persist in browser):', dbErr);
    }

    const discoveredPagesJson = JSON.stringify(discoveredPages);
    const returnUrl = `${origin}/settings?connected=instagram&account=${encodeURIComponent(String(igAccountId))}&username=${encodeURIComponent(igUsername)}&token=${encodeURIComponent(accessToken)}&clientId=${encodeURIComponent(clientId)}&pageId=${encodeURIComponent(selectedPageId)}&pageName=${encodeURIComponent(selectedPageName)}`;
    const dashboardUrl = `${origin}/?connected=instagram&clientId=${encodeURIComponent(clientId)}&pageId=${encodeURIComponent(selectedPageId)}`;

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Meta Instagram Connected</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 40px 20px; background: #000; color: #fff; margin: 0;">
          <div style="max-width: 460px; margin: 40px auto; background: #111; border: 1px solid #262626; border-radius: 24px; padding: 36px 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
            <div style="width: 64px; height: 64px; line-height: 64px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 32px; margin: 0 auto 18px; border: 1px solid rgba(16, 185, 129, 0.3);">✓</div>
            <h2 style="font-size: 24px; font-weight: 800; margin: 0 0 6px; font-family: sans-serif; letter-spacing: -0.02em;">Instagram Connected!</h2>
            <p style="color: #aaa; font-size: 14px; margin: 0 0 4px;">
              ${igUsername ? `<span style="color: #10b981; font-weight: 700; font-size: 16px;">@${igUsername}</span>` : ''}
            </p>
            ${selectedPageName ? `<p style="color: #888; font-size: 13px; margin: 0 0 4px; font-weight: 500;">Page: ${selectedPageName}</p>` : ''}
            <p style="color: #666; font-size: 12px; margin: 0 0 18px; font-family: monospace;">Account ID: ${igAccountId}</p>
            
            ${discoveredPages.length > 1 ? `
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 14px; padding: 12px; margin-bottom: 20px; text-align: left;">
              <div style="font-size: 11px; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                ✓ ${discoveredPages.length} Pages Detected
              </div>
              <p style="color: #aaa; font-size: 12px; margin: 0; line-height: 1.4;">
                Active: <strong style="color: #fff;">${selectedPageName || 'Primary Page'}</strong>. You can switch pages anytime directly on the Dashboard or in Settings.
              </p>
            </div>
            ` : `
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; padding: 12px; font-size: 13px; color: #10b981; font-weight: 600; margin-bottom: 24px;">
              60-day Long-Lived Token Active with Auto-Refresh
            </div>
            `}

            <div style="display: flex; flex-direction: column; gap: 10px;">
              <a id="btn-dash" href="${dashboardUrl}" style="display: block; width: 100%; box-sizing: border-box; padding: 14px; background: #10b981; color: #000; text-decoration: none; border-radius: 14px; font-weight: 700; font-size: 14px; cursor: pointer;">
                View Analytics Dashboard →
              </a>
              <a id="btn-settings" href="${returnUrl}" style="display: block; width: 100%; box-sizing: border-box; padding: 12px; background: #222; color: #ddd; text-decoration: none; border-radius: 14px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid #333;">
                Return to Settings
              </a>
            </div>
            <p id="countdown" style="color: #555; font-size: 12px; margin-top: 20px;">Closing window in <strong style="color: #888;" id="timer">5</strong> seconds...</p>
          </div>
          <script>
            // 1. Save directly to domain localStorage
            try {
              var pages = ${discoveredPagesJson};
              localStorage.setItem('koko_meta_available_pages_${clientId}', JSON.stringify(pages));
              if ('${selectedPageId}') {
                localStorage.setItem('koko_active_page_id_${clientId}', '${selectedPageId}');
                localStorage.setItem('koko_active_page_name_${clientId}', '${selectedPageName.replace(/'/g, "\\'")}');
              }

              var stored = localStorage.getItem('koko_connected_social_accounts');
              var list = stored ? JSON.parse(stored) : [];
              var updated = list.filter(function(a) { return !(a.clientId === '${clientId}' && a.platform === 'instagram'); });
              var displayAcct = '${igUsername ? '@' + igUsername : igAccountId}';
              updated.push({
                id: 'sa_${clientId}_instagram',
                clientId: '${clientId}',
                platform: 'instagram',
                platformAccountId: displayAcct,
                accessToken: '${accessToken}',
                pageId: '${selectedPageId}',
                pageName: '${selectedPageName.replace(/'/g, "\\'")}',
                tokenExpiresAt: new Date(Date.now() + 60 * 86400 * 1000).toISOString()
              });
              localStorage.setItem('koko_connected_social_accounts', JSON.stringify(updated));
              localStorage.setItem('koko_active_ig_token_${clientId}', '${accessToken}');
              localStorage.setItem('koko_active_ig_account_${clientId}', '${igAccountId}');
              if ('${igUsername}') {
                localStorage.setItem('koko_active_ig_username_${clientId}', '${igUsername}');
              }
            } catch (e) {
              console.warn('LocalStorage error in callback popup:', e);
            }

            // 2. Notify parent window via postMessage
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                  type: 'META_AUTH_SUCCESS',
                  platform: 'instagram',
                  accountId: '${igAccountId}',
                  username: '${igUsername}',
                  accessToken: '${accessToken}',
                  clientId: '${clientId}',
                  pageId: '${selectedPageId}',
                  pageName: '${selectedPageName.replace(/'/g, "\\'")}',
                  pages: pages
                }, '*');
                window.opener.location.href = "${returnUrl}";
              }
            } catch (e) {
              console.warn('postMessage notice:', e);
            }

            // Handle direct clicks to route opener or self
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

            // 3. Gentle countdown timer
            var remaining = 5;
            var timerEl = document.getElementById('timer');
            var interval = setInterval(function() {
              remaining--;
              if (timerEl) timerEl.innerText = remaining;
              if (remaining <= 0) {
                clearInterval(interval);
                if (window.opener && !window.opener.closed) {
                  window.close();
                } else {
                  window.location.href = "${returnUrl}";
                }
              }
            }, 1000);
          </script>
        </body>
      </html>`,
      { 
        headers: { 
          'Content-Type': 'text/html',
          'Set-Cookie': `koko_ig_token=${accessToken}; Path=/; SameSite=Lax; Max-Age=5184000`
        } 
      }
    );
  } catch (err: any) {
    console.error('Error in Facebook OAuth Callback:', err);
    const detailedError =
      err?.response?.data?.error?.message ||
      err?.response?.data?.error_description ||
      (err?.response?.data ? JSON.stringify(err.response.data) : '') ||
      err?.message ||
      'Check server logs for details.';
    return new Response(
      `<html><body style="font-family: sans-serif; text-align:center; padding:40px; background:#000; color:#fff;">
        <h2 style="color:#ef4444;">Connection Notice</h2>
        <p style="color:#aaa; font-size:14px; max-width:600px; margin:0 auto; word-break:break-word;">${detailedError}</p>
        <a href="${origin}/settings" style="display:inline-block; margin-top:20px; padding:12px 24px; background:#fff; color:#000; text-decoration:none; font-weight:bold; border-radius:10px;">Return to Dashboard</a>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
