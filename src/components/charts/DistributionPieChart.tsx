'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { DistributionCount } from '@/lib/types';

interface DistributionPieChartProps {
  data: DistributionCount[];
}

const COLORS = ['#e3e1d5', '#bebbb0'];

export const DistributionPieChart: React.FC<DistributionPieChartProps> = ({ data }) => {
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
