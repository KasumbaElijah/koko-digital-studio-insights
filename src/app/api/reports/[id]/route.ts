import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const report = await prisma.monthlyReport.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        posts: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(serializeData(report));
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { goals, insights, nextSteps, startDate, endDate } = body;

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
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json({ error: 'Failed to update report strategy fields' }, { status: 500 });
  }
}
