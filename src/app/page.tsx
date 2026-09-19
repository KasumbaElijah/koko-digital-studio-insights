'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ClientData, MonthlyReportData } from '@/lib/types';
import { INITIAL_CLIENTS, INITIAL_REPORTS, EMPTY_REPORT } from '@/lib/mockData';
import { getFormatDistribution, getPlatformDistribution } from '@/lib/analytics';
import { ControlBar } from '@/components/dashboard/ControlBar';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { FormatBarChart } from '@/components/charts/FormatBarChart';
import { DistributionPieChart } from '@/components/charts/DistributionPieChart';
import { TopContentSection } from '@/components/dashboard/TopContentSection';
import { StrategyEditor } from '@/components/dashboard/StrategyEditor';
import { PrintableReport } from '@/components/pdf/PrintableReport';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Eye, Layers, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const [clients, setClients] = useState<ClientData[]>(INITIAL_CLIENTS);
  const [selectedClientId, setSelectedClientId] = useState<string>('client-bulungi-town');

  const [report, setReport] = useState<MonthlyReportData>(INITIAL_REPORTS['client-bulungi-town'] || EMPTY_REPORT);
  const [startDate, setStartDate] = useState<string>('2026-06-11');
  const [endDate, setEndDate] = useState<string>('2026-07-10');

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pdf-preview'>('dashboard');
  const [connectedPlatforms, setConnectedPlatforms] = useState<{
    instagram?: boolean;
    tiktok?: boolean;
    instagramHandle?: string;
  }>({});

  // 1. Sync URL parameters on initial client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const cid = params.get('clientId');
      if (cid) {
        setSelectedClientId(cid);
      }
      const connected = params.get('connected');
      if (connected === 'instagram') {
        setConnectedPlatforms((prev) => ({ ...prev, instagram: true }));
      }
    } catch (e) {
      console.warn('URL params parse error:', e);
    }
  }, []);

  // 2. Load connected platforms from localStorage for active client
  useEffect(() => {
    function loadConnectedState() {
      try {
        const stored = localStorage.getItem('koko_connected_social_accounts');
        let ig: any = null;
        let tt: any = null;
        if (stored) {
          const accounts: any[] = JSON.parse(stored);
          ig = accounts.find((a) => a.clientId === selectedClientId && a.platform === 'instagram');
          tt = accounts.find((a) => a.clientId === selectedClientId && a.platform === 'tiktok');
        }

        const directIg = localStorage.getItem(`koko_active_ig_token_${selectedClientId}`);
        const directAcct = localStorage.getItem(`koko_active_ig_account_${selectedClientId}`);
        const directUser = localStorage.getItem(`koko_active_ig_username_${selectedClientId}`);

        setConnectedPlatforms({
          instagram: !!ig || !!directIg,
          tiktok: !!tt,
          instagramHandle: directUser ? `@${directUser}` : (ig?.platformAccountId || directAcct || undefined),
        });
      } catch (e) {
        console.warn('Error reading connected social accounts:', e);
      }
    }
    loadConnectedState();
  }, [selectedClientId]);

  // 3. Load client list from DB + localStorage
  useEffect(() => {
    async function fetchClients() {
      let base = [...INITIAL_CLIENTS];
      try {
        const res = await axios.get('/api/clients');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          base = res.data;
        }
      } catch (err) {
        console.warn('API fetch clients error, fallback to mock clients:', err);
      }

      try {
        const localCustom = localStorage.getItem('koko_custom_clients');
        if (localCustom) {
          const parsed: ClientData[] = JSON.parse(localCustom);
          const existingIds = new Set(base.map((c) => c.id));
          const newOnes = parsed.filter((c) => !existingIds.has(c.id));
          base = [...base, ...newOnes];
        }
      } catch (e) {
        console.warn('localStorage custom clients parse error:', e);
      }

      if (typeof window !== 'undefined') {
        try {
          const params = new URLSearchParams(window.location.search);
          const urlCid = params.get('clientId');
          if (urlCid && !base.some((c) => c.id === urlCid)) {
            base.push({
              id: urlCid,
              name: 'Connected Client',
              logoUrl: '/logos/bulungi-town.svg',
              createdAt: new Date().toISOString(),
              socialAccounts: [],
            });
          }
        } catch (e) {}
      }

      setClients(base);
    }
    fetchClients();
  }, []);

  // 4. Fetch report data when client or dates change
  useEffect(() => {
    async function fetchReport() {
      setIsLoading(true);
      try {
        // Read cached report from localStorage first for instant load
        try {
          const cached = localStorage.getItem(`koko_report_${selectedClientId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && (parsed.id || parsed.igViews != null)) {
              setReport(parsed);
            }
          }
        } catch (e) {}

        const res = await axios.get(`/api/reports?clientId=${selectedClientId}&startDate=${startDate}&endDate=${endDate}`);
        const reportData = Array.isArray(res.data) ? res.data[0] : res.data;
        if (reportData && (reportData.igViews > 0 || !report?.igViews)) {
          setReport(reportData);
          try {
            localStorage.setItem(`koko_report_${selectedClientId}`, JSON.stringify(reportData));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('API fetch report error, using mock fallback:', err);
        setReport(INITIAL_REPORTS[selectedClientId] || INITIAL_REPORTS['client-bulungi-town'] || EMPTY_REPORT);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReport();
  }, [selectedClientId, startDate, endDate]);

  const selectedClient = clients.find((c) => c.id === selectedClientId) ||
    clients[0] ||
    INITIAL_CLIENTS[0] || {
      id: selectedClientId || 'client-default',
      name: 'Client',
      logoUrl: '',
      createdAt: '',
      socialAccounts: [],
    };

  const safeReport = report || INITIAL_REPORTS[selectedClientId] || INITIAL_REPORTS['client-bulungi-town'] || EMPTY_REPORT;

  // Handle dynamic social media API sync
  const handleLiveSync = async () => {
    setIsSyncing(true);
    try {
      let igToken = '';
      let igAccountId = '';
      try {
        const stored = localStorage.getItem('koko_connected_social_accounts');
        if (stored) {
          const accounts: any[] = JSON.parse(stored);
          const ig = accounts.find((a) => a.clientId === selectedClientId && a.platform === 'instagram');
          if (ig) {
            igToken = ig.accessToken;
            igAccountId = ig.platformAccountId;
          }
        }
      } catch (e) {}

      if (!igToken) {
        try {
          igToken = localStorage.getItem(`koko_active_ig_token_${selectedClientId}`) || '';
          igAccountId = localStorage.getItem(`koko_active_ig_account_${selectedClientId}`) || '';
        } catch (e) {}
      }

      const res = await axios.post('/api/sync', {
        clientId: selectedClientId,
        startDate,
        endDate,
        accessToken: igToken,
        platformAccountId: igAccountId,
      });

      const updatedReport = res.data?.report || (res.data?.id ? res.data : null);
      if (updatedReport) {
        setReport(updatedReport);
        try {
          localStorage.setItem(`koko_report_${selectedClientId}`, JSON.stringify(updatedReport));
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error during social API sync:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync live metrics if Instagram is connected and report is empty
  useEffect(() => {
    if (connectedPlatforms.instagram && (Number(safeReport.igViews) === 0 || safeReport.id === 'report-empty-state')) {
      handleLiveSync();
    }
  }, [connectedPlatforms.instagram]);

  // Save Strategy updates (Goals, Insights, Next Steps)
  const handleSaveStrategy = async (goals: string[], insights: string[], nextSteps: string[]) => {
    try {
      await axios.put(`/api/report-details/${safeReport.id}`, {
        goals,
        insights,
        nextSteps,
      });
      setReport((prev) => ({
        ...prev,
        goals,
        insights,
        nextSteps,
      }));
    } catch (err) {
      console.warn('Strategy save DB call fallback to local state:', err);
      setReport((prev) => ({
        ...prev,
        goals,
        insights,
        nextSteps,
      }));
    }
  };

  const handlePrintPdf = () => {
    setActiveTab('pdf-preview');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const formatData = getFormatDistribution(safeReport.posts || []);
  const distributionData = getPlatformDistribution(safeReport.posts || []);

  return (
    <ErrorBoundary fallbackTitle="Client Analytics Overview">
      <div>
        {/* Control Navigation Bar */}
        <div className="no-print">
          <ControlBar
            clients={clients}
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
            startDate={startDate}
            endDate={endDate}
            onDateChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            onSync={handleLiveSync}
            isSyncing={isSyncing}
            onPrintPdf={handlePrintPdf}
            connectedPlatforms={connectedPlatforms}
          />

          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Interactive Analytics Dashboard
              </button>
              <button
                onClick={() => setActiveTab('pdf-preview')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'pdf-preview'
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                A4 Printable Report Preview
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Showing data for <span className="font-bold text-gray-800">{selectedClient.name}</span>
            </div>
          </div>
        </div>

        {/* DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="no-print space-y-6">
            {/* KPI Metrics Grid */}
            <KPIGrid report={safeReport} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold tracking-wider text-gray-900 uppercase font-heading mb-4">
                  CONTENT FORMAT
                </h3>
                <FormatBarChart data={formatData} />
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold tracking-wider text-gray-900 uppercase font-heading mb-4">
                  CONTENT DISTRIBUTION
                </h3>
                <DistributionPieChart data={distributionData} />
              </div>
            </div>

            {/* Top Content Previews */}
            <TopContentSection clientName={selectedClient.name} posts={safeReport.posts || []} />

            {/* Strategy Editors */}
            <StrategyEditor
              reportId={safeReport.id || 'report-default'}
              initialGoals={safeReport.goals || []}
              initialInsights={safeReport.insights || []}
              initialNextSteps={safeReport.nextSteps || []}
              onSaveStrategy={handleSaveStrategy}
            />
          </div>
        )}

        {/* PRINTABLE PDF PREVIEW VIEW */}
        <div className={activeTab === 'pdf-preview' ? 'block' : 'hidden print:block'}>
          <div className="no-print bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex items-center justify-between text-xs text-amber-900">
            <span>
              <strong>Print Mode Preview:</strong> Below is the exact A4 2-page report matching Koko Digital Studio&apos;s layout. Click &quot;Print / Download PDF&quot; to export.
            </span>
            <button
              onClick={() => window.print()}
              className="px-3 py-1 bg-amber-900 text-white font-bold rounded-lg hover:bg-amber-800 transition-all cursor-pointer"
            >
              Print / Download PDF
            </button>
          </div>
          <PrintableReport report={safeReport} client={selectedClient} />
        </div>
      </div>
    </ErrorBoundary>
  );
}
