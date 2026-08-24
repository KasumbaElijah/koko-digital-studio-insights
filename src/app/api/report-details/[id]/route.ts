import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import { INITIAL_REPORTS } from '@/lib/mockData';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [
    { id: 'report-bulungi-june' },
    { id: 'report-safi-june' },
  ];
}

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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { goals, insights, nextSteps, startDate, endDate } = body;

    try {
      const updateData: any = {};
      if (goals !== undefined) updateData.goals = goals;
      if (insights !== undefined) updateData.insights = insights;
      if (nextSteps !== undefined) updateData.nextSteps = nextSteps;
      if (startDate !== undefined) updateData.startDate = new Date(startDate);
      if (endDate !== undefined) updateData.endDate = new Date(endDate);

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
      const fallback = Object.values(INITIAL_REPORTS).find((r) => r.id === params.id) || Object.values(INITIAL_REPORTS)[0];
      return NextResponse.json(fallback);
    }
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json({ error: 'Failed to update report strategy fields' }, { status: 500 });
  }
}
