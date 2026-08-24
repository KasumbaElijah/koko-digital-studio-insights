import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import { INITIAL_REPORTS } from '@/lib/mockData';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  try {
    const report = await prisma.monthlyReport.findFirst({
      where: { clientId },
      include: {
        client: true,
        posts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (report) {
      return NextResponse.json(serializeData(report));
    }

    // Fallback to mock data if not found in database
    const mockReport = INITIAL_REPORTS[clientId] || INITIAL_REPORTS['client-bulungi-town'];
    return NextResponse.json(mockReport);
  } catch (error) {
    console.warn('Prisma DB query failed, falling back to mock report:', error);
    const mockReport = INITIAL_REPORTS[clientId] || INITIAL_REPORTS['client-bulungi-town'];
    return NextResponse.json(mockReport);
  }
}
