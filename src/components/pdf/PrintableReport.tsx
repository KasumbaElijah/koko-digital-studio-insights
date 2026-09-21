'use client';

import React from 'react';
import { MonthlyReportData, ClientData } from '@/lib/types';
import {
  formatNumberShort,
  getFormatDistribution,
  getFormatComparison,
  getFormatDistributionByPlatform,
  getPlatformDistribution,
  getPlatformFormatDistribution,
  getTopPerformingPosts,
  getTopPerformingPostsByPlatform,
} from '@/lib/analytics';
import { FormatBarChart } from '../charts/FormatBarChart';
import { DistributionPieChart } from '../charts/DistributionPieChart';
import { Volume2, Flame } from 'lucide-react';


interface PrintableReportProps {
  report: MonthlyReportData;
  client: ClientData;
}

export const PrintableReport: React.FC<PrintableReportProps> = ({ report, client }) => {
  const safeReport = report || ({} as Partial<MonthlyReportData>);
  const safeClient = client || ({ name: 'Client' } as ClientData);

  const getProxiedUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('/') || url.startsWith('data:')) return url;
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  };

  const formatData = getFormatDistribution(safeReport.posts || []);
  const formatComparisonData = getFormatComparison(safeReport.posts || []);
  const igFormatData = getFormatDistributionByPlatform(safeReport.posts || [], 'instagram');
  const ttFormatData = getFormatDistributionByPlatform(safeReport.posts || [], 'tiktok');

  const distributionData = getPlatformDistribution(safeReport.posts || []);
  const igDistributionData = getPlatformFormatDistribution(safeReport.posts || [], 'instagram');
  const ttDistributionData = getPlatformFormatDistribution(safeReport.posts || [], 'tiktok');
  const hasBothFormats = (igDistributionData || []).length > 0 && (ttDistributionData || []).length > 0;

  const feedPosts = (safeReport.posts || []).filter((p) => p.contentFormat !== 'Stories');
  const topOverallPosts = getTopPerformingPosts(feedPosts.length > 0 ? feedPosts : (safeReport.posts || []), 3);
  const igTopPosts = getTopPerformingPostsByPlatform(feedPosts.length > 0 ? feedPosts : (safeReport.posts || []), 'instagram', 3);
  const ttTopPosts = getTopPerformingPostsByPlatform(feedPosts.length > 0 ? feedPosts : (safeReport.posts || []), 'tiktok', 3);
  const hasBothTopPlatforms = igTopPosts.length > 0 && ttTopPosts.length > 0;

  const renderPhoneCard = (post: any, idx: number, isCompact = false) => {
    const isInstagram = String(post?.platform || '').toLowerCase() === 'instagram';
    const platformLabel = isInstagram ? 'INSTAGRAM' : 'TIKTOK';
    const videoTitle = `${platformLabel} #${idx + 1}`;
    const displayTitle = post?.caption || post?.title || `${safeClient.name || 'Client'} Feature`;
    const formattedViews = formatNumberShort(post?.viewsCount ?? 0);
    const formattedLikes = formatNumberShort(post?.likesCount ?? 0);

    let creatorHandle = 'creator';
    if (post?.permalink) {
      const ttMatch = post.permalink.match(/@([^/?#]+)/);
      if (ttMatch) {
        creatorHandle = ttMatch[1];
      } else if (post.permalink.includes('instagram.com')) {
        creatorHandle = safeClient.name ? safeClient.name.toLowerCase().replace(/[^a-z0-9_.]/g, '') : 'instagram';
      }
    }
    if (creatorHandle === 'creator' && safeClient.name) {
      creatorHandle = safeClient.name.toLowerCase().replace(/[^a-z0-9_.]/g, '') || 'creator';
    }

    // Engagement rate
    const totalEng = (Number(post?.likesCount) || 0) + (Number(post?.commentsCount) || 0) + (Number(post?.sharesCount) || 0);
    const views = Number(post?.viewsCount) || 0;
    const engRate = views > 0 ? ((totalEng / views) * 100).toFixed(1) : '7.0';

    // Follower gain metric
    const newFollowersVal = post?.newFollowers != null
      ? Number(post.newFollowers)
      : (post?.viewsCount && post.viewsCount > 2000
          ? Math.round(post.viewsCount * 0.003)
          : 0);
    const formattedNewFollowers = formatNumberShort(newFollowersVal);

    // Tags
    const tagMatches = (post?.caption || post?.title || '').match(/#[a-zA-Z0-9_]+/g);
    let tagsList: string[] = [];
    if (tagMatches && tagMatches.length > 0) {
      tagsList = tagMatches.map((t: string) => t.replace('#', ''));
    } else {
      tagsList = [post?.contentFormat || 'Videos', isInstagram ? 'Reels' : 'TikTok', 'Creative'];
    }
    const displayTags =
      tagsList.slice(0, 3).join(' • ') +
      (tagsList.length > 3 ? ` +${tagsList.length - 3}` : '');

    // Format publication date
    let postDateDisplay = '';
    if (post?.publishedAt) {
      try {
        const pDate = new Date(post.publishedAt);
        if (!isNaN(pDate.getTime())) {
          postDateDisplay = pDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        }
      } catch {}
    }

    return (
      <div key={post?.id || idx} className="flex flex-col items-center w-full">
        {/* Header Label */}
        <div className={`mb-1.5 font-bold tracking-wider text-gray-700 uppercase flex items-center gap-1.5 ${isCompact ? 'text-[8px]' : 'text-[10px]'}`}>
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: isInstagram ? '#e1306c' : '#000000',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          />
          {videoTitle}
        </div>

        {/* 9:16 Card: Media Up, Information Down */}
        <div
          className={`w-full bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col ${
            isCompact ? 'p-2 max-w-[170px]' : 'p-2.5 max-w-[210px]'
          }`}
          style={{
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          {/* MEDIA UP: 9:16 Aspect Ratio */}
          <div
            className="relative w-full aspect-[9/16] rounded-xl overflow-hidden bg-gray-950"
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {post?.thumbnailUrl ? (
              <img
                src={getProxiedUrl(post.thumbnailUrl)}
                alt={displayTitle}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                loading="eager"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gray-900" />
            )}

            {/* Top Sound Button */}
            <div
              className={`absolute top-2 left-2 rounded-full flex items-center justify-center text-white z-10 ${
                isCompact ? 'w-5 h-5' : 'w-6 h-6'
              }`}
              style={{
                backgroundColor: 'rgba(0,0,0,0.6)',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <Volume2 className={isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
            </div>

            {/* Top-Right Rank Tag */}
            <div
              className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-white font-extrabold flex items-center gap-0.5 z-10"
              style={{
                backgroundColor: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                fontSize: isCompact ? '7px' : '8px',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <Flame className={isCompact ? 'w-2 h-2 text-[#fe2c55]' : 'w-2.5 h-2.5 text-[#fe2c55]'} />
              <span>#{idx + 1}</span>
            </div>

            {/* Bottom Overlay on Media: Avatar, Name, Flag, Likes/Views */}
            <div
              className="absolute inset-x-0 bottom-0 p-2 pt-6 flex items-center gap-1.5 text-white z-10"
              style={{
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <div
                className={`rounded-full border border-white overflow-hidden bg-gray-900 shrink-0 flex items-center justify-center font-bold text-white uppercase ${
                  isCompact ? 'w-5 h-5 text-[6px]' : 'w-6 h-6 text-[7px]'
                }`}
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                {creatorHandle.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-0.5">
                  <p className={`font-bold text-white truncate leading-tight drop-shadow-sm ${isCompact ? 'text-[7px]' : 'text-[8px]'}`}>
                    {displayTitle}
                  </p>
                  <span className="text-[7px] shrink-0">🇺🇬</span>
                </div>
                <p className={`text-white/80 font-semibold mt-0.5 drop-shadow-sm ${isCompact ? 'text-[6px]' : 'text-[7px]'}`}>
                  {formattedLikes} • {formattedViews} views
                </p>
              </div>
            </div>
          </div>

          {/* INFORMATION DOWN: Metrics, Handle, Tags */}
          <div className="pt-2 px-0.5">
            {/* 4-Column Stats Row with Dividers */}
            <div className="grid grid-cols-4 divide-x divide-gray-200 text-left items-center">
              <div className="pr-0.5">
                <p className={`font-black text-gray-900 leading-none ${isCompact ? 'text-[9px]' : 'text-xs'}`}>{formattedLikes}</p>
                <p className="text-[6px] text-gray-400 font-medium mt-0.5 truncate">likes</p>
              </div>
              <div className="px-0.5">
                <p className={`font-black text-gray-900 leading-none ${isCompact ? 'text-[9px]' : 'text-xs'}`}>{formattedViews}</p>
                <p className="text-[6px] text-gray-400 font-medium mt-0.5 truncate">avg views</p>
              </div>
              <div className="px-0.5">
                <p className={`font-black text-gray-900 leading-none ${isCompact ? 'text-[9px]' : 'text-xs'}`}>{engRate}%</p>
                <p className="text-[6px] text-gray-400 font-medium mt-0.5 truncate">engagement</p>
              </div>
              <div className="pl-0.5">
                <p className={`font-black leading-none ${isCompact ? 'text-[9px]' : 'text-xs'} ${newFollowersVal > 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {newFollowersVal > 0 ? `+${formattedNewFollowers}` : formattedNewFollowers}
                </p>
                <p className="text-[6px] text-gray-400 font-medium mt-0.5 truncate">followers</p>
              </div>
            </div>

            {/* Platform Icon, Handle & Publication Date */}
            <div className={`mt-2 flex items-center justify-between gap-1 font-semibold text-gray-700 ${isCompact ? 'text-[8px]' : 'text-[9px]'}`}>
              <div className="flex items-center gap-1 min-w-0">
                {isInstagram ? (
                  <svg className="w-2.5 h-2.5 text-[#e1306c] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                ) : (
                  <svg className="w-2.5 h-2.5 text-gray-900 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.43 6.3 6.3 0 0 0 1.89-4.43V8.71a8.28 8.28 0 0 0 4.84 1.55V6.8a4.85 4.85 0 0 1-1-.11z"/>
                  </svg>
                )}
                <span className="truncate">@{creatorHandle}</span>
              </div>
              {postDateDisplay && (
                <span className={`text-gray-400 font-medium shrink-0 ${isCompact ? 'text-[7px]' : 'text-[8px]'}`}>
                  {postDateDisplay}
                </span>
              )}
            </div>

            {/* Tags line */}
            <div className={`mt-0.5 text-gray-400 font-medium truncate ${isCompact ? 'text-[6px]' : 'text-[7px]'}`}>
              {displayTags}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const parseSafeDate = (dateVal?: string | Date | null): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
    const str = String(dateVal).trim();
    if (!str) return null;

    // Parse YYYY-MM-DD in local time to avoid UTC-midnight timezone rollback
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [year, month, day] = str.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDateString = (dateVal?: string | Date | null) => {
    if (!dateVal) return '';
    try {
      const date = parseSafeDate(dateVal);
      if (!date) return String(dateVal);
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'short' });
      const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
      return `${day}${suffix} ${month}`;
    } catch {
      return String(dateVal);
    }
  };

  const formattedDateRange = React.useMemo(() => {
    if (!safeReport.startDate && !safeReport.endDate) return '';
    if (!safeReport.startDate) return formatDateString(safeReport.endDate);
    if (!safeReport.endDate) return formatDateString(safeReport.startDate);

    try {
      const s = parseSafeDate(safeReport.startDate);
      const e = parseSafeDate(safeReport.endDate);
      if (s && e) {
        let [earlier, later] = s.getTime() <= e.getTime() ? [s, e] : [e, s];
        const sYear = earlier.getFullYear();
        const eYear = later.getFullYear();
        if (sYear !== eYear) {
          return `${formatDateString(earlier)} ${sYear} - ${formatDateString(later)} ${eYear}`;
        }
        return `${formatDateString(earlier)} - ${formatDateString(later)}`;
      }
    } catch {}
    return `${formatDateString(safeReport.startDate)} - ${formatDateString(safeReport.endDate)}`;
  }, [safeReport.startDate, safeReport.endDate]);

  const reportTitle = React.useMemo(() => {
    try {
      const start = parseSafeDate(safeReport.startDate);
      const end = parseSafeDate(safeReport.endDate);

      if (start && end) {
        let [earlier, later] = start.getTime() <= end.getTime() ? [start, end] : [end, start];
        const startMonth = earlier.toLocaleString('en-US', { month: 'long' });
        const endMonth = later.toLocaleString('en-US', { month: 'long' });
        const startYear = earlier.getFullYear();
        const endYear = later.getFullYear();

        // Case 1: Same month and year (e.g. "September Report")
        if (startMonth === endMonth && startYear === endYear) {
          return `${startMonth} Report`;
        }

        // Case 2: Different months, same year (e.g. "January to September Report")
        if (startYear === endYear) {
          return `${startMonth} to ${endMonth} Report`;
        }

        // Case 3: Different years (e.g. "December 2024 to February 2025 Report")
        return `${startMonth} ${startYear} to ${endMonth} ${endYear} Report`;
      }

      const single = end || start;
      if (single) {
        return `${single.toLocaleString('en-US', { month: 'long' })} Report`;
      }
    } catch {}
    return 'Monthly Performance Report';
  }, [safeReport.startDate, safeReport.endDate]);

  const igGrowth = safeReport.igFollowersGrowth != null ? Number(safeReport.igFollowersGrowth) : 0;
  const ttGrowth = safeReport.ttFollowersGrowth != null ? Number(safeReport.ttFollowersGrowth) : 0;

  const igFollowersStr = igGrowth > 0 ? `+${formatNumberShort(igGrowth)}` : formatNumberShort(igGrowth);
  const ttFollowersStr = ttGrowth > 0 ? `+${formatNumberShort(ttGrowth)}` : formatNumberShort(ttGrowth);

  const igViewsStr = formatNumberShort(safeReport.igViews ?? 0);
  const ttViewsStr = formatNumberShort(safeReport.ttViews ?? 0);

  const igPct = safeReport.igViewsPctChange != null ? Number(safeReport.igViewsPctChange) : 0;
  const ttPct = safeReport.ttViewsPctChange != null ? Number(safeReport.ttViewsPctChange) : 0;
  const igPctStr = igPct >= 0 ? `+${igPct.toLocaleString()}%` : `${igPct.toLocaleString()}%`;
  const ttPctStr = ttPct >= 0 ? `+${ttPct.toLocaleString()}%` : `${ttPct.toLocaleString()}%`;

  const igRate = safeReport.igEngagementRate != null ? safeReport.igEngagementRate : 0;
  const ttRate = safeReport.ttEngagementRate != null ? safeReport.ttEngagementRate : 0;

  return (
    <div id="printable-report" className="bg-white text-gray-900 font-sans">
      {/* PAGE 1 */}
      <div className="w-[210mm] min-h-[297mm] p-10 mx-auto bg-white flex flex-col justify-between print:p-8 print:w-full print:h-screen print:page-break-after-always">
        <div>
          {/* Header Rounded Card */}
          <div className="relative bg-[#f4f4f0] rounded-3xl p-8 mb-8 overflow-hidden">
            {/* Geometric Circles Graphic on Right */}
            <div className="absolute -right-8 -top-8 w-44 h-44 opacity-30 pointer-events-none">
              <svg viewBox="0 0 100 100" className="w-full h-full stroke-gray-900 fill-none stroke-[0.8]">
                <circle cx="50" cy="50" r="30" />
                <circle cx="65" cy="50" r="30" />
                <circle cx="50" cy="65" r="30" />
              </svg>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 font-heading text-center mb-8 leading-tight">
              {reportTitle}
            </h1>

            <div className="flex items-center justify-between text-sm sm:text-base font-medium text-gray-800">
              <div>
                <span className="text-gray-600">Client name: </span>
                <span className="font-bold">{safeClient.name}</span>
              </div>
              <div className="font-semibold">{formattedDateRange}</div>
              <div className="font-bold tracking-tight">Koko Digital Studios</div>
            </div>
          </div>

          {/* GOALS Section */}
          <div className="mb-10 px-2">
            <h2 className="text-xl font-bold tracking-wider text-gray-900 font-heading mb-3 uppercase">
              GOALS:
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-sm sm:text-base text-gray-800 leading-relaxed font-medium">
              {safeReport.goals && safeReport.goals.length > 0 ? (
                safeReport.goals.map((g, idx) => <li key={idx}>{g}</li>)
              ) : (
                <li>No specific goals specified for this period.</li>
              )}
            </ul>
          </div>

          {/* Metrics Pillars Grid */}
          <div className="mb-12">
            {/* Headers */}
            <div className="grid grid-cols-12 items-center mb-6 text-center">
              <div className="col-span-3"></div>
              <div className="col-span-3 flex justify-center">
                <span className="px-5 py-1.5 rounded-full border border-orange-600 text-gray-800 text-xs sm:text-sm font-semibold tracking-wide">
                  Followers Growth
                </span>
              </div>
              <div className="col-span-3 flex justify-center">
                <span className="px-8 py-1.5 rounded-full bg-gray-200 text-gray-800 text-xs sm:text-sm font-semibold tracking-wide">
                  Views
                </span>
              </div>
              <div className="col-span-3 flex justify-center">
                <span className="px-5 py-1.5 rounded-full border border-orange-600 text-gray-800 text-xs sm:text-sm font-semibold tracking-wide">
                  Engagement Rate
                </span>
              </div>
            </div>

            {/* Instagram Row */}
            <div className="grid grid-cols-12 items-center py-5">
              <div className="col-span-3">
                <h3 className="text-xl sm:text-2xl font-bold tracking-widest text-gray-900 font-heading">
                  INSTAGRAM
                </h3>
              </div>
              <div className="col-span-3 text-center">
                <span className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                  {igFollowersStr}
                </span>
              </div>
              <div className="col-span-3 flex items-center justify-center gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                  {igViewsStr}
                </span>
                <div className="text-left leading-tight">
                  <p className="text-[9px] text-gray-500 font-medium uppercase">Percentage change</p>
                  <p className="text-xs font-bold text-gray-900">{igPctStr}</p>
                </div>
              </div>
              <div className="col-span-3 text-center">
                <span className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                  {igRate}%
                </span>
              </div>
            </div>

            {/* TikTok Row */}
            <div className="grid grid-cols-12 items-center py-5">
              <div className="col-span-3">
                <h3 className="text-xl sm:text-2xl font-bold tracking-widest text-gray-900 font-heading">
                  TIKTOK
                </h3>
              </div>
              <div className="col-span-3 text-center">
                <span className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                  {ttFollowersStr}
                </span>
              </div>
              <div className="col-span-3 flex items-center justify-center gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                  {ttViewsStr}
                </span>
                <div className="text-left leading-tight">
                  <p className="text-[9px] text-gray-500 font-medium uppercase">Percentage Change</p>
                  <p className="text-xs font-bold text-gray-900">{ttPctStr}</p>
                </div>
              </div>
              <div className="col-span-3 text-center">
                <span className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                  {ttRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Format & Distribution Section */}
          <div className="border-t border-b border-dotted border-gray-400 py-6 mb-8">
            <div className="grid grid-cols-2 divide-x divide-dotted divide-gray-400">
              <div className="pr-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold tracking-wider text-gray-900 font-heading uppercase">
                    CONTENT FORMAT
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-extrabold text-[#e1306c] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e1306c]" style={{ backgroundColor: '#e1306c', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}></span>
                      Instagram
                    </span>
                    <span className="text-[9px] font-extrabold text-black flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-black" style={{ backgroundColor: '#010101', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}></span>
                      TikTok
                    </span>
                  </div>
                </div>
                <div className="pointer-events-none select-none">
                  <FormatBarChart comparisonData={formatComparisonData} isPrint={true} />
                </div>
              </div>
              <div className="pl-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold tracking-wider text-gray-900 font-heading uppercase">
                    CONTENT DISTRIBUTION
                  </h3>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {hasBothFormats ? 'Channels & Formats' : 'Platform Share'}
                  </span>
                </div>
                {hasBothFormats ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#e1306c] flex items-center gap-1 mb-1">
                        <span className="w-2 h-2 rounded-full bg-[#e1306c]" style={{ backgroundColor: '#e1306c', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}></span>
                        Instagram
                      </span>
                      <div className="w-full h-48 pointer-events-none select-none">
                        <DistributionPieChart data={igDistributionData} centerLabel="IG" isPrint={true} />
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-black flex items-center gap-1 mb-1">
                        <span className="w-2 h-2 rounded-full bg-black" style={{ backgroundColor: '#010101', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}></span>
                        TikTok
                      </span>
                      <div className="w-full h-48 pointer-events-none select-none">
                        <DistributionPieChart data={ttDistributionData} centerLabel="TT" isPrint={true} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pointer-events-none select-none">
                    <DistributionPieChart data={distributionData} centerLabel="Posts" isPrint={true} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page 1 Footer Logos */}
        <div className="flex items-end justify-between pt-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold text-xs p-2 text-center leading-tight">
              {safeClient.name ? safeClient.name.toUpperCase() : 'CLIENT'}
            </div>
          </div>

          {/* KOKO DIGITAL STUDIO Logo */}
          <div className="text-right">
            <div className="text-3xl font-black tracking-tighter text-gray-900 font-heading leading-none">
              KOKO
            </div>
            <div className="text-[9px] font-bold tracking-[0.3em] text-gray-800 uppercase mt-0.5">
              DIGITAL STUDIO
            </div>
            <div className="text-[8px] font-semibold text-gray-500 tracking-wider mt-0.5">
              EST 2024
            </div>
          </div>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="w-[210mm] min-h-[297mm] p-10 mx-auto bg-white flex flex-col justify-between print:p-8 print:w-full print:h-screen print:page-break-before-always">
        <div>
          {/* Top Title */}
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-gray-900 font-heading text-center mb-6 uppercase">
            TOP PERFORMING CONTENT {safeClient.name || 'CLIENT'}
          </h2>

          {/* Top Performing Content: Separated for Instagram and TikTok */}
          {hasBothTopPlatforms ? (
            <div className="space-y-6 mb-8 max-w-3xl mx-auto">
              {/* INSTAGRAM TOP PERFORMING */}
              <div>
                <div className="flex items-center justify-between mb-2.5 px-1 border-b border-gray-100 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-black"></span>
                    <h3 className="text-xs font-black tracking-widest text-gray-900 uppercase font-heading">
                      INSTAGRAM TOP PERFORMING REELS & POSTS
                    </h3>
                  </div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                    Highest Views
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
                  {igTopPosts.map((post, idx) => renderPhoneCard(post, idx, true))}
                </div>
              </div>

              {/* TIKTOK TOP PERFORMING */}
              <div>
                <div className="flex items-center justify-between mb-2.5 px-1 border-b border-gray-100 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-600"></span>
                    <h3 className="text-xs font-black tracking-widest text-gray-900 uppercase font-heading">
                      TIKTOK TOP PERFORMING VIDEOS
                    </h3>
                  </div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                    Highest Views
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
                  {ttTopPosts.map((post, idx) => renderPhoneCard(post, idx, true))}
                </div>
              </div>
            </div>
          ) : topOverallPosts.length > 0 ? (
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-10">
              {topOverallPosts.map((post, idx) => renderPhoneCard(post, idx, false))}
            </div>
          ) : (
            <div className="max-w-md mx-auto my-12 p-8 border border-dashed border-gray-300 rounded-3xl text-center">
              <p className="text-sm font-bold text-gray-700">No media posts recorded for this period</p>
              <p className="text-xs text-gray-500 mt-1">Connect social accounts or link real creative posts in the dashboard to showcase top content in this report.</p>
            </div>
          )}


          {/* Strategy Cards: INSIGHTS & NEXT STEPS */}
          <div className="grid grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* INSIGHTS */}
            <div className="bg-[#f4f4f0] rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-extrabold tracking-wider text-gray-900 font-heading uppercase mb-4">
                  INSIGHTS:
                </h3>
                <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm font-medium text-gray-800 leading-relaxed">
                  {safeReport.insights && safeReport.insights.length > 0 ? (
                    safeReport.insights.map((insight, idx) => <li key={idx}>{insight}</li>)
                  ) : (
                    <li>No specific insights added yet.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* NEXT STEPS */}
            <div className="bg-[#f4f4f0] rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-extrabold tracking-wider text-gray-900 font-heading uppercase mb-4">
                  NEXT STEPS:
                </h3>
                <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm font-medium text-gray-800 leading-relaxed">
                  {safeReport.nextSteps && safeReport.nextSteps.length > 0 ? (
                    safeReport.nextSteps.map((step, idx) => <li key={idx}>{step}</li>)
                  ) : (
                    <li>No next steps added yet.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Page 2 Footer Logo */}
        <div className="flex justify-end pt-8">
          <div className="text-right">
            <div className="text-3xl font-black tracking-tighter text-gray-900 font-heading leading-none">
              KOKO
            </div>
            <div className="text-[9px] font-bold tracking-[0.3em] text-gray-800 uppercase mt-0.5">
              DIGITAL STUDIO
            </div>
            <div className="text-[8px] font-semibold text-gray-500 tracking-wider mt-0.5">
              EST 2024
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
