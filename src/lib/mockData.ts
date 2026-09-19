import { MonthlyReportData, ClientData } from './types';

export const INITIAL_CLIENTS: ClientData[] = [];

export const EMPTY_REPORT: MonthlyReportData = {
  id: 'report-empty-state',
  clientId: '',
  startDate: '2026-06-11',
  endDate: '2026-07-10',
  goals: [
    'Connect Instagram Business or TikTok account in Settings to start tracking strategy goals.',
  ],
  insights: [
    'No live analytics synced yet. Connect social channels in Settings to generate automatic AI insights.',
  ],
  nextSteps: [
    'Execute 1-Click Agency Login in Settings to authorize Instagram or TikTok accounts.',
  ],
  igFollowersGrowth: 0,
  igViews: 0,
  igViewsPctChange: 0,
  igEngagementRate: 0,
  ttFollowersGrowth: 0,
  ttViews: 0,
  ttViewsPctChange: 0,
  ttEngagementRate: 0,
  posts: [],
};

export const INITIAL_REPORTS: Record<string, MonthlyReportData> = {};

export function createEmptyReport(clientId: string = ''): MonthlyReportData {
  return {
    ...EMPTY_REPORT,
    id: clientId ? `report-${clientId}` : 'report-empty-state',
    clientId,
  };
}

export const MOCK_FORMAT_COUNTS = [
  { name: 'Image', value: 0 },
  { name: 'Videos', value: 0 },
  { name: 'Graphic', value: 0 },
  { name: 'Stories', value: 0 },
];

export const MOCK_TOP_POSTS = [];
