import { NextResponse } from 'next/server';
import axios from 'axios';
import { prisma, serializeData } from '@/lib/prisma';
import { exchangeMetaLongLivedToken } from '@/lib/api/auth';

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
      clientId = url.searchParams.get('clientId') || clientId;
      error = url.searchParams.get('error');
      origin = url.origin;
    } catch (e) {
      console.warn('URL parse warning:', e);
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

  try {
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
    const accessToken = longLived.accessToken;
    const expiresAt = new Date(Date.now() + longLived.expiresInSeconds * 1000);

    let igAccountId = `ig_${clientId}_official`; // fallback only if no linked IG account is found below
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
    } else {
      // No Instagram Business account is linked to any Page this user
      // manages. Surface this clearly instead of saving a placeholder ID
      // that looks real but isn't.
      return new Response(
        `<html><body style="font-family: sans-serif; text-align:center; padding:40px;">
          <h2 style="color:#b00020;">No linked Instagram Business account found</h2>
          <p>This Facebook login succeeded, but no Page you manage has an Instagram Business/Creator account linked. Link one in Meta Business Suite, then try again.</p>
        </body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

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

    return new Response(
      `<html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #f8f8f6;">
          <h2 style="color: #111;">Instagram Business Account Connected!</h2>
          <p style="color: #666; font-size: 14px;">Connected account ID: ${igAccountId}</p>
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
      `<html><body><script>alert("Failed to complete Meta account connection. Check server logs."); window.close();</script></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
