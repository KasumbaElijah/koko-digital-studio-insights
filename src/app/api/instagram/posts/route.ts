import { NextResponse } from 'next/server';
import { fetchInstagramPublicProfile } from '@/lib/api/instagramScraper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username =
      searchParams.get('username') || searchParams.get('handle') || '';
    const pageId = searchParams.get('pageId') || '';
    const pageName = searchParams.get('pageName') || '';

    if (!username && !pageId && !pageName) {
      return NextResponse.json(
        { success: false, error: 'Username or pageId is required', posts: [] },
        { status: 400 }
      );
    }

    const result = await fetchInstagramPublicProfile(username, pageId, pageName);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API /api/instagram/posts error:', error);
    return NextResponse.json({ success: false, posts: [] }, { status: 500 });
  }
}
