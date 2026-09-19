'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { ClientData, MonthlyReportData, MetaPageItem } from '@/lib/types';
import { EMPTY_REPORT } from '@/lib/mockData';
import { getFormatDistribution, getPlatformDistribution } from '@/lib/analytics';
import { ControlBar } from '@/components/dashboard/ControlBar';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { FormatBarChart } from '@/components/charts/FormatBarChart';
import { DistributionPieChart } from '@/components/charts/DistributionPieChart';
import { TopContentSection } from '@/components/dashboard/TopContentSection';
import { StrategyEditor } from '@/components/dashboard/StrategyEditor';
import { PrintableReport } from '@/components/pdf/PrintableReport';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Eye, Layers, Sparkles, Plus, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [report, setReport] = useState<MonthlyReportData>(EMPTY_REPORT);

  // Meta Pages selection state
  const [availablePages, setAvailablePages] = useState<MetaPageItem[]>([]);
  const [activePageId, setActivePageId] = useState<string>('');

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pdf-preview'>('dashboard');
  const [connectedPlatforms, setConnectedPlatforms] = useState<{
    instagram?: boolean;
    tiktok?: boolean;
    instagramHandle?: string;
    pageName?: string;
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
      if (!selectedClientId) {
        setConnectedPlatforms({});
        return;
      }

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
        const activePage = localStorage.getItem(`koko_active_page_id_${selectedClientId}`);
        const activePageName = localStorage.getItem(`koko_active_page_name_${selectedClientId}`);

        setActivePageId(activePage || '');

        // Load cached Meta pages if available
        try {
          const storedPages = localStorage.getItem(`koko_meta_available_pages_${selectedClientId}`);
          if (storedPages) {
            const parsedPages = JSON.parse(storedPages);
            if (Array.isArray(parsedPages)) {
              setAvailablePages(parsedPages);
            }
          } else if (ig || directIg) {
            // Lazy fetch from API in background
            axios.get(`/api/social-accounts/meta-pages?clientId=${selectedClientId}`).then((res) => {
              if (res.data?.success && Array.isArray(res.data?.pages)) {
                setAvailablePages(res.data.pages);
                localStorage.setItem(`koko_meta_available_pages_${selectedClientId}`, JSON.stringify(res.data.pages));
              }
            }).catch(() => {});
          }
        } catch (e) {}

        setConnectedPlatforms({
          instagram: !!ig || !!directIg,
          tiktok: !!tt,
          instagramHandle: directUser ? `@${directUser}` : (ig?.platformAccountId || directAcct || undefined),
          pageName: activePageName || (ig?.pageName || undefined),
        });
      } catch (e) {
        console.warn('Error reading connected social accounts:', e);
      }
    }
    loadConnectedState();
  }, [selectedClientId]);

  // 3. Load client list from DB + localStorage, strictly filtering out deleted & mock accounts
  useEffect(() => {
    async function fetchClients() {
      let deletedIds: string[] = ['client-bulungi-town', 'client-safi-bay'];
      try {
        const storedDeleted = localStorage.getItem('koko_deleted_client_ids');
        if (storedDeleted) {
          const parsed = JSON.parse(storedDeleted);
          if (Array.isArray(parsed)) {
            deletedIds = Array.from(new Set([...deletedIds, ...parsed]));
          }
        }
        localStorage.setItem('koko_deleted_client_ids', JSON.stringify(deletedIds));
      } catch (e) {}

      const deletedSet = new Set(deletedIds);

      let base: ClientData[] = [];
      try {
        const res = await axios.get('/api/clients');
        if (res.data && Array.isArray(res.data)) {
          base = res.data.filter((c: ClientData) => !deletedSet.has(c.id));
        }
      } catch (err) {
        console.warn('API fetch clients error:', err);
      }

      try {
        const localCustom = localStorage.getItem('koko_custom_clients');
        if (localCustom) {
          const parsed: ClientData[] = JSON.parse(localCustom);
          const validCustom = parsed.filter((c) => !deletedSet.has(c.id));
          localStorage.setItem('koko_custom_clients', JSON.stringify(validCustom));

          const existingIds = new Set(base.map((c) => c.id));
          const newOnes = validCustom.filter((c) => !existingIds.has(c.id));
          base = [...base, ...newOnes];
        }
      } catch (e) {
        console.warn('localStorage custom clients parse error:', e);
      }

      if (typeof window !== 'undefined') {
        try {
          const params = new URLSearchParams(window.location.search);
          const urlCid = params.get('clientId');
          if (urlCid && !deletedSet.has(urlCid) && !base.some((c) => c.id === urlCid)) {
            base.push({
              id: urlCid,
              name: 'Connected Client',
              logoUrl: '/logos/default.svg',
              createdAt: new Date().toISOString(),
              socialAccounts: [],
            });
          }
        } catch (e) {}
      }

      setClients(base);

      // Select active client ID
      setSelectedClientId((prev) => {
        if (prev && base.some((c) => c.id === prev)) {
          return prev;
        }
        return base[0]?.id || '';
      });
    }
    fetchClients();
  }, []);

  // 4. Fetch report data when client or dates change
  useEffect(() => {
    async function fetchReport() {
      if (!selectedClientId) {
        setReport(EMPTY_REPORT);
        return;
      }

      setIsLoading(true);
      try {
        // Helper to purge any legacy mock posts from browser storage
        const purgeMockPosts = (postsList: any[]) => {
          if (!Array.isArray(postsList)) return [];
          return postsList.filter((p: any) => {
            const isMock =
              p.thumbnailUrl?.includes('unsplash.com') ||
              p.postId?.startsWith('ig_mock_') ||
              p.postId?.startsWith('tt_mock_') ||
              p.postId?.startsWith('ig_synced_') ||
              p.id?.startsWith('ig_mock_') ||
              p.id?.startsWith('tt_mock_') ||
              p.id?.startsWith('ig_synced_');
            return !isMock;
          });
        };

        // Read cached report from localStorage first for instant load
        try {
          const cached = localStorage.getItem(`koko_report_${selectedClientId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && (parsed.id || parsed.igViews != null)) {
              if (parsed.posts) {
                parsed.posts = purgeMockPosts(parsed.posts);
              }
              setReport(parsed);
            }
          }
        } catch (e) {}

        const res = await axios.get(`/api/reports?clientId=${selectedClientId}&startDate=${startDate}&endDate=${endDate}`);
        const reportData = Array.isArray(res.data) ? res.data[0] : res.data;
        if (reportData && (reportData.igViews > 0 || !report?.igViews)) {
          if (reportData.posts) {
            reportData.posts = purgeMockPosts(reportData.posts);
          }
          setReport(reportData);
          try {
            localStorage.setItem(`koko_report_${selectedClientId}`, JSON.stringify(reportData));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('API fetch report notice:', err);
        setReport(EMPTY_REPORT);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReport();
  }, [selectedClientId, startDate, endDate]);

  const selectedClient = clients.find((c) => c.id === selectedClientId) ||
    clients[0] || {
      id: selectedClientId || '',
      name: 'Client Workspace',
      logoUrl: '',
      createdAt: '',
      socialAccounts: [],
    };

  const safeReport = useMemo(() => {
    const base = report || EMPTY_REPORT;
    return {
      ...base,
      startDate: startDate || base.startDate,
      endDate: endDate || base.endDate,
    };
  }, [report, startDate, endDate]);

  // Handle dynamic social media API sync
  const handleLiveSync = async (targetPageOverride?: string) => {
    if (!selectedClientId) return;
    setIsSyncing(true);
    try {
      let igToken = '';
      let igAccountId = '';
      let pageId = targetPageOverride || activePageId || '';
      try {
        const stored = localStorage.getItem('koko_connected_social_accounts');
        if (stored) {
          const accounts: any[] = JSON.parse(stored);
          const ig = accounts.find((a) => a.clientId === selectedClientId && a.platform === 'instagram');
          if (ig) {
            igToken = ig.accessToken;
            igAccountId = ig.platformAccountId;
            if (!pageId && ig.pageId) pageId = ig.pageId;
          }
        }
      } catch (e) {}

      if (!igToken) {
        try {
          igToken = localStorage.getItem(`koko_active_ig_token_${selectedClientId}`) || '';
          igAccountId = localStorage.getItem(`koko_active_ig_account_${selectedClientId}`) || '';
          if (!pageId) {
            pageId = localStorage.getItem(`koko_active_page_id_${selectedClientId}`) || '';
          }
        } catch (e) {}
      }

      const res = await axios.post('/api/sync', {
        clientId: selectedClientId,
        startDate,
        endDate,
        accessToken: igToken,
        platformAccountId: igAccountId,
        pageId,
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

  // Select which Page to get analytics from directly on Dashboard
  const handleSelectPage = async (page: MetaPageItem) => {
    if (!selectedClientId) return;
    const instagramUsername = page.instagramBusinessAccount?.username;
    const instagramId = page.instagramBusinessAccount?.id;
    const displayAcct = instagramUsername ? `@${instagramUsername}` : (instagramId || page.name);

    setActivePageId(page.id);
    setConnectedPlatforms((prev) => ({
      ...prev,
      instagramHandle: displayAcct,
      pageName: page.name,
    }));

    try {
      localStorage.setItem(`koko_active_page_id_${selectedClientId}`, page.id);
      localStorage.setItem(`koko_active_page_name_${selectedClientId}`, page.name);
      localStorage.setItem(`koko_active_ig_account_${selectedClientId}`, instagramId || page.id);
      if (instagramUsername) {
        localStorage.setItem(`koko_active_ig_username_${selectedClientId}`, instagramUsername);
      }
      if (page.access_token) {
        localStorage.setItem(`koko_active_ig_token_${selectedClientId}`, page.access_token);
      }

      const stored = localStorage.getItem('koko_connected_social_accounts');
      if (stored) {
        const list = JSON.parse(stored);
        const updated = list.filter((a: any) => !(a.clientId === selectedClientId && a.platform === 'instagram'));
        updated.push({
          id: `sa_${selectedClientId}_instagram`,
          clientId: selectedClientId,
          platform: 'instagram',
          platformAccountId: displayAcct,
          accessToken: page.access_token || localStorage.getItem(`koko_active_ig_token_${selectedClientId}`) || 'active_token',
          pageId: page.id,
          pageName: page.name,
          tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        });
        localStorage.setItem('koko_connected_social_accounts', JSON.stringify(updated));
      }
    } catch (e) {}

    // Persist to backend
    try {
      await axios.post('/api/social-accounts/meta-pages', {
        clientId: selectedClientId,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        instagramId,
        instagramUsername,
      });
    } catch (err) {}

    // Trigger immediate sync for that page
    handleLiveSync(page.id);
  };

  // Auto-sync live metrics if Instagram is connected and report is empty
  useEffect(() => {
    if (connectedPlatforms.instagram && selectedClientId && (Number(safeReport.igViews) === 0 || safeReport.id === 'report-empty-state')) {
      handleLiveSync();
    }
  }, [connectedPlatforms.instagram, selectedClientId]);

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

  // Update real posts list (persists to localStorage and DB)
  const handleUpdatePosts = async (updatedPosts: any[]) => {
    const updatedReport = {
      ...safeReport,
      posts: updatedPosts,
    };
    setReport(updatedReport);
    try {
      localStorage.setItem(`koko_report_${selectedClientId}`, JSON.stringify(updatedReport));
    } catch (e) {}

    try {
      await axios.put(`/api/report-details/${safeReport.id}`, {
        posts: updatedPosts,
      });
    } catch (err) {
      console.warn('API update posts notice:', err);
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
            availablePages={availablePages}
            activePageId={activePageId}
            onSelectPage={handleSelectPage}
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

            {clients.length > 0 && selectedClient && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Showing data for <span className="font-bold text-gray-800">{selectedClient.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="no-print space-y-6">
            {clients.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-3xl p-10 sm:p-12 text-center shadow-sm max-w-2xl mx-auto my-8">
                <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-gray-800">
                  <AlertCircle className="w-8 h-8 text-neutral-500" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 font-heading mb-2">
                  No Client Accounts Found
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-md mx-auto mb-6">
                  Default mock accounts have been removed. Create your first client account in Settings to connect real Instagram and TikTok profiles and generate live analytics reports.
                </p>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  Add Client Account in Settings
                </Link>
              </div>
            ) : (
              <>
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
                <TopContentSection
                  clientName={selectedClient.name}
                  posts={safeReport.posts || []}
                  onUpdatePosts={handleUpdatePosts}
                  onSyncPosts={handleLiveSync}
                  isSyncing={isSyncing}
                />

                {/* Strategy Editors */}
                <StrategyEditor
                  reportId={safeReport.id || 'report-default'}
                  initialGoals={safeReport.goals || []}
                  initialInsights={safeReport.insights || []}
                  initialNextSteps={safeReport.nextSteps || []}
                  onSaveStrategy={handleSaveStrategy}
                />
              </>
            )}
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
