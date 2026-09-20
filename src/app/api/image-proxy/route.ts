import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return new NextResponse('Missing url query parameter', { status: 400 });
    }

    // Do not proxy relative URLs
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      return new NextResponse('Invalid URL protocol', { status: 400 });
    }

    try {
      const isTikTok = targetUrl.includes('tiktok') || targetUrl.includes('tiktokcdn');
      const isInstagram = targetUrl.includes('instagram') || targetUrl.includes('fbcdn') || targetUrl.includes('cdninstagram');

      const response = await axios.get(targetUrl, {
        responseType: 'arraybuffer',
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          ...(isTikTok ? { Referer: 'https://www.tiktok.com/' } : {}),
          ...(isInstagram ? { Referer: 'https://www.instagram.com/' } : {}),
        },
      });

      const contentType = typeof response.headers['content-type'] === 'string' 
        ? response.headers['content-type'] 
        : 'image/jpeg';
      const buffer = Buffer.from(response.data);

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (fetchErr: any) {
      console.warn('Image proxy upstream error for URL:', targetUrl, fetchErr?.message);

      // Return a clean stylish SVG card fallback if remote image is dead or restricted
      const svgFallback = `
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="500" viewBox="0 0 300 500">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1f2937" />
              <stop offset="100%" stop-color="#111827" />
            </linearGradient>
          </defs>
          <rect width="300" height="500" fill="url(#grad)" />
          <circle cx="150" cy="220" r="36" fill="#374151" />
          <polygon points="144,204 164,220 144,236" fill="#ffffff" />
          <text x="150" y="290" text-anchor="middle" fill="#9ca3af" font-family="sans-serif" font-size="14" font-weight="bold">Top Video Content</text>
        </svg>
      `.trim();

      return new NextResponse(svgFallback, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  } catch (error: any) {
    return new NextResponse('Internal Image Proxy Error', { status: 500 });
  }
}
