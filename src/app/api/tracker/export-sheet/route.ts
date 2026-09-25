import { NextResponse } from 'next/server';
import { pushTrackerResultsToSheet } from '@/lib/googleSheets';
import { TrackerCalculationResult } from '@/lib/trackerStore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month, data, sheetId } = body;

    if (!month || !month.trim()) {
      return NextResponse.json(
        { success: false, error: 'Target month parameter is required (e.g. "October 2026")' },
        { status: 400 }
      );
    }

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No calculated account metrics provided to export' },
        { status: 400 }
      );
    }

    const result = await pushTrackerResultsToSheet(
      month.trim(),
      data as TrackerCalculationResult[],
      sheetId
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in /api/tracker/export-sheet:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'EXPORT_FAILED',
        message: error.message || 'Failed to export to Google Sheets',
      },
      { status: 500 }
    );
  }
}
