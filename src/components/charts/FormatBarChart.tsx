'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FormatCount } from '@/lib/types';

interface FormatBarChartProps {
  data: FormatCount[];
}

export const FormatBarChart: React.FC<FormatBarChartProps> = ({ data }) => {
  const totalCount = data.reduce((sum, item) => sum + (item.count || 0), 0);

  if (!data.length || totalCount === 0) {
    return (
      <div className="w-full h-56 flex flex-col items-center justify-center text-center p-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">No Format Breakdown</p>
        <p className="text-xs text-gray-500 mt-1">Posts will appear categorized once synced or added.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e5e5" />
          <XAxis type="number" domain={[0, 'dataMax + 5']} tickLine={false} axisLine={{ stroke: '#cccccc' }} />
          <YAxis
            type="category"
            dataKey="format"
            tick={{ fill: '#333333', fontSize: 13 }}
            tickLine={false}
            axisLine={{ stroke: '#cccccc' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e0e0e0' }}
            cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
          />
          <Bar dataKey="count" fill="#2b2b2b" radius={[0, 4, 4, 0]} barSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
