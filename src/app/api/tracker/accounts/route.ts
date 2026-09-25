import { NextResponse } from 'next/server';
import {
  getTrackerAccounts,
  saveTrackerAccount,
  deleteTrackerAccount,
  TrackerAccountConfig,
} from '@/lib/trackerStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const accounts = getTrackerAccounts();
    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      pod,
      platform,
      tiktokHandle,
      instagramHandle,
      targetVideos,
      targetGraphics,
      expectedAvgViews,
      notes,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Account name is required' }, { status: 400 });
    }

    const newAccount: TrackerAccountConfig = {
      id: id || `acc_${Date.now()}`,
      name: name.trim(),
      pod: pod || 'Alpha',
      platform: platform || 'tiktok',
      tiktokHandle: tiktokHandle || undefined,
      instagramHandle: instagramHandle || undefined,
      targetVideos: Number(targetVideos) || 10,
      targetGraphics: Number(targetGraphics) || 5,
      expectedAvgViews: Number(expectedAvgViews) || 10000,
      notes: notes || undefined,
    };

    saveTrackerAccount(newAccount);
    return NextResponse.json({ success: true, account: newAccount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }
    deleteTrackerAccount(id);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
