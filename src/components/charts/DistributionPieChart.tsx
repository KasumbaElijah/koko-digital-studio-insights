'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { DistributionCount } from '@/lib/types';

interface DistributionPieChartProps {
  data: DistributionCount[];
}

const COLORS = ['#e3e1d5', '#bebbb0'];

export const DistributionPieChart: React.FC<DistributionPieChartProps> = ({ data }) => {
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
            innerRadius={45}
            outerRadius={75}
            paddingAngle={2}
            dataKey="count"
            nameKey="platform"
            label={({ platform, count }) => `${platform}\n${count}`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e0e0e0' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
