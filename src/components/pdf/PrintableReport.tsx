'use client';

import React from 'react';
import { MonthlyReportData, ClientData } from '@/lib/types';
import { formatNumberShort, getFormatDistribution, getPlatformDistribution, getTopPerformingPosts } from '@/lib/analytics';
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
  const distributionData = getPlatformDistribution(safeReport.posts || []);
  const topPosts = getTopPerformingPosts(safeReport.posts || [], 3);

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
                <h3 className="text-sm font-bold tracking-wider text-gray-900 font-heading uppercase mb-4">
                  CONTENT FORMAT
                </h3>
                <FormatBarChart data={formatData} />
              </div>
              <div className="pl-6">
                <h3 className="text-sm font-bold tracking-wider text-gray-900 font-heading uppercase mb-4">
                  CONTENT DISTRIBUTION
                </h3>
                <DistributionPieChart data={distributionData} />
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
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-gray-900 font-heading text-center mb-10 uppercase">
            TOP PERFORMING CONTENT {safeClient.name || 'CLIENT'}
          </h2>

          {/* Top 3 Videos Smartphone Grid */}
          {topPosts.length === 0 ? (
            <div className="max-w-md mx-auto my-12 p-8 border border-dashed border-gray-300 rounded-3xl text-center">
              <p className="text-sm font-bold text-gray-700">No media posts recorded for this period</p>
              <p className="text-xs text-gray-500 mt-1">Connect social accounts or link real creative posts in the dashboard to showcase top content in this report.</p>
            </div>
          ) : (
            <div className={`grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-12`}>
              {topPosts.map((post, idx) => (
                <div key={post?.id || idx} className="flex flex-col items-center">
                  <div className="mb-2 text-xs font-bold tracking-wider text-gray-700 uppercase">
                    {idx === 0 ? 'VIDEO #1' : idx === 1 ? 'VIDEO #2' : 'VIDEO #3'}
                  </div>

                  <div 
                    className="relative w-44 h-72 rounded-[32px] p-2 border-4 border-gray-800 shadow-xl overflow-hidden flex flex-col justify-between"
                    style={{ backgroundColor: '#000000', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                  >
                    <div 
                      className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 rounded-full z-20"
                      style={{ backgroundColor: '#000000', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                    />

                    <div 
                      className="relative w-full h-full rounded-[24px] overflow-hidden"
                      style={{ backgroundColor: '#111827', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                    >
                      {post?.thumbnailUrl ? (
                        <img 
                          src={getProxiedUrl(post.thumbnailUrl)} 
                          alt={post?.title || 'Video Content'} 
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          loading="eager"
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : null}

                      {/* Content Overlay & Fallback */}
                      <div 
                        className="absolute inset-0 flex flex-col justify-between p-3.5 z-10"
                        style={{
                          background: post?.thumbnailUrl 
                            ? 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.75) 100%)'
                            : post?.platform === 'tiktok'
                            ? 'linear-gradient(135deg, #010101 0%, #161823 50%, #fe2c55 120%)'
                            : 'linear-gradient(135deg, #405de6 0%, #5851db 30%, #833ab4 60%, #c13584 85%, #e1306c 100%)',
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span 
                            className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full text-white tracking-wider"
                            style={{ backgroundColor: 'rgba(0,0,0,0.6)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                          >
                            {post?.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
                          </span>
                          <span className="text-[9px] text-white/90 font-bold drop-shadow-sm">
                            {post?.contentFormat || 'Video'}
                          </span>
                        </div>

                        <div className="mt-auto text-left">
                          <p className="text-white text-[11px] font-bold line-clamp-2 leading-tight drop-shadow-md">
                            {post?.caption || post?.title || 'Featured Content Post'}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between text-[9px] text-white/90 font-semibold border-t border-white/20 pt-1">
                            <span>{formatNumberShort(post?.viewsCount ?? 0)} views</span>
                            <span>{formatNumberShort(post?.likesCount ?? 0)} likes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-center">
                    <p className="text-lg font-bold text-gray-900 leading-tight">
                      {formatNumberShort(post?.viewsCount ?? 0)}
                    </p>
                    <p className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mt-0.5">
                      {post?.platform ? post.platform.toUpperCase() : 'INSTAGRAM'}
                    </p>
                  </div>
                </div>
              ))}
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
