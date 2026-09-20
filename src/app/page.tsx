'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { ClientData, MonthlyReportData, MetaPageItem, ContentPostData } from '@/lib/types';
import { EMPTY_REPORT, createEmptyReport } from '@/lib/mockData';
import {
  getFormatDistribution,
  getFormatDistributionByPlatform,
  getFormatComparison,
  getPlatformDistribution,
  getPlatformFormatDistribution,
  calculatePctChange,
} from '@/lib/analytics';
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
  const [formatTab, setFormatTab] = useState<'comparison' | 'instagram' | 'tiktok'>('comparison');
  const [distributionTab, setDistributionTab] = useState<'split' | 'instagram' | 'tiktok'>('split');
  const [connectedPlatforms, setConnectedPlatforms] = useState<{
    instagram?: boolean;
    tiktok?: boolean;
    instagramHandle?: string;
    tiktokHandle?: string;
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
      if (connected === 'tiktok') {
        setConnectedPlatforms((prev) => ({ ...prev, tiktok: true }));
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

        const directTtToken = localStorage.getItem(`koko_active_tt_token_${selectedClientId}`);
        const directTtAcct = localStorage.getItem(`koko_active_tt_account_${selectedClientId}`);
        const directTtUser = localStorage.getItem(`koko_active_tt_username_${selectedClientId}`);

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

        const ttHandleDisplay = directTtUser
          ? (directTtUser.startsWith('@') ? directTtUser : `@${directTtUser}`)
          : (tt?.platformAccountId || directTtAcct || undefined);

        setConnectedPlatforms({
          instagram: !!ig || !!directIg,
          tiktok: !!tt || !!directTtToken || !!directTtAcct,
          instagramHandle: directUser ? `@${directUser}` : (ig?.platformAccountId || directAcct || undefined),
          tiktokHandle: ttHandleDisplay,
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
        // Read cached report from localStorage first for instant load
        let cachedReport: any = null;
        let cachedPosts: any[] = [];
        try {
          const storedPostsStr = localStorage.getItem(`koko_posts_${selectedClientId}`);
          if (storedPostsStr) {
            const parsedPosts = JSON.parse(storedPostsStr);
            if (Array.isArray(parsedPosts) && parsedPosts.length > 0) {
              cachedPosts = parsedPosts;
            }
          }

          const cached = localStorage.getItem(`koko_report_${selectedClientId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && (parsed.id || parsed.igViews != null)) {
              if (cachedPosts.length > 0 && (!parsed.posts || parsed.posts.length === 0)) {
                parsed.posts = cachedPosts;
              }
              cachedReport = parsed;
              setReport(parsed);
            }
          }
        } catch (e) {}

        const res = await axios.get(`/api/reports?clientId=${selectedClientId}&startDate=${startDate}&endDate=${endDate}`);
        const reportData = Array.isArray(res.data) ? res.data[0] : res.data;

        // ONLY replace state from server if server returned real data with posts or views > 0
        const hasRealServerData = reportData && (
          (Array.isArray(reportData.posts) && reportData.posts.length > 0) ||
          Number(reportData.igViews) > 0 ||
          Number(reportData.ttViews) > 0
        );

        if (hasRealServerData) {
          const existingPosts = cachedReport?.posts || cachedPosts || [];
          const incomingPosts = reportData.posts || [];
          const incomingIds = new Set(incomingPosts.map((p: any) => p.postId || p.id));
          const mergedPosts = [...incomingPosts, ...existingPosts.filter((p: any) => !incomingIds.has(p.postId || p.id))];
          const finalReport = {
            ...cachedReport,
            ...reportData,
            posts: mergedPosts.length > 0 ? mergedPosts : existingPosts,
          };
          setReport(finalReport);
          try {
            localStorage.setItem(`koko_report_${selectedClientId}`, JSON.stringify(finalReport));
            localStorage.setItem(`koko_posts_${selectedClientId}`, JSON.stringify(finalReport.posts));
          } catch (e) {}
        } else if (!cachedReport) {
          const empty = createEmptyReport(selectedClientId);
          setReport(empty);
        }
      } catch (err) {
        console.warn('API fetch report notice:', err);
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
    const sDate = startDate || base.startDate;
    const eDate = endDate || base.endDate;

    const startObj = new Date(sDate);
    const endObj = new Date(eDate);
    const daysDiff = Math.max(1, Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const periodScale = daysDiff / 30;

    // Prior period dates for comparative change calculation
    const priorEndObj = new Date(startObj);
    priorEndObj.setDate(priorEndObj.getDate() - 1);
    const priorStartObj = new Date(priorEndObj);
    priorStartObj.setDate(priorStartObj.getDate() - daysDiff + 1);
    const priorStartStr = priorStartObj.toISOString().split('T')[0];
    const priorEndStr = priorEndObj.toISOString().split('T')[0];

    const allPosts: ContentPostData[] = Array.isArray(base.posts) ? base.posts : [];

    // Filter posts for current period
    const currentPeriodPosts = allPosts.filter((p) => {
      if (!p.publishedAt) return true;
      try {
        const pDate = new Date(p.publishedAt);
        if (isNaN(pDate.getTime())) return true;
        const pDateStr = pDate.toISOString().split('T')[0];
        return pDateStr >= sDate && pDateStr <= eDate;
      } catch {
        return true;
      }
    });

    // Filter posts for prior period
    const priorPeriodPosts = allPosts.filter((p) => {
      if (!p.publishedAt) return false;
      try {
        const pDate = new Date(p.publishedAt);
        if (isNaN(pDate.getTime())) return false;
        const pDateStr = pDate.toISOString().split('T')[0];
        return pDateStr >= priorStartStr && pDateStr <= priorEndStr;
      } catch {
        return false;
      }
    });

    // 1. Instagram metrics
    const igPosts = currentPeriodPosts.filter((p) => (p.platform || '').toLowerCase() === 'instagram');
    const igPriorPosts = priorPeriodPosts.filter((p) => (p.platform || '').toLowerCase() === 'instagram');

    const igPostsViews = igPosts.reduce((sum, p) => sum + (Number(p.viewsCount) || 0), 0);
    const igPriorPostsViews = igPriorPosts.reduce((sum, p) => sum + (Number(p.viewsCount) || 0), 0);

    let computedIgViews = Number(base.igViews || 0);
    if (igPostsViews > 0) {
      computedIgViews = igPostsViews;
    } else if (computedIgViews > 0) {
      computedIgViews = Math.round(computedIgViews * periodScale);
    }

    let computedIgFollowers = Number(base.igFollowersGrowth || 0);
    if (computedIgFollowers > 0) {
      computedIgFollowers = Math.max(1, Math.round(computedIgFollowers * periodScale));
    }

    let computedIgEngagementRate = base.igEngagementRate || 0;
    if (igPosts.length > 0) {
      const igEngagements = igPosts.reduce((sum, p) => sum + (Number(p.likesCount) || 0) + (Number(p.commentsCount) || 0) + (Number(p.sharesCount) || 0), 0);
      const denominator = computedIgViews > 0 ? computedIgViews : (igPostsViews || 1);
      computedIgEngagementRate = Number(((igEngagements / denominator) * 100).toFixed(1));
    }

    let computedIgPctChange = base.igViewsPctChange || 0;
    if (igPriorPostsViews > 0 && igPostsViews > 0) {
      computedIgPctChange = calculatePctChange(igPostsViews, igPriorPostsViews);
    }

    // 2. TikTok metrics
    const ttPosts = currentPeriodPosts.filter((p) => (p.platform || '').toLowerCase() === 'tiktok');
    const ttPriorPosts = priorPeriodPosts.filter((p) => (p.platform || '').toLowerCase() === 'tiktok');

    const ttPostsViews = ttPosts.reduce((sum, p) => sum + (Number(p.viewsCount) || 0), 0);
    const ttPriorPostsViews = ttPriorPosts.reduce((sum, p) => sum + (Number(p.viewsCount) || 0), 0);

    let computedTtViews = Number(base.ttViews || 0);
    if (ttPostsViews > 0) {
      computedTtViews = ttPostsViews;
    } else if (computedTtViews > 0) {
      computedTtViews = Math.round(computedTtViews * periodScale);
    }

    let computedTtFollowers = Number(base.ttFollowersGrowth || 0);
    if (computedTtFollowers > 0) {
      computedTtFollowers = Math.max(1, Math.round(computedTtFollowers * periodScale));
    }

    let computedTtEngagementRate = base.ttEngagementRate || 0;
    if (ttPosts.length > 0) {
      const ttEngagements = ttPosts.reduce((sum, p) => sum + (Number(p.likesCount) || 0) + (Number(p.commentsCount) || 0) + (Number(p.sharesCount) || 0), 0);
      const denominator = computedTtViews > 0 ? computedTtViews : (ttPostsViews || 1);
      computedTtEngagementRate = Number(((ttEngagements / denominator) * 100).toFixed(1));
    }

    let computedTtPctChange = base.ttViewsPctChange || 0;
    if (ttPriorPostsViews > 0 && ttPostsViews > 0) {
      computedTtPctChange = calculatePctChange(ttPostsViews, ttPriorPostsViews);
    }

    // Content Display Rule:
    // If there are posts published within the selected date window, prioritize them.
    // If the selected date window has 0 published posts, seamlessly fall back to allPosts
    // so Content Format, Content Distribution, and Top Performing Content ALWAYS display
    // the client's creative work rather than showing empty/broken state cards!
    const displayPosts = currentPeriodPosts.length > 0 ? currentPeriodPosts : allPosts;

    return {
      ...base,
      startDate: sDate,
      endDate: eDate,
      posts: displayPosts,
      allPosts,
      currentPeriodPosts,
      hasPeriodPosts: currentPeriodPosts.length > 0,
      igViews: computedIgViews,
      igFollowersGrowth: computedIgFollowers,
      igEngagementRate: computedIgEngagementRate,
      igViewsPctChange: computedIgPctChange,
      ttViews: computedTtViews,
      ttFollowersGrowth: computedTtFollowers,
      ttEngagementRate: computedTtEngagementRate,
      ttViewsPctChange: computedTtPctChange,
    };
  }, [report, startDate, endDate]);

  // Handle dynamic social media API sync
  const handleLiveSync = async (targetPageOverride?: string | unknown) => {
    if (!selectedClientId) return;
    setIsSyncing(true);
    try {
      let igToken = '';
      let igAccountId = '';
      let ttToken = '';
      let ttAccountId = '';
      const cleanPageOverride = typeof targetPageOverride === 'string' ? targetPageOverride : undefined;
      let pageId = cleanPageOverride || (typeof activePageId === 'string' ? activePageId : '') || '';
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
          const tt = accounts.find((a) => a.clientId === selectedClientId && a.platform === 'tiktok');
          if (tt) {
            ttToken = tt.accessToken;
            ttAccountId = tt.platformAccountId;
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

      if (!ttToken) {
        try {
          ttToken = localStorage.getItem(`koko_active_tt_token_${selectedClientId}`) || '';
          ttAccountId = localStorage.getItem(`koko_active_tt_account_${selectedClientId}`) || '';
        } catch (e) {}
      }

      const res = await axios.post('/api/sync', {
        clientId: selectedClientId,
        startDate,
        endDate,
        accessToken: igToken,
        platformAccountId: igAccountId,
        tiktokAccessToken: ttToken,
        tiktokPlatformAccountId: ttAccountId,
        pageId,
        existingPosts: report?.posts || [],
      });

      const updatedReport = res.data?.report || (res.data?.id ? res.data : null);
      if (updatedReport) {
        setReport((prev) => {
          const existingPosts = prev.posts || [];
          const newPosts = updatedReport.posts || [];
          const newPostIds = new Set(newPosts.map((p: any) => p.postId || p.id));
          const preservedPosts = existingPosts.filter((p: any) => !newPostIds.has(p.postId || p.id));
          const mergedPosts = [...newPosts, ...preservedPosts];
          const finalPosts = mergedPosts.length > 0 ? mergedPosts : existingPosts;
          const mergedReport = {
            ...prev,
            ...updatedReport,
            posts: finalPosts,
          };
          try {
            localStorage.setItem(`koko_report_${selectedClientId}`, JSON.stringify(mergedReport));
            localStorage.setItem(`koko_posts_${selectedClientId}`, JSON.stringify(finalPosts));
          } catch (e) {}
          return mergedReport;
        });
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

  // Auto-sync live metrics whenever connected platforms, active client, or date range changes
  useEffect(() => {
    if ((connectedPlatforms.instagram || connectedPlatforms.tiktok) && selectedClientId) {
      const timer = setTimeout(() => {
        handleLiveSync();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [selectedClientId, startDate, endDate, connectedPlatforms.instagram, connectedPlatforms.tiktok]);

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

  // Update real posts list (persists to localStorage and DB, preserving posts in other date ranges)
  const handleUpdatePosts = async (updatedCurrentRangePosts: any[]) => {
    // Preserve any posts that belonged to other date ranges
    const otherRangePosts = (report.posts || []).filter((p) => {
      if (!p.publishedAt) return false;
      const pDate = new Date(p.publishedAt);
      if (isNaN(pDate.getTime())) return false;
      const pDateStr = pDate.toISOString().split('T')[0];
      return pDateStr < startDate || pDateStr > endDate;
    });

    const mergedPosts = [...updatedCurrentRangePosts, ...otherRangePosts];
    const updatedReport = {
      ...report,
      startDate,
      endDate,
      posts: mergedPosts,
    };
    setReport(updatedReport);
    try {
      localStorage.setItem(`koko_report_${selectedClientId}`, JSON.stringify(updatedReport));
      localStorage.setItem(`koko_posts_${selectedClientId}`, JSON.stringify(mergedPosts));
    } catch (e) {}

    try {
      await axios.put(`/api/report-details/${safeReport.id}`, {
        posts: mergedPosts,
      });
    } catch (err) {
      console.warn('API update posts notice:', err);
    }
  };

  const handlePrintPdf = async () => {
    setActiveTab('pdf-preview');

    // Preload top post thumbnail images so they are fully loaded before print dialog renders
    const postsToPreload = (safeReport.posts || []).slice(0, 6);
    const preloadPromises = postsToPreload.map((p) => {
      if (!p.thumbnailUrl) return Promise.resolve(true);
      const proxied = p.thumbnailUrl.startsWith('http')
        ? `/api/image-proxy?url=${encodeURIComponent(p.thumbnailUrl)}`
        : p.thumbnailUrl;

      return new Promise((resolve) => {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = proxied;
        setTimeout(() => resolve(false), 1500);
      });
    });

    try {
      await Promise.all(preloadPromises);
    } catch {}

    setTimeout(() => {
      window.print();
    }, 450);
  };

  const formatData = getFormatDistribution(safeReport.posts || []);
  const formatComparisonData = getFormatComparison(safeReport.posts || []);
  const igFormatData = getFormatDistributionByPlatform(safeReport.posts || [], 'instagram');
  const ttFormatData = getFormatDistributionByPlatform(safeReport.posts || [], 'tiktok');

  const distributionData = getPlatformDistribution(safeReport.posts || []);
  const igDistributionData = getPlatformFormatDistribution(safeReport.posts || [], 'instagram');
  const ttDistributionData = getPlatformFormatDistribution(safeReport.posts || [], 'tiktok');

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
            onSync={() => handleLiveSync()}
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
                  {/* CONTENT FORMAT CARD */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold tracking-wider text-gray-900 uppercase font-heading">
                              CONTENT FORMAT
                            </h3>
                            {!safeReport.hasPeriodPosts && (safeReport.posts || []).length > 0 && (
                              <span className="text-[10px] text-gray-500 font-semibold bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                                All-Time
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {formatTab === 'comparison'
                              ? 'Side-by-side Instagram & TikTok format breakdown'
                              : formatTab === 'instagram'
                              ? 'Instagram formats (Videos, Images, Graphics, Stories)'
                              : 'TikTok formats (Videos, Photos, Stories)'}
                          </p>
                        </div>

                        {/* Segmented Controls for Platform Selection */}
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
                          <button
                            onClick={() => setFormatTab('comparison')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                              formatTab === 'comparison'
                                ? 'bg-white text-gray-900 shadow-xs'
                                : 'text-gray-500 hover:text-gray-800'
                            }`}
                          >
                            Both
                          </button>
                          <button
                            onClick={() => setFormatTab('instagram')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                              formatTab === 'instagram'
                                ? 'bg-white text-gray-900 shadow-xs'
                                : 'text-gray-500 hover:text-gray-800'
                            }`}
                          >
                            Instagram
                          </button>
                          <button
                            onClick={() => setFormatTab('tiktok')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                              formatTab === 'tiktok'
                                ? 'bg-white text-gray-900 shadow-xs'
                                : 'text-gray-500 hover:text-gray-800'
                            }`}
                          >
                            TikTok
                          </button>
                        </div>
                      </div>

                      {formatTab === 'comparison' ? (
                        <FormatBarChart comparisonData={formatComparisonData} />
                      ) : formatTab === 'instagram' ? (
                        <FormatBarChart data={igFormatData} platform="instagram" />
                      ) : (
                        <FormatBarChart data={ttFormatData} platform="tiktok" />
                      )}
                    </div>
                  </div>

                  {/* CONTENT DISTRIBUTION CARD */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold tracking-wider text-gray-900 uppercase font-heading">
                              CONTENT DISTRIBUTION
                            </h3>
                            {!safeReport.hasPeriodPosts && (safeReport.posts || []).length > 0 && (
                              <span className="text-[10px] text-gray-500 font-semibold bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                                All-Time
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {distributionTab === 'split'
                              ? 'Channel share breakdown (Instagram vs TikTok)'
                              : distributionTab === 'instagram'
                              ? 'Instagram format share & percentage breakdown'
                              : 'TikTok format share & percentage breakdown'}
                          </p>
                        </div>

                        {/* Segmented Controls for Distribution Selection */}
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
                          <button
                            onClick={() => setDistributionTab('split')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                              distributionTab === 'split'
                                ? 'bg-white text-gray-900 shadow-xs'
                                : 'text-gray-500 hover:text-gray-800'
                            }`}
                          >
                            Channels
                          </button>
                          <button
                            onClick={() => setDistributionTab('instagram')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                              distributionTab === 'instagram'
                                ? 'bg-white text-gray-900 shadow-xs'
                                : 'text-gray-500 hover:text-gray-800'
                            }`}
                          >
                            Instagram
                          </button>
                          <button
                            onClick={() => setDistributionTab('tiktok')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                              distributionTab === 'tiktok'
                                ? 'bg-white text-gray-900 shadow-xs'
                                : 'text-gray-500 hover:text-gray-800'
                            }`}
                          >
                            TikTok
                          </button>
                        </div>
                      </div>

                      {distributionTab === 'split' ? (
                        <DistributionPieChart data={distributionData} centerLabel="Channels" />
                      ) : distributionTab === 'instagram' ? (
                        <DistributionPieChart data={igDistributionData} centerLabel="IG Posts" />
                      ) : (
                        <DistributionPieChart data={ttDistributionData} centerLabel="TT Posts" />
                      )}
                    </div>
                  </div>
                </div>


                {/* Top Content Previews */}
                <TopContentSection
                  clientName={selectedClient.name}
                  posts={safeReport.posts || []}
                  onUpdatePosts={handleUpdatePosts}
                  onSyncPosts={() => handleLiveSync()}
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
