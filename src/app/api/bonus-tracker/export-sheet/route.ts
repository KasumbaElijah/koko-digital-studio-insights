import { NextResponse } from 'next/server';
import { pushBonusVideosToSheet, BonusSheetVideoPayload } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month, videos, sheetId, tabName } = body;

    if (!month || !String(month).trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Target month or period label is required (e.g. "November 2026")',
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tracked 50K+ bonus videos provided to sync to Google Sheets',
        },
        { status: 400 }
      );
    }

    const result = await pushBonusVideosToSheet(
      String(month).trim(),
      videos as BonusSheetVideoPayload[],
      sheetId,
      tabName
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in /api/bonus-tracker/export-sheet:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'EXPORT_FAILED',
        message: error.message || 'Failed to sync Bonus Tracker videos to Google Sheets',
      },
      { status: 500 }
    );
  }
}
