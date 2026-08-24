'use client';

import React from 'react';
import { Calendar, RefreshCw, Download, Printer, CheckCircle2 } from 'lucide-react';
import { ClientData } from '@/lib/types';

interface ControlBarProps {
  clients: ClientData[];
  selectedClientId: string;
  onSelectClient: (id: string) => void;
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  onSync: () => void;
  isSyncing: boolean;
  onPrintPdf: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  clients,
  selectedClientId,
  onSelectClient,
  startDate,
  endDate,
  onDateChange,
  onSync,
  isSyncing,
  onPrintPdf,
}) => {
  const setJunePreset = () => {
    onDateChange('2026-06-11', '2026-07-10');
  };

  const setLast30Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    onDateChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-6">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Client Switcher */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client:</label>
          <select
            value={selectedClientId}
            onChange={(e) => onSelectClient(e.target.value)}
            className="bg-gray-50 border border-gray-300 font-semibold text-gray-900 text-sm rounded-xl focus:ring-black focus:border-black block p-2.5 outline-none cursor-pointer"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mock API Active
          </span>
        </div>

        {/* Date Filter & Presets */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => onDateChange(e.target.value, endDate)}
              className="bg-transparent text-sm font-medium text-gray-800 outline-none"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onDateChange(startDate, e.target.value)}
              className="bg-transparent text-sm font-medium text-gray-800 outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={setJunePreset}
              className="px-2.5 py-1 rounded-lg hover:bg-white transition-all text-gray-700 hover:shadow-xs"
            >
              June Report (11 Jun - 10 Jul)
            </button>
            <button
              onClick={setLast30Days}
              className="px-2.5 py-1 rounded-lg hover:bg-white transition-all text-gray-700 hover:shadow-xs"
            >
              30 Days
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing APIs...' : 'Live Sync'}
          </button>

          <button
            onClick={onPrintPdf}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-900 border border-gray-200 text-xs font-semibold rounded-xl hover:bg-gray-200 active:scale-98 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};
