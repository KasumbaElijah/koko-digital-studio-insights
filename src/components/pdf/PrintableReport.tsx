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

  const topOverallPosts = getTopPerformingPosts(safeReport.posts || [], 3);
  const igTopPosts = getTopPerformingPostsByPlatform(safeReport.posts || [], 'instagram', 3);
  const ttTopPosts = getTopPerformingPostsByPlatform(safeReport.posts || [], 'tiktok', 3);
  const hasBothTopPlatforms = igTopPosts.length > 0 && ttTopPosts.length > 0;

  const renderPhoneCard = (post: any, idx: number, isCompact = false) => {
    const isInstagram = String(post?.platform || '').toLowerCase() === 'instagram';
    const platformLabel = isInstagram ? 'INSTAGRAM' : 'TIKTOK';
    const videoTitle = `${platformLabel} #${idx + 1}`;
    const displayTitle = post?.caption || post?.title || 'Featured Content Post';
    const formattedViews = formatNumberShort(post?.viewsCount ?? 0);

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

    return (
      <div key={post?.id || idx} className="flex flex-col items-center">
        <div className={`mb-1.5 text-center font-bold tracking-wider text-gray-700 uppercase ${isCompact ? 'text-[9px]' : 'text-xs'}`}>
          {videoTitle}
        </div>

        {/* Modern Media Card (No Phone Frame) */}
        <div
          className={`relative rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg border border-gray-200 ${
            isCompact ? 'w-36 h-56' : 'w-44 h-72'
          }`}
          style={{ backgroundColor: '#09090b', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
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
          ) : null}

          {/* Vignette Gradients */}
          <div
            className="absolute inset-x-0 top-0 h-16 pointer-events-none z-10"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-28 pointer-events-none z-10"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          />

          {/* Top Bar: Handle & Rank */}
          <div className="relative z-20 p-2 flex items-center justify-between text-white">
            <div className="flex items-center gap-1 min-w-0">
              <span
                className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded text-white tracking-wider"
                style={{
                  backgroundColor: isInstagram ? '#e1306c' : '#000000',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                {isInstagram ? 'IG Reel' : 'TikTok'}
              </span>
              <span className="text-[8px] font-bold text-white truncate max-w-[65px] drop-shadow-sm">
                @{creatorHandle}
              </span>
            </div>
            <span
              className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full text-white"
              style={{
                backgroundColor: 'rgba(0,0,0,0.6)',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              #{idx + 1}
            </span>
          </div>

          {/* Bottom Pinned Card (Matching Reference) */}
          <div className="relative z-20 m-1.5">
            <div
              className="rounded-xl p-1.5 shadow-md flex items-center gap-1.5"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              {/* Square Preview Thumbnail */}
              <div
                className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-gray-100 border border-gray-200"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                {post?.thumbnailUrl ? (
                  <img
                    src={getProxiedUrl(post.thumbnailUrl)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800" />
                )}
                <div
                  className="absolute top-0 left-0 text-white text-[6px] font-black px-0.5 rounded-br"
                  style={{
                    backgroundColor: '#000000',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  {idx + 1}
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-bold text-gray-900 truncate leading-tight">
                  {displayTitle}
                </p>
                <p className="text-[7px] font-extrabold text-[#fe2c55] uppercase mt-0.5">
                  Top Performer
                </p>
                <p className="text-[9px] font-black text-gray-950 leading-tight">
                  {formattedViews} Views
                </p>
              </div>

              {/* Red Pill CTA */}
              <div
                className="px-1.5 py-0.5 rounded text-white text-[7px] font-black shrink-0"
                style={{
                  backgroundColor: '#fe2c55',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                Watch
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Label Under Card */}
        <div className="mt-2 text-center">
          <p className={`font-black text-gray-900 leading-tight ${isCompact ? 'text-xs' : 'text-base'}`}>
            {formattedViews} Views
          </p>
          <p className="text-[8px] font-bold tracking-widest text-gray-500 uppercase mt-0.5">
            {platformLabel} • {post?.contentFormat || 'Videos'}
          </p>
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
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Instagram & TikTok
                  </span>
                </div>
                <FormatBarChart comparisonData={formatComparisonData} />
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
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Instagram
                      </span>
                      <div className="w-full h-48">
                        <DistributionPieChart data={igDistributionData} centerLabel="IG" />
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                        TikTok
                      </span>
                      <div className="w-full h-48">
                        <DistributionPieChart data={ttDistributionData} centerLabel="TT" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <DistributionPieChart data={distributionData} centerLabel="Posts" />
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
