'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { DistributionCount } from '@/lib/types';

interface DistributionPieChartProps {
  data: DistributionCount[];
  centerLabel?: string;
  isPrint?: boolean;
}

const DEFAULT_COLORS = ['#e1306c', '#010101', '#25f4ee', '#833ab4', '#fe2c55', '#fcaf45'];

export const DistributionPieChart: React.FC<DistributionPieChartProps> = ({
  data,
  centerLabel = 'Posts',
  isPrint = false,
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
            label={isPrint ? false : ({ platform, count }) => `${platform} (${count})`}
            labelLine={!isPrint}
            isAnimationActive={!isPrint}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              />
            ))}
          </Pie>
          {!isPrint && (
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
                fontWeight: 600,
              }}
              formatter={(value: any, name: any) => [
                `${value} (${Math.round(((Number(value) || 0) / (totalCount || 1)) * 100)}%)`,
                name,
              ]}
            />
          )}
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

