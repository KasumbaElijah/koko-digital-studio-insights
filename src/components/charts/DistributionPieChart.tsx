'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { DistributionCount } from '@/lib/types';

interface DistributionPieChartProps {
  data: DistributionCount[];
  centerLabel?: string;
}

const DEFAULT_COLORS = ['#18181b', '#52525b', '#8f8f99', '#d4d4d8', '#f4f4f5'];

export const DistributionPieChart: React.FC<DistributionPieChartProps> = ({
  data,
  centerLabel = 'Posts',
}) => {
  const totalCount = data.reduce((sum, item) => sum + (item.count || 0), 0);

  if (!data.length || totalCount === 0) {
    return (
      <div className="w-full h-56 flex flex-col items-center justify-center text-center p-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">No Content Data</p>
        <p className="text-xs text-gray-500 mt-1">No published posts recorded for this period.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-56 flex flex-col items-center justify-center relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={76}
            paddingAngle={3}
            dataKey="count"
            nameKey="platform"
            label={({ platform, count }) => `${platform} (${count})`}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e0e0e0', fontSize: '12px' }}
            formatter={(value: any, name: any) => [
              `${value} (${Math.round(((Number(value) || 0) / (totalCount || 1)) * 100)}%)`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center Donut Stat */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-lg font-black text-gray-900 leading-none">{totalCount}</span>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{centerLabel}</span>
      </div>
    </div>
  );
};

