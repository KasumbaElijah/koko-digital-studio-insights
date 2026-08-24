import axios from 'axios';
import crypto from 'crypto';

/**
 * Generates a PKCE code_verifier and code_challenge (SHA-256) for TikTok OAuth 2.0 PKCE flow.
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

/**
 * Exchanges a short-lived Meta user access token for a 60-day long-lived access token.
 */
export async function exchangeMetaLongLivedToken(shortLivedToken: string): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const appId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret || appSecret.startsWith('mock_')) {
    console.warn('INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET missing; returning mock long-lived token.');
    return {
      accessToken: `mock_meta_60day_${Date.now()}`,
      expiresInSeconds: 5184000, // 60 days
    };
  }

  try {
    const response = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    return {
      accessToken: response.data.access_token,
      expiresInSeconds: response.data.expires_in || 5184000,
    };
  } catch (error) {
    console.error('Error exchanging Meta long-lived token:', error);
    throw new Error('Failed to exchange Meta long-lived access token');
  }
}

/**
 * Refreshes a TikTok user access token using the 365-day refresh token.
 */
export async function refreshTikTokToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresInSeconds: number }> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY || process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret || clientSecret.startsWith('mock_')) {
    console.warn('TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET missing; returning mock refreshed token.');
    return {
      accessToken: `mock_tt_access_${Date.now()}`,
      refreshToken: `mock_tt_refresh_${Date.now()}`,
      expiresInSeconds: 86400,
    };
  }

  try {
    const response = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresInSeconds: response.data.expires_in || 86400,
    };
  } catch (error) {
    console.error('Error refreshing TikTok token:', error);
    throw new Error('Failed to refresh TikTok access token');
  }
}
