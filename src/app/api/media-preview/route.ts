import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url')?.trim();

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // 1. Handle TikTok URLs
    if (url.includes('tiktok.com')) {
      try {
        const oembedRes = await axios.get('https://www.tiktok.com/oembed', {
          params: { url },
          timeout: 8000,
        });

        const data = oembedRes.data;
        if (data) {
          return NextResponse.json({
            success: true,
            platform: 'tiktok',
            contentFormat: 'Videos',
            title: data.title || 'TikTok Video',
            thumbnailUrl: data.thumbnail_url || null,
            authorName: data.author_name || data.author_unique_id || '',
            authorUsername: data.author_unique_id ? `@${data.author_unique_id}` : '',
            permalink: url,
          });
        }
      } catch (ttErr: any) {
        console.warn('TikTok oEmbed request notice:', ttErr?.message || ttErr);
      }
    }

    // 2. Handle Instagram URLs
    if (url.includes('instagram.com')) {
      const isReel = url.includes('/reel/') || url.includes('/reels/');
      const format = isReel ? 'Videos' : 'Image';
      let shortcode = '';
      const match = url.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
      if (match && match[1]) {
        shortcode = match[1];
      }

      // Try Meta oEmbed API if credentials configured
      const appId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '1532121481550639';
      const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || '6986eab2100e2e9caf9d858650fb873f';

      if (appId && appSecret) {
        try {
          const igOembedRes = await axios.get('https://graph.facebook.com/v19.0/instagram_oembed', {
            params: {
              url,
              access_token: `${appId}|${appSecret}`,
            },
            timeout: 6000,
          });
          if (igOembedRes.data) {
            const data = igOembedRes.data;
            return NextResponse.json({
              success: true,
              platform: 'instagram',
              contentFormat: format,
              title: data.title || (isReel ? 'Instagram Reel' : 'Instagram Post'),
              thumbnailUrl: data.thumbnail_url || null,
              authorName: data.author_name || '',
              permalink: url,
              shortcode,
            });
          }
        } catch (igOembedErr) {
          // Fall through to standard Instagram link metadata
        }
      }

      return NextResponse.json({
        success: true,
        platform: 'instagram',
        contentFormat: format,
        title: isReel ? 'Instagram Reel' : 'Instagram Post',
        thumbnailUrl: null,
        permalink: url,
        shortcode,
      });
    }

    // 3. Handle direct Image URL
    if (/\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i.test(url)) {
      return NextResponse.json({
        success: true,
        platform: 'instagram',
        contentFormat: 'Image',
        title: 'Creative Studio Image',
        thumbnailUrl: url,
        permalink: url,
      });
    }

    return NextResponse.json({
      success: true,
      platform: 'instagram',
      contentFormat: 'Videos',
      title: 'Social Media Feature',
      thumbnailUrl: null,
      permalink: url,
    });
  } catch (error: any) {
    console.error('Error fetching media preview:', error);
    return NextResponse.json({ error: 'Failed to fetch media preview' }, { status: 500 });
  }
}
