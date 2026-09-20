'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { FormatCount, FormatComparisonItem } from '@/lib/types';

interface FormatBarChartProps {
  data?: FormatCount[];
  comparisonData?: FormatComparisonItem[];
  platform?: 'all' | 'instagram' | 'tiktok';
}

const IG_FORMAT_COLORS: Record<string, string> = {
  Videos: '#e1306c', // Instagram Reels / Rose
  Image: '#833ab4',  // Instagram Purple
  Graphic: '#fd1d1d',// Instagram Coral Red
  Stories: '#fcaf45',// Instagram Sunset Gold
};

const TT_FORMAT_COLORS: Record<string, string> = {
  Videos: '#fe2c55', // TikTok Neon Red
  Image: '#25f4ee',  // TikTok Cyan
  Stories: '#010101',// TikTok Deep Black
  Graphic: '#69c9d0',// TikTok Teal
};

export const FormatBarChart: React.FC<FormatBarChartProps> = ({
  data,
  comparisonData,
  platform = 'all',
}) => {
  const isComparison = !!comparisonData && comparisonData.length > 0;

  const totalCount = isComparison
    ? (comparisonData || []).reduce((sum, item) => sum + (item.total || 0), 0)
    : (data || []).reduce((sum, item) => sum + (item.count || 0), 0);

  if (totalCount === 0) {
    return (
      <div className="w-full h-56 flex flex-col items-center justify-center text-center p-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">No Format Breakdown</p>
        <p className="text-xs text-gray-500 mt-1">Posts will appear categorized once synced or added.</p>
      </div>
    );
  }

  if (isComparison) {
    return (
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={comparisonData}
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
            <XAxis type="number" domain={[0, 'dataMax + 2']} tickLine={false} axisLine={{ stroke: '#e5e5e5' }} />
            <YAxis
              type="category"
              dataKey="format"
              tick={{ fill: '#374151', fontSize: 12, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e5e5' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
              }}
              cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '6px' }}
            />
            <Bar dataKey="instagram" name="Instagram" fill="#e1306c" radius={[0, 4, 4, 0]} barSize={10} />
            <Bar dataKey="tiktok" name="TikTok" fill="#010101" radius={[0, 4, 4, 0]} barSize={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const defaultColor = platform === 'tiktok' ? '#fe2c55' : platform === 'instagram' ? '#e1306c' : '#18181b';

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data || []}
          margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis type="number" domain={[0, 'dataMax + 3']} tickLine={false} axisLine={{ stroke: '#e5e5e5' }} />
          <YAxis
            type="category"
            dataKey="format"
            tick={{ fill: '#374151', fontSize: 12, fontWeight: 600 }}
            tickLine={false}
            axisLine={{ stroke: '#e5e5e5' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontSize: '12px',
            }}
            cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }}
          />
          <Bar dataKey="count" name="Posts" radius={[0, 6, 6, 0]} barSize={20}>
            {(data || []).map((entry, index) => {
              const cellColor =
                platform === 'instagram'
                  ? IG_FORMAT_COLORS[entry.format] || '#e1306c'
                  : platform === 'tiktok'
                  ? TT_FORMAT_COLORS[entry.format] || '#fe2c55'
                  : defaultColor;
              return <Cell key={`cell-${index}`} fill={cellColor} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

