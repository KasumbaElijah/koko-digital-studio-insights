'use client';

import React from 'react';
import { MonthlyReportData } from '@/lib/types';
import { formatNumberShort } from '@/lib/analytics';

interface KPIGridProps {
  report: MonthlyReportData;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ report }) => {
  const igFollowersStr = report.igFollowersGrowth > 0 ? `+${formatNumberShort(report.igFollowersGrowth)}` : `${report.igFollowersGrowth}`;
  const ttFollowersStr = report.ttFollowersGrowth > 0 ? `+${formatNumberShort(report.ttFollowersGrowth)}` : `${report.ttFollowersGrowth}`;

  const igViewsStr = formatNumberShort(report.igViews);
  const ttViewsStr = formatNumberShort(report.ttViews);

  const igPctStr = report.igViewsPctChange >= 0 ? `+${report.igViewsPctChange.toLocaleString()}%` : `${report.igViewsPctChange}%`;
  const ttPctStr = report.ttViewsPctChange >= 0 ? `+${report.ttViewsPctChange.toLocaleString()}%` : `${report.ttViewsPctChange}%`;

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
            {report.igEngagementRate}%
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
            {report.ttEngagementRate}%
          </span>
        </div>
      </div>
    </div>
  );
};
