'use client';

import React from 'react';
import { MonthlyReportData } from '@/lib/types';
import { formatNumberShort } from '@/lib/analytics';

interface KPIGridProps {
  report: MonthlyReportData;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ report }) => {
  const safeReport = report || ({} as Partial<MonthlyReportData>);
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
    <div className="w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
      {/* Table Headers */}
      <div className="grid grid-cols-12 items-center mb-6 text-center">
        <div className="col-span-3"></div>
        <div className="col-span-3 flex justify-center">
          <span className="px-5 py-1.5 rounded-full border border-orange-600 text-gray-800 text-xs sm:text-sm font-semibold tracking-wide bg-transparent">
            Followers Growth
          </span>
        </div>
        <div className="col-span-3 flex justify-center">
          <span className="px-8 py-1.5 rounded-full bg-gray-100 text-gray-800 text-xs sm:text-sm font-semibold tracking-wide">
            Views
          </span>
        </div>
        <div className="col-span-3 flex justify-center">
          <span className="px-5 py-1.5 rounded-full border border-orange-600 text-gray-800 text-xs sm:text-sm font-semibold tracking-wide bg-transparent">
            Engagement Rate
          </span>
        </div>
      </div>

      {/* Row 1: INSTAGRAM */}
      <div className="grid grid-cols-12 items-center py-6 border-b border-gray-100">
        <div className="col-span-3 text-left">
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
            <p className="text-[10px] text-gray-500 font-medium uppercase">Percentage change</p>
            <p className="text-xs font-bold text-gray-800">{igPctStr}</p>
          </div>
        </div>
        <div className="col-span-3 text-center">
          <span className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            {igRate}%
          </span>
        </div>
      </div>

      {/* Row 2: TIKTOK */}
      <div className="grid grid-cols-12 items-center py-6">
        <div className="col-span-3 text-left">
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
            <p className="text-[10px] text-gray-500 font-medium uppercase">Percentage Change</p>
            <p className="text-xs font-bold text-gray-800">{ttPctStr}</p>
          </div>
        </div>
        <div className="col-span-3 text-center">
          <span className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            {ttRate}%
          </span>
        </div>
      </div>
    </div>
  );
};
