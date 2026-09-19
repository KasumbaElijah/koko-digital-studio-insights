'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, RefreshCw, Download, Printer, CheckCircle2, AlertCircle } from 'lucide-react';
import { ClientData, MetaPageItem } from '@/lib/types';

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
  connectedPlatforms?: {
    instagram?: boolean;
    tiktok?: boolean;
    instagramHandle?: string;
    pageName?: string;
  };
  availablePages?: MetaPageItem[];
  activePageId?: string;
  onSelectPage?: (page: MetaPageItem) => void;
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
  connectedPlatforms,
  availablePages,
  activePageId,
  onSelectPage,
}) => {
  const setLast30Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    onDateChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
  };

  const setLast7Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    onDateChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-6">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Client Switcher */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client:</label>
          {clients.length > 0 ? (
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
          ) : (
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-all cursor-pointer"
            >
              + Add Client Account
            </Link>
          )}
          {connectedPlatforms?.instagram ? (
            <div className="flex items-center gap-2">
              {availablePages && availablePages.length > 1 ? (
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs px-2.5 py-1 rounded-xl border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-700">Page:</span>
                  <select
                    value={activePageId || (availablePages[0]?.id ?? '')}
                    onChange={(e) => {
                      const found = availablePages.find((p) => p.id === e.target.value);
                      if (found && onSelectPage) {
                        onSelectPage(found);
                      }
                    }}
                    className="bg-white border border-emerald-300 font-bold text-emerald-950 text-xs rounded-lg px-2 py-0.5 outline-none cursor-pointer hover:border-emerald-400 focus:ring-1 focus:ring-emerald-500 max-w-[150px] sm:max-w-[200px] truncate"
                  >
                    {availablePages.map((p) => {
                      const igUser = p.instagramBusinessAccount?.username;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} {igUser ? `(@${igUser})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Instagram Live {connectedPlatforms.pageName ? `(${connectedPlatforms.pageName})` : connectedPlatforms.instagramHandle ? `(${connectedPlatforms.instagramHandle})` : 'Connected'}
                </span>
              )}
            </div>
          ) : (
            <Link
              href="/settings"
              className="hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium border border-neutral-200 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5 text-neutral-500" />
              Connect Channels in Settings
            </Link>
          )}
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
              onClick={setLast30Days}
              className="px-2.5 py-1 rounded-lg hover:bg-white transition-all text-gray-700 hover:shadow-xs cursor-pointer"
            >
              Last 30 Days
            </button>
            <button
              onClick={setLast7Days}
              className="px-2.5 py-1 rounded-lg hover:bg-white transition-all text-gray-700 hover:shadow-xs cursor-pointer"
            >
              Last 7 Days
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
