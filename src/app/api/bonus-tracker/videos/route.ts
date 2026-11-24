import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import {
  getServerBonusTrackedVideos,
  saveServerBonusTrackedVideos,
} from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    try {
      const dbVideos = await prisma.bonusTrackedVideo.findMany({
        orderBy: { viewsCount: 'desc' },
      });
      if (dbVideos && dbVideos.length > 0) {
        const formatted = serializeData(dbVideos).map((v: any) => ({
          ...v,
          contentFormat: 'Videos',
          isTopPerformer: true,
        }));
        saveServerBonusTrackedVideos(formatted);
        return NextResponse.json({ success: true, videos: formatted });
      }
    } catch {
      // Fallback to serverStore
    }

    const serverVideos = getServerBonusTrackedVideos();
    return NextResponse.json({ success: true, videos: serverVideos });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, videos: [], error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawVideos: any[] = Array.isArray(body.videos) ? body.videos : [];
    const qualifying = rawVideos.filter((v) => (Number(v?.viewsCount) || 0) >= 50000);

    saveServerBonusTrackedVideos(qualifying);

    try {
      await prisma.bonusTrackedVideo.deleteMany({});
      if (qualifying.length > 0) {
        await prisma.bonusTrackedVideo.createMany({
          data: qualifying.map((v: any) => ({
            id: String(v.id || v.postId || `bonus_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
            platform: String(v.platform || 'instagram'),
            postId: String(v.postId || v.id || ''),
            title: v.title || null,
            permalink: v.permalink || null,
            thumbnailUrl: v.thumbnailUrl || null,
            viewsCount: Number(v.viewsCount) || 0,
            likesCount: Number(v.likesCount) || 0,
            commentsCount: Number(v.commentsCount) || 0,
            sharesCount: Number(v.sharesCount) || 0,
            accountKey: String(v.accountKey || ''),
            accountHandle: String(v.accountHandle || ''),
            accountDisplayName: String(v.accountDisplayName || ''),
            publishedAt: v.publishedAt ? new Date(v.publishedAt) : new Date(),
          })),
        });
      }
    } catch {
      // Saved in backend serverStore
    }

    return NextResponse.json({
      success: true,
      count: qualifying.length,
      videos: qualifying,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save bonus tracked videos' },
      { status: 500 }
    );
  }
}
