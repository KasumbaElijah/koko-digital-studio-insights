import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import { INITIAL_REPORTS } from '@/lib/mockData';

export const dynamic = 'force-static';

export async function GET(request: Request) {
  try {
    let clientId = 'client-bulungi-town';
    try {
      const { searchParams } = new URL(request.url);
      clientId = searchParams.get('clientId') || clientId;
    } catch (e) {
      console.warn('URL parse warning on static export:', e);
    }

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

    const fallbackReport = INITIAL_REPORTS[clientId] || Object.values(INITIAL_REPORTS)[0];
    return NextResponse.json([fallbackReport]);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(Object.values(INITIAL_REPORTS));
  }
}
