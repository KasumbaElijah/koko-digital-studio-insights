'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Activity,
  Calendar,
  Filter,
  RefreshCw,
  Share2,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Settings2,
  Trash2,
  X,
  ExternalLink,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { TrackerAccountConfig, TrackerCalculationResult } from '@/lib/trackerStore';

export default function PerformanceTrackerPage() {
  // 1. Date Range State: defaults to 1st of current month up to today
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // 2. Pod Filter State
  const [selectedPod, setSelectedPod] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 3. Target Month for Google Sheets Export
  const [targetMonth, setTargetMonth] = useState<string>(() => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const now = new Date();
    // Default to current month or next target month
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  });

  // 4. Data States
  const [accounts, setAccounts] = useState<TrackerAccountConfig[]>([]);
  const [results, setResults] = useState<TrackerCalculationResult[]>([]);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [lastCalculatedAt, setLastCalculatedAt] = useState<string | null>(null);

  // 5. Google Sheets Export State & Modal
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportResponse, setExportResponse] = useState<any | null>(null);
  const [customSheetId, setCustomSheetId] = useState<string>('');
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);

  // 6. Manage Account Modal State
  const [showAddAccountModal, setShowAddAccountModal] = useState<boolean>(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccPod, setNewAccPod] = useState('Alpha');
  const [newAccPlatform, setNewAccPlatform] = useState<'tiktok' | 'instagram' | 'both'>('tiktok');
  const [newAccTtHandle, setNewAccTtHandle] = useState('');
  const [newAccIgHandle, setNewAccIgHandle] = useState('');
  const [newAccTargetVideos, setNewAccTargetVideos] = useState(12);
  const [newAccTargetGraphics, setNewAccTargetGraphics] = useState(8);
  const [newAccExpectedViews, setNewAccExpectedViews] = useState(15000);
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Initial load: Fetch accounts and perform auto-calculation
  useEffect(() => {
    fetchAccountsAndCalculate();
  }, []);

  const fetchAccountsAndCalculate = async () => {
    setIsCalculating(true);
    try {
      // 1. Fetch current accounts
      const accRes = await axios.get('/api/tracker/accounts');
      if (accRes.data?.success && Array.isArray(accRes.data?.accounts)) {
        setAccounts(accRes.data.accounts);
      }

      // 2. Trigger calculation
      const calcRes = await axios.post('/api/tracker/calculate', {
        startDate,
        endDate,
        podFilter: selectedPod,
      });

      if (calcRes.data?.success && Array.isArray(calcRes.data?.data)) {
        setResults(calcRes.data.data);
        setLastCalculatedAt(calcRes.data.calculatedAt || new Date().toISOString());
      }
    } catch (err) {
      console.error('Error calculating performance metrics:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleRecalculate = async () => {
    setIsCalculating(true);
    setExportResponse(null);
    try {
      const calcRes = await axios.post('/api/tracker/calculate', {
        startDate,
        endDate,
        podFilter: selectedPod,
      });
      if (calcRes.data?.success && Array.isArray(calcRes.data?.data)) {
        setResults(calcRes.data.data);
        setLastCalculatedAt(calcRes.data.calculatedAt || new Date().toISOString());
      }
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  // Google Sheets Export Trigger
  const handlePushToGoogleSheet = async () => {
    setIsExporting(true);
    setExportResponse(null);
    try {
      const res = await axios.post('/api/tracker/export-sheet', {
        month: targetMonth,
        data: filteredResults,
        sheetId: customSheetId.trim() || undefined,
      });
      setExportResponse(res.data);
    } catch (err: any) {
      setExportResponse({
        success: false,
        error: 'REQUEST_ERROR',
        message: err.response?.data?.message || err.message || 'Failed to connect to export service',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Save New Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    setIsSavingAccount(true);
    try {
      await axios.post('/api/tracker/accounts', {
        name: newAccName.trim(),
        pod: newAccPod.trim(),
        platform: newAccPlatform,
        tiktokHandle: newAccTtHandle.trim() || undefined,
        instagramHandle: newAccIgHandle.trim() || undefined,
        targetVideos: Number(newAccTargetVideos) || 10,
        targetGraphics: Number(newAccTargetGraphics) || 5,
        expectedAvgViews: Number(newAccExpectedViews) || 10000,
      });
      setShowAddAccountModal(false);
      // Reset form
      setNewAccName('');
      setNewAccTtHandle('');
      setNewAccIgHandle('');
      await fetchAccountsAndCalculate();
    } catch (err) {
      console.error('Error creating account:', err);
    } finally {
      setIsSavingAccount(false);
    }
  };

  // Delete Monitored Account
  const handleDeleteAccount = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to stop tracking "${name}" in the performance tracker?`)) return;
    try {
      await axios.delete(`/api/tracker/accounts?id=${id}`);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setResults((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Error deleting account:', err);
    }
  };

  // Extract unique pods
  const availablePods = useMemo(() => {
    const set = new Set<string>(['All']);
    accounts.forEach((a) => {
      if (a.pod) set.add(a.pod);
    });
    return Array.from(set);
  }, [accounts]);

  // Filtered Results by Pod and Search term
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      const matchPod = selectedPod === 'All' || r.pod.toLowerCase() === selectedPod.toLowerCase();
      const matchSearch =
        !searchTerm.trim() ||
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.pod.toLowerCase().includes(searchTerm.toLowerCase());
      return matchPod && matchSearch;
    });
  }, [results, selectedPod, searchTerm]);

  // Aggregate Performance Metrics
  const summaryKPIs = useMemo(() => {
    const totalAcc = filteredResults.length;
    if (totalAcc === 0) {
      return { totalAcc: 0, totalViews: 0, avgViews: 0, hitRate: 0, greenCount: 0, redCount: 0 };
    }
    const totalViews = filteredResults.reduce((sum, r) => sum + r.totalViews, 0);
    const avgViews = Math.round(totalViews / (filteredResults.reduce((sum, r) => sum + r.videoCount, 0) || 1));
    const greenCount = filteredResults.filter((r) => r.variancePct >= 0).length;
    const redCount = totalAcc - greenCount;
    const hitRate = Math.round((greenCount / totalAcc) * 100);

    return { totalAcc, totalViews, avgViews, hitRate, greenCount, redCount };
  }, [filteredResults]);

  // CSV Export Generation
  const handleCopyCsv = () => {
    const headers = ['Pod', 'Account Name', 'Target Videos', 'Target Graphics', 'Expected Avg Views', 'Actual Avg Views', 'Published Videos', 'Total Views', 'Variance %'];
    const rows = filteredResults.map((r) => [
      `"${r.pod}"`,
      `"${r.name}"`,
      r.targetVideos,
      r.targetGraphics,
      r.expectedAvgViews,
      r.actualAvgViews,
      r.videoCount,
      r.totalViews,
      `${r.variancePct}%`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    navigator.clipboard.writeText(csvContent);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2500);
  };

  const handleDownloadCsv = () => {
    const headers = ['Pod', 'Account Name', 'Target Videos', 'Target Graphics', 'Expected Avg Views', 'Actual Avg Views', 'Published Videos', 'Total Views', 'Variance %'];
    const rows = filteredResults.map((r) => [
      `"${r.pod}"`,
      `"${r.name}"`,
      r.targetVideos,
      r.targetGraphics,
      r.expectedAvgViews,
      r.actualAvgViews,
      r.videoCount,
      r.totalViews,
      `${r.variancePct}%`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `koko_performance_tracker_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-950 tracking-tight flex items-center gap-2">
                Performance Tracker
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Admin Tool
                </span>
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                On-demand video average view calculation & direct sync to Management Google Sheets
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setShowAddAccountModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4 text-gray-600" />
            Add Account
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all hover:shadow"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Push to Google Sheet
          </button>
        </div>
      </div>

      {/* 2. Top Controls Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs font-medium bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-black focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs font-medium bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-black focus:outline-none"
            />
          </div>

          {/* Pod Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              Pod Selection
            </label>
            <select
              value={selectedPod}
              onChange={(e) => setSelectedPod(e.target.value)}
              className="w-full text-xs font-medium bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-black focus:outline-none cursor-pointer"
            >
              {availablePods.map((pod) => (
                <option key={pod} value={pod}>
                  {pod === 'All' ? 'All Pods (Alpha, Millions, etc.)' : `Pod ${pod}`}
                </option>
              ))}
            </select>
          </div>

          {/* Target Month Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Sheet Target Month
            </label>
            <select
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              className="w-full text-xs font-semibold bg-emerald-50/50 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="October 2026">October 2026</option>
              <option value="November 2026">November 2026</option>
              <option value="December 2026">December 2026</option>
              <option value="September 2026">September 2026</option>
              <option value="August 2026">August 2026</option>
              <option value="July 2026">July 2026</option>
            </select>
          </div>

          {/* Primary Action Button */}
          <div>
            <button
              onClick={handleRecalculate}
              disabled={isCalculating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-black hover:bg-gray-800 text-white disabled:opacity-50 transition-all shadow-sm h-[38px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin text-emerald-400' : ''}`} />
              {isCalculating ? 'Calculating...' : 'Calculate Metrics'}
            </button>
          </div>
        </div>

        {/* Filter & Search Bar sub-row */}
        <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search account name or pod..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            {lastCalculatedAt && (
              <span>
                Last calculated:{' '}
                <strong className="text-gray-700 font-semibold">
                  {new Date(lastCalculatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </strong>
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyCsv}
                className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors font-medium"
              >
                {copiedCsv ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-gray-500" />}
                {copiedCsv ? 'Copied' : 'Copy CSV'}
              </button>
              <button
                onClick={handleDownloadCsv}
                className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors font-medium"
              >
                <Download className="w-3 h-3 text-gray-500" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Summary Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
            Accounts Monitored
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-950 font-heading">
              {summaryKPIs.totalAcc}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              Pod: {selectedPod}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
            Total In-Range Views
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-950 font-heading">
              {summaryKPIs.totalViews.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400 font-medium">Aggregate</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
            Portfolio Avg Views
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-950 font-heading">
              {summaryKPIs.avgViews.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 font-medium">per video</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
            Target Hit Rate (&ge; 0%)
          </p>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-black font-heading ${summaryKPIs.hitRate >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {summaryKPIs.hitRate}%
            </span>
            <span className="text-xs font-semibold text-gray-600">
              {summaryKPIs.greenCount} / {summaryKPIs.totalAcc} met
            </span>
          </div>
        </div>
      </div>

      {/* 4. Live Interactive Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-950 tracking-tight">
              Monitored Account Baselines & Variance Analysis
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Calculated across date window: <strong className="text-gray-800">{startDate}</strong> to <strong className="text-gray-800">{endDate}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync Ready
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-[11px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-200">
              <tr>
                <th scope="col" className="py-3.5 px-6">Pod & Account Name</th>
                <th scope="col" className="py-3.5 px-6">Contract Target</th>
                <th scope="col" className="py-3.5 px-6">Expected Avg Views</th>
                <th scope="col" className="py-3.5 px-6">Live Actual Avg Views</th>
                <th scope="col" className="py-3.5 px-6">Variance %</th>
                <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    {isCalculating ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-black" />
                        <p className="text-xs font-semibold text-gray-600">Calculating account performance metrics across selected range...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                        <p className="font-semibold text-gray-600">No accounts match the selected Pod or search filter.</p>
                        <button
                          onClick={() => { setSelectedPod('All'); setSearchTerm(''); }}
                          className="text-xs font-bold text-black underline"
                        >
                          Clear filters
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredResults.map((item) => {
                  const isPositive = item.variancePct >= 0;
                  const isZeroVideos = item.videoCount === 0;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/80 transition-colors group"
                    >
                      {/* 1. Pod & Account Name */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                              item.pod.toLowerCase() === 'alpha'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : item.pod.toLowerCase() === 'millions'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {item.pod}
                          </span>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono">
                              {item.platform.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Contract Target */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 font-medium">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-semibold">
                            {item.targetVideos} Videos
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="px-2 py-0.5 rounded-md bg-gray-50 text-gray-600">
                            {item.targetGraphics} Graphics
                          </span>
                        </div>
                      </td>

                      {/* 3. Expected Baseline */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-800 font-mono text-sm">
                          {item.expectedAvgViews.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium">
                          Contract Baseline
                        </div>
                      </td>

                      {/* 4. Live Actual Average Views */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-gray-950 font-mono text-sm">
                            {item.actualAvgViews.toLocaleString()}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.videoCount > 0
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {item.videoCount} {item.videoCount === 1 ? 'video' : 'videos'}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {item.totalViews.toLocaleString()} total views in window
                        </div>
                      </td>

                      {/* 5. Variance % */}
                      <td className="py-4 px-6">
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black tracking-tight border ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span>
                            {isPositive ? `+${item.variancePct.toFixed(1)}%` : `${item.variancePct.toFixed(1)}%`}
                          </span>
                        </div>
                        {isZeroVideos && (
                          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                            0 in range (-100%)
                          </div>
                        )}
                      </td>

                      {/* 6. Actions */}
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleDeleteAccount(item.id, item.name)}
                          title="Remove from performance tracker"
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 p-1 rounded transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Google Sheets Push Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-950">
                    Push to Management Google Sheet
                  </h3>
                  <p className="text-xs text-gray-500">
                    Sync calculated Actual Average Views directly to leadership sheet
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Target Month Column
                </label>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-black focus:outline-none"
                >
                  <option value="October 2026">October 2026</option>
                  <option value="November 2026">November 2026</option>
                  <option value="December 2026">December 2026</option>
                  <option value="September 2026">September 2026</option>
                  <option value="August 2026">August 2026</option>
                  <option value="July 2026">July 2026</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  The script locates the column with this month in header rows 1–2 and matches client rows by Account Name in Column C.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Spreadsheet ID (Optional Override)
                </label>
                <input
                  type="text"
                  placeholder="Defaults to PERFORMANCE_TRACKER_SHEET_ID from .env"
                  value={customSheetId}
                  onChange={(e) => setCustomSheetId(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 font-mono focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>

              {/* Feedback Alert */}
              {exportResponse && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                    exportResponse.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : exportResponse.simulated
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {exportResponse.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : exportResponse.simulated ? (
                      <Info className="w-4 h-4 text-amber-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>{exportResponse.success ? 'Google Sheet Updated' : exportResponse.simulated ? 'Simulation Notice' : 'Sync Warning'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {exportResponse.message}
                  </p>
                  {exportResponse.matchedAccounts && exportResponse.matchedAccounts.length > 0 && (
                    <div className="pt-2 border-t border-gray-200/50 text-[11px] font-medium">
                      Matched {exportResponse.matchedAccounts.length} accounts: {exportResponse.matchedAccounts.map((m: any) => `${m.account} (${m.column}${m.row}: ${m.value.toLocaleString()})`).slice(0, 3).join(', ')}...
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="text-xs font-bold text-gray-600 hover:text-black flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV Instead
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-3 py-2 text-xs font-bold text-gray-600 hover:text-gray-900"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handlePushToGoogleSheet}
                  disabled={isExporting || filteredResults.length === 0}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {isExporting ? 'Syncing to Sheet...' : 'Execute Batch Push'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add Account Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAccount}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-950">Add Monitored Account</h3>
                  <p className="text-xs text-gray-500">Configure contract baselines and platform handles</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Account / Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Total Tools, Wadad Spa"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Pod</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alpha, Millions"
                    value={newAccPod}
                    onChange={(e) => setNewAccPod(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Primary Platform</label>
                  <select
                    value={newAccPlatform}
                    onChange={(e) => setNewAccPlatform(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-black focus:outline-none cursor-pointer"
                  >
                    <option value="tiktok">TikTok</option>
                    <option value="instagram">Instagram</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">TikTok Handle</label>
                  <input
                    type="text"
                    placeholder="@handle"
                    value={newAccTtHandle}
                    onChange={(e) => setNewAccTtHandle(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Instagram Handle</label>
                  <input
                    type="text"
                    placeholder="@handle"
                    value={newAccIgHandle}
                    onChange={(e) => setNewAccIgHandle(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Target Videos</label>
                  <input
                    type="number"
                    min="1"
                    value={newAccTargetVideos}
                    onChange={(e) => setNewAccTargetVideos(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Target Graphics</label>
                  <input
                    type="number"
                    min="0"
                    value={newAccTargetGraphics}
                    onChange={(e) => setNewAccTargetGraphics(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Expected Avg</label>
                  <input
                    type="number"
                    min="100"
                    step="500"
                    value={newAccExpectedViews}
                    onChange={(e) => setNewAccExpectedViews(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingAccount || !newAccName.trim()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-black hover:bg-gray-800 text-white disabled:opacity-50 transition-colors shadow-sm"
              >
                {isSavingAccount ? 'Saving...' : 'Add to Tracker'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
