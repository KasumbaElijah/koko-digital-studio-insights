import { NextResponse } from 'next/server';
import { fetchTikTokProfileVideos } from '@/lib/api/tiktokScraper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username') || searchParams.get('handle') || '';
    if (!username) {
      return NextResponse.json({ success: false, error: 'Username is required', posts: [] }, { status: 400 });
    }

    const result = await fetchTikTokProfileVideos(username);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API /api/tiktok/posts error:', error);
    return NextResponse.json({ success: false, posts: [] }, { status: 500 });
  }
}
