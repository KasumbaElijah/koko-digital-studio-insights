'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ClientData, MonthlyReportData } from '@/lib/types';
import { INITIAL_CLIENTS, INITIAL_REPORTS } from '@/lib/mockData';
import { getFormatDistribution, getPlatformDistribution } from '@/lib/analytics';
import { ControlBar } from '@/components/dashboard/ControlBar';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { FormatBarChart } from '@/components/charts/FormatBarChart';
import { DistributionPieChart } from '@/components/charts/DistributionPieChart';
import { TopContentSection } from '@/components/dashboard/TopContentSection';
import { StrategyEditor } from '@/components/dashboard/StrategyEditor';
import { PrintableReport } from '@/components/pdf/PrintableReport';
import { Eye, Layers, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const [clients, setClients] = useState<ClientData[]>(INITIAL_CLIENTS);
  const [selectedClientId, setSelectedClientId] = useState<string>('client-bulungi-town');

  const [report, setReport] = useState<MonthlyReportData>(INITIAL_REPORTS['client-bulungi-town']);
  const [startDate, setStartDate] = useState<string>('2026-06-11');
  const [endDate, setEndDate] = useState<string>('2026-07-10');

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pdf-preview'>('dashboard');

  // Load client list on mount
  useEffect(() => {
    async function fetchClients() {
      let base = INITIAL_CLIENTS;
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

      setClients(base);
    }
    fetchClients();
  }, []);

  // Fetch report data when client or dates change
  useEffect(() => {
    async function fetchReport() {
      setIsLoading(true);
      try {
        const res = await axios.get(`/api/reports?clientId=${selectedClientId}&startDate=${startDate}&endDate=${endDate}`);
        if (res.data && res.data.id) {
          setReport(res.data);
        } else {
          setReport(INITIAL_REPORTS[selectedClientId] || INITIAL_REPORTS['client-bulungi-town']);
        }
      } catch (err) {
        console.warn('API fetch report error, using mock fallback:', err);
        setReport(INITIAL_REPORTS[selectedClientId] || INITIAL_REPORTS['client-bulungi-town']);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReport();
  }, [selectedClientId, startDate, endDate]);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || INITIAL_CLIENTS[0];

  // Handle dynamic social media API sync
  const handleLiveSync = async () => {
    setIsSyncing(true);
    try {
      const res = await axios.post('/api/sync', {
        clientId: selectedClientId,
        startDate,
        endDate,
      });
      if (res.data && res.data.id) {
        setReport(res.data);
      }
    } catch (err) {
      console.error('Error during social API sync:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Save Strategy updates (Goals, Insights, Next Steps)
  const handleSaveStrategy = async (goals: string[], insights: string[], nextSteps: string[]) => {
    try {
      await axios.put(`/api/report-details/${report.id}`, {
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

  const formatData = getFormatDistribution(report.posts || []);
  const distributionData = getPlatformDistribution(report.posts || []);

  return (
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
          <KPIGrid report={report} />

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
          <TopContentSection clientName={selectedClient.name} posts={report.posts || []} />

          {/* Strategy Editors */}
          <StrategyEditor
            reportId={report.id}
            initialGoals={report.goals || []}
            initialInsights={report.insights || []}
            initialNextSteps={report.nextSteps || []}
            onSaveStrategy={handleSaveStrategy}
          />
        </div>
      )}

      {/* PRINTABLE PDF PREVIEW VIEW */}
      {(activeTab === 'pdf-preview' || typeof window !== 'undefined') && (
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
          <PrintableReport report={report} client={selectedClient} />
        </div>
      )}
    </div>
  );
}
