export interface ClientData {
  id: string;
  name: string;
  logoUrl?: string | null;
  createdAt?: string;
  socialAccounts?: SocialAccountData[];
  reports?: MonthlyReportData[];
}

export interface SocialAccountData {
  id: string;
  clientId: string;
  platform: 'instagram' | 'tiktok';
  platformAccountId: string;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
}

export interface ContentPostData {
  id: string;
  reportId?: string;
  platform: 'instagram' | 'tiktok';
  postId: string;
  contentFormat: 'Image' | 'Videos' | 'Graphic' | 'Stories';
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  thumbnailUrl?: string | null;
  isTopPerformer: boolean;
  publishedAt: string;
}

export interface MonthlyReportData {
  id: string;
  clientId: string;
  client?: ClientData;
  startDate: string;
  endDate: string;
  goals: string[];
  insights: string[];
  nextSteps: string[];
  igFollowersGrowth: number;
  igViews: number | bigint;
  igViewsPctChange: number;
  igEngagementRate: number;
  ttFollowersGrowth: number;
  ttViews: number | bigint;
  ttViewsPctChange: number;
  ttEngagementRate: number;
  posts: ContentPostData[];
  createdAt?: string;
}

export interface FormatCount {
  format: 'Image' | 'Videos' | 'Graphic' | 'Stories';
  count: number;
}

export interface DistributionCount {
  platform: 'Instagram' | 'TikTok';
  count: number;
}
