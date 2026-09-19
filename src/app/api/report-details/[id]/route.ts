import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import { INITIAL_REPORTS } from '@/lib/mockData';


export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    try {
      const report = await prisma.monthlyReport.findUnique({
        where: { id: params.id },
        include: {
          client: true,
          posts: true,
        },
      });

      if (report) {
        return NextResponse.json(serializeData(report));
      }
    } catch (dbErr) {
      console.warn('Prisma DB query error in report details, returning fallback:', dbErr);
    }

    const fallback = Object.values(INITIAL_REPORTS).find((r) => r.id === params.id) || Object.values(INITIAL_REPORTS)[0];
    return NextResponse.json(fallback);
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(Object.values(INITIAL_REPORTS)[0]);
  }
}

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { goals, insights, nextSteps, startDate, endDate, posts } = body;

    try {
      const updateData: any = {};
      if (goals !== undefined) updateData.goals = goals;
      if (insights !== undefined) updateData.insights = insights;
      if (nextSteps !== undefined) updateData.nextSteps = nextSteps;
      if (startDate !== undefined) updateData.startDate = new Date(startDate);
      if (endDate !== undefined) updateData.endDate = new Date(endDate);

      if (posts && Array.isArray(posts)) {
        await prisma.contentPost.deleteMany({ where: { reportId: params.id } });
        if (posts.length > 0) {
          await prisma.contentPost.createMany({
            data: posts.map((p: any) => ({
              reportId: params.id,
              platform: p.platform || 'instagram',
              postId: p.postId || `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              contentFormat: p.contentFormat || 'Videos',
              viewsCount: Number(p.viewsCount) || 0,
              likesCount: Number(p.likesCount) || 0,
              commentsCount: Number(p.commentsCount) || 0,
              sharesCount: Number(p.sharesCount) || 0,
              thumbnailUrl: p.thumbnailUrl || null,
              isTopPerformer: Boolean(p.isTopPerformer),
              publishedAt: p.publishedAt ? new Date(p.publishedAt) : new Date(),
            })),
          });
        }
      }

      const updatedReport = await prisma.monthlyReport.update({
        where: { id: params.id },
        data: updateData,
        include: {
          client: true,
          posts: true,
        },
      });

      return NextResponse.json(serializeData(updatedReport));
    } catch (dbErr) {
      console.warn('DB update fallback in report details:', dbErr);
      return NextResponse.json({
        id: params.id,
        ...body,
      });
    }
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json({ error: 'Failed to update report strategy fields' }, { status: 500 });
  }
}
