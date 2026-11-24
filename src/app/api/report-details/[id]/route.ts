import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import { createEmptyReport } from '@/lib/mockData';
import {
  getServerReport,
  getServerReportById,
  saveServerReport,
} from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

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
      console.warn('Prisma DB query notice in report details, checking serverStore:', dbErr);
    }

    const serverRep = getServerReportById(params.id);
    if (serverRep) {
      return NextResponse.json(serverRep);
    }

    const fallbackClientId = params.id.startsWith('report-')
      ? params.id.slice('report-'.length)
      : '';
    return NextResponse.json(createEmptyReport(fallbackClientId));
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(createEmptyReport(''));
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      clientId: bodyClientId,
      goals,
      insights,
      nextSteps,
      startDate,
      endDate,
      posts,
    } = body;

    const inferredClientId =
      bodyClientId ||
      (params.id.startsWith('report-') ? params.id.slice('report-'.length) : '');

    // 1. Always update backend serverStore immediately
    const existingServerReport =
      getServerReportById(params.id) ||
      (inferredClientId ? getServerReport(inferredClientId) : null) ||
      createEmptyReport(inferredClientId);

    const mergedServerReport = {
      ...existingServerReport,
      id: params.id,
      clientId: inferredClientId || existingServerReport.clientId,
      ...(goals !== undefined ? { goals } : {}),
      ...(insights !== undefined ? { insights } : {}),
      ...(nextSteps !== undefined ? { nextSteps } : {}),
      ...(startDate !== undefined ? { startDate } : {}),
      ...(endDate !== undefined ? { endDate } : {}),
      ...(Array.isArray(posts) ? { posts } : {}),
    };

    if (mergedServerReport.clientId) {
      saveServerReport(mergedServerReport.clientId, mergedServerReport);
    }

    // 2. Persist in PostgreSQL via Prisma
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
              postId:
                p.postId ||
                `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              title: p.title || null,
              permalink: p.permalink || null,
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
      console.warn('DB update notice in report details (saved in backend serverStore):', dbErr);
      return NextResponse.json(mergedServerReport);
    }
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { error: 'Failed to update report strategy fields' },
      { status: 500 }
    );
  }
}
