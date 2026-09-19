import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import { createEmptyReport } from '@/lib/mockData';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    let clientId = '';
    let startDateParam = '';
    let endDateParam = '';
    try {
      const { searchParams } = new URL(request.url);
      clientId = searchParams.get('clientId') || '';
      startDateParam = searchParams.get('startDate') || '';
      endDateParam = searchParams.get('endDate') || '';
    } catch (e) {
      console.warn('URL parse warning on static export:', e);
    }

    if (clientId) {
      try {
        const reports = await prisma.monthlyReport.findMany({
          where: { clientId },
          include: {
            client: true,
            posts: true,
          },
          orderBy: { startDate: 'desc' },
        });

        if (reports.length > 0) {
          return NextResponse.json(serializeData(reports));
        }
      } catch (dbErr) {
        console.warn('Prisma DB query reports error, returning fallback:', dbErr);
      }
    }

    const fallbackReport = {
      ...createEmptyReport(clientId),
      ...(startDateParam ? { startDate: startDateParam } : {}),
      ...(endDateParam ? { endDate: endDateParam } : {}),
    };
    return NextResponse.json([fallbackReport]);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json([createEmptyReport('')]);
  }
}
