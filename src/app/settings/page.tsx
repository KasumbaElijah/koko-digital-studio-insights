'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  ArrowLeft,
  Key,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Building,
  Plus,
  Trash2,
  ChevronLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import { INITIAL_CLIENTS } from '@/lib/mockData';
import { ClientData, SocialAccountData, MetaPageItem } from '@/lib/types';

export default function SettingsPage() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('koko_selected_client_id');
      if (saved) return saved;
      const match = document.cookie.match(/koko_selected_client_id=([^;]+)/);
      if (match) return decodeURIComponent(match[1].trim());
    }
    return '';
  });
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper to persist selected client across reloads and routes
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    if (typeof window !== 'undefined' && clientId) {
      try {
        localStorage.setItem('koko_selected_client_id', clientId);
        document.cookie = `koko_selected_client_id=${encodeURIComponent(clientId)}; path=/; max-age=31536000; SameSite=Lax`;
      } catch (e) {}
    }
  };

  // Meta Pages selection state
  const [availablePages, setAvailablePages] = useState<MetaPageItem[]>([]);
  const [isFetchingPages, setIsFetchingPages] = useState(false);
  const [activePageId, setActivePageId] = useState<string>('');

  // Card Design States matching familiar mobile login UI
  const [tiktokTab, setTiktokTab] = useState<'email' | 'phone'>('email');
  const [showIgPassword, setShowIgPassword] = useState(false);
  const [showTtPassword, setShowTtPassword] = useState(false);
  const [igIdentifier, setIgIdentifier] = useState('');
  const [igPassword, setIgPassword] = useState('');
  const [ttIdentifier, setTtIdentifier] = useState('');
  const [ttPassword, setTtPassword] = useState('');

  // Modal States
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  // New Client Form State
  const [newClientName, setNewClientName] = useState('');
  const [newClientLogo, setNewClientLogo] = useState('');

  // Meta & TikTok Developer Portal Inputs (with localStorage persistence)
  const [metaAppId, setMetaAppId] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('koko_meta_app_id');
      if (saved) return saved;
    }
    return process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '1762099978384335';
  });
  const [metaAppSecret, setMetaAppSecret] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('koko_meta_app_secret');
      if (saved) return saved;
    }
    return '';
  });
  const [configIdInput, setConfigIdInput] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('koko_meta_config_id');
      if (saved) return saved;
    }
    return process.env.NEXT_PUBLIC_INSTAGRAM_CONFIG_ID || '1590313085890812';
  });
  const [tiktokClientKey, setTiktokClientKey] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('koko_tiktok_client_key');
      if (saved) return saved;
    }
    return process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'awzwmzqb12ijk009';
  });
  const [tiktokClientSecret, setTiktokClientSecret] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('koko_tiktok_client_secret');
      if (saved) return saved;
    }
    return '';
  });
  const [credentialsSaved, setCredentialsSaved] = useState(false);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0] || null;

  // Helper to open centered modal popup window directly over dashboard
  const openCenteredPopup = (url: string, title: string) => {
    const width = 580;
    const height = 690;
    const left = typeof window !== 'undefined' ? window.screenX + (window.outerWidth - width) / 2 : 100;
    const top = typeof window !== 'undefined' ? window.screenY + (window.outerHeight - height) / 2 : 100;
    window.open(
      url,
      title,
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
    );
  };

  // Helper to load clients from API + localStorage
  const loadClientsList = async () => {
    // 1. Maintain set of deleted client IDs (automatically purges legacy mock defaults)
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

    let baseClients: ClientData[] = [];
    try {
      const clientsRes = await axios.get('/api/clients');
      if (clientsRes.data && Array.isArray(clientsRes.data)) {
        baseClients = clientsRes.data.filter((c: ClientData) => !deletedSet.has(c.id));
      }
    } catch (e) {
      console.warn('Clients API fetch fallback:', e);
    }

    // Merge custom clients saved in localStorage, strictly filtering out deleted & mock accounts
    try {
      const localCustom = localStorage.getItem('koko_custom_clients');
      if (localCustom) {
        const parsed: ClientData[] = JSON.parse(localCustom);
        const validCustom = parsed.filter((c) => !deletedSet.has(c.id));
        // Overwrite localStorage with purged list
        localStorage.setItem('koko_custom_clients', JSON.stringify(validCustom));

        const existingIds = new Set(baseClients.map((c) => c.id));
        const newOnes = validCustom.filter((c) => !existingIds.has(c.id));
        baseClients = [...baseClients, ...newOnes];
      }
    } catch (e) {
      console.warn('localStorage custom clients parse error:', e);
    }

    setClients(baseClients);

    // Synchronize selected client ID with persistence
    setSelectedClientId((prev) => {
      if (prev && baseClients.some((c) => c.id === prev)) {
        return prev;
      }
      const saved = typeof window !== 'undefined' ? localStorage.getItem('koko_selected_client_id') : null;
      if (saved && baseClients.some((c) => c.id === saved)) {
        return saved;
      }
      const firstId = baseClients[0]?.id || '';
      if (firstId && typeof window !== 'undefined') {
        try {
          localStorage.setItem('koko_selected_client_id', firstId);
          document.cookie = `koko_selected_client_id=${encodeURIComponent(firstId)}; path=/; max-age=31536000; SameSite=Lax`;
        } catch (e) {}
      }
      return firstId;
    });
  };

  useEffect(() => {
    loadClientsList();
  }, []);

  // Listen for real-time postMessage from popup OAuth window
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data && event.data.type === 'META_AUTH_SUCCESS') {
        const { accountId, username, accessToken, clientId } = event.data;
        const targetClientId = clientId || selectedClientId;
        const displayAcct = username ? `@${username}` : accountId;

        const newAccount: SocialAccountData = {
          id: `sa_${targetClientId}_instagram`,
          clientId: targetClientId,
          platform: 'instagram',
          platformAccountId: displayAcct,
          accessToken: accessToken || 'active_long_lived_token',
          tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        };

        try {
          const stored = localStorage.getItem('koko_connected_social_accounts');
          const list: SocialAccountData[] = stored ? JSON.parse(stored) : [];
          const updated = list.filter((a) => !(a.clientId === targetClientId && a.platform === 'instagram'));
          updated.push(newAccount);
          localStorage.setItem('koko_connected_social_accounts', JSON.stringify(updated));
          localStorage.setItem(`koko_active_ig_token_${targetClientId}`, accessToken || '');
          localStorage.setItem(`koko_active_ig_account_${targetClientId}`, accountId || '');
          if (username) {
            localStorage.setItem(`koko_active_ig_username_${targetClientId}`, username);
          }
        } catch (e) {}

        setSocialAccounts((prev) => {
          const filtered = prev.filter((a) => !(a.clientId === targetClientId && a.platform === 'instagram'));
          return [...filtered, newAccount];
        });
      }

      if (event.data && event.data.type === 'TIKTOK_AUTH_SUCCESS') {
        const { accountId, username, accessToken, clientId } = event.data;
        const targetClientId = clientId || selectedClientId;
        const displayAcct = username ? `@${username}` : (accountId || 'TikTok Account');

        const newAccount: SocialAccountData = {
          id: `sa_${targetClientId}_tiktok`,
          clientId: targetClientId,
          platform: 'tiktok',
          platformAccountId: displayAcct,
          accessToken: accessToken || 'active_long_lived_token',
          tokenExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        };

        try {
          const stored = localStorage.getItem('koko_connected_social_accounts');
          const list: SocialAccountData[] = stored ? JSON.parse(stored) : [];
          const updated = list.filter((a) => !(a.clientId === targetClientId && a.platform === 'tiktok'));
          updated.push(newAccount);
          localStorage.setItem('koko_connected_social_accounts', JSON.stringify(updated));
          localStorage.setItem(`koko_active_tt_token_${targetClientId}`, accessToken || '');
          localStorage.setItem(`koko_active_tt_account_${targetClientId}`, displayAcct);
          if (username) {
            localStorage.setItem(`koko_active_tt_username_${targetClientId}`, username);
          }
        } catch (e) {}

        setSocialAccounts((prev) => {
          const filtered = prev.filter((a) => !(a.clientId === targetClientId && a.platform === 'tiktok'));
          return [...filtered, newAccount];
        });
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedClientId]);

  // Listen for OAuth callback success query parameters in URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const connected = params.get('connected');
      const account = params.get('account');
      const username = params.get('username');
      const token = params.get('token');
      const paramClientId = params.get('clientId');

      if ((connected === 'instagram' || connected === 'tiktok') && account) {
        const targetClientId = paramClientId || selectedClientId;
        let displayAccountId = username ? `@${username}` : account;
        try {
          const savedUsername = localStorage.getItem(`koko_pending_username_${targetClientId}_${connected}`);
          if (savedUsername && account.includes('official')) {
            displayAccountId = savedUsername;
          }
        } catch (e) {}

        const newAccount: SocialAccountData = {
          id: `sa_${targetClientId}_${connected}`,
          clientId: targetClientId,
          platform: connected,
          platformAccountId: displayAccountId,
          accessToken: token || 'active_long_lived_token',
          tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        };

        // Save to browser localStorage
        try {
          const stored = localStorage.getItem('koko_connected_social_accounts');
          const list: SocialAccountData[] = stored ? JSON.parse(stored) : [];
          const updated = list.filter((a) => !(a.clientId === targetClientId && a.platform === connected));
          updated.push(newAccount);
          localStorage.setItem('koko_connected_social_accounts', JSON.stringify(updated));
          if (token && connected === 'instagram') {
            localStorage.setItem(`koko_active_ig_token_${targetClientId}`, token);
            localStorage.setItem(`koko_active_ig_account_${targetClientId}`, account);
            if (username) {
              localStorage.setItem(`koko_active_ig_username_${targetClientId}`, username);
            }
          }
          if (token && connected === 'tiktok') {
            localStorage.setItem(`koko_active_tt_token_${targetClientId}`, token);
            localStorage.setItem(`koko_active_tt_account_${targetClientId}`, displayAccountId);
            if (username) {
              localStorage.setItem(`koko_active_tt_username_${targetClientId}`, username);
            }
          }
        } catch (e) {
          console.warn('LocalStorage save error:', e);
        }

        // Update local component state
        setSocialAccounts((prev) => {
          const filtered = prev.filter((a) => !(a.clientId === targetClientId && a.platform === connected));
          return [...filtered, newAccount];
        });

        // Clean query parameters from URL without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.warn('OAuth URL params parse error:', e);
    }
  }, [selectedClientId]);

  // Disconnect social account
  const handleDisconnectAccount = async (platform: string) => {
    try {
      const stored = localStorage.getItem('koko_connected_social_accounts');
      if (stored) {
        const list: SocialAccountData[] = JSON.parse(stored);
        const updated = list.filter((a) => !(a.clientId === selectedClientId && a.platform === platform));
        localStorage.setItem('koko_connected_social_accounts', JSON.stringify(updated));
      }
      if (platform === 'instagram') {
        localStorage.removeItem(`koko_active_ig_token_${selectedClientId}`);
        localStorage.removeItem(`koko_active_ig_account_${selectedClientId}`);
        localStorage.removeItem(`koko_active_ig_username_${selectedClientId}`);
        localStorage.removeItem(`koko_meta_available_pages_${selectedClientId}`);
        localStorage.removeItem(`koko_active_page_id_${selectedClientId}`);
        localStorage.removeItem(`koko_active_page_name_${selectedClientId}`);
        document.cookie = `koko_session_ig_connected_${encodeURIComponent(selectedClientId)}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `koko_session_ig_account_${encodeURIComponent(selectedClientId)}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `koko_active_ig_token_${encodeURIComponent(selectedClientId)}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `koko_session_ig_connected=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `koko_session_ig_account=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        setAvailablePages([]);
        setActivePageId('');
      }
      if (platform === 'tiktok') {
        localStorage.removeItem(`koko_active_tt_token_${selectedClientId}`);
        localStorage.removeItem(`koko_active_tt_account_${selectedClientId}`);
        localStorage.removeItem(`koko_active_tt_username_${selectedClientId}`);
        document.cookie = `koko_session_tt_connected_${encodeURIComponent(selectedClientId)}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `koko_session_tt_account_${encodeURIComponent(selectedClientId)}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `koko_active_tt_token_${encodeURIComponent(selectedClientId)}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `koko_session_tt_connected=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `koko_session_tt_account=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }

      // Filter out posts from disconnected platform from cached report
      try {
        const cachedReportStr = localStorage.getItem(`koko_report_${selectedClientId}`);
        if (cachedReportStr) {
          const parsedReport = JSON.parse(cachedReportStr);
          if (Array.isArray(parsedReport.posts)) {
            parsedReport.posts = parsedReport.posts.filter((p: any) => String(p.platform || '').toLowerCase() !== platform.toLowerCase());
          }
          if (platform === 'tiktok') {
            parsedReport.ttViews = 0;
            parsedReport.ttFollowersGrowth = 0;
            parsedReport.ttEngagementRate = 0;
            parsedReport.ttViewsPctChange = 0;
          }
          if (platform === 'instagram') {
            parsedReport.igViews = 0;
            parsedReport.igFollowersGrowth = 0;
            parsedReport.igEngagementRate = 0;
            parsedReport.igViewsPctChange = 0;
          }
          localStorage.setItem(`koko_report_${selectedClientId}`, JSON.stringify(parsedReport));
          localStorage.setItem(`koko_posts_${selectedClientId}`, JSON.stringify(parsedReport.posts || []));
        }
      } catch (e) {}
    } catch (e) {}

    setSocialAccounts((prev) => prev.filter((a) => !(a.clientId === selectedClientId && a.platform === platform)));

    try {
      await axios.delete(`/api/social-accounts?id=sa_${selectedClientId}_${platform}`);
    } catch (e) {}
  };

  // Fetch / Refresh available Meta Facebook Pages & Instagram accounts
  const fetchAvailablePages = async () => {
    if (!selectedClientId) return;
    setIsFetchingPages(true);
    try {
      let token = localStorage.getItem(`koko_active_ig_token_${selectedClientId}`) || '';
      if (!token) {
        const stored = localStorage.getItem('koko_connected_social_accounts');
        if (stored) {
          const list: SocialAccountData[] = JSON.parse(stored);
          const ig = list.find((a) => a.clientId === selectedClientId && a.platform === 'instagram');
          if (ig) token = ig.accessToken;
        }
      }

      const res = await axios.get(`/api/social-accounts/meta-pages?clientId=${selectedClientId}${token ? `&accessToken=${encodeURIComponent(token)}` : ''}`);
      if (res.data?.success && Array.isArray(res.data?.pages)) {
        setAvailablePages(res.data.pages);
        localStorage.setItem(`koko_meta_available_pages_${selectedClientId}`, JSON.stringify(res.data.pages));
      }
    } catch (err) {
      console.warn('Notice fetching meta pages:', err);
    } finally {
      setIsFetchingPages(false);
    }
  };

  // Select which Page to get analytics from
  const handleSelectPage = async (page: MetaPageItem) => {
    if (!selectedClientId) return;
    const instagramUsername = page.instagramBusinessAccount?.username;
    const instagramId = page.instagramBusinessAccount?.id;
    const displayAcct = instagramUsername ? `@${instagramUsername}` : (instagramId || page.name);

    setActivePageId(page.id);

    try {
      const stored = localStorage.getItem('koko_connected_social_accounts');
      const list: SocialAccountData[] = stored ? JSON.parse(stored) : [];
      const updated = list.filter((a) => !(a.clientId === selectedClientId && a.platform === 'instagram'));
      const activeToken = page.access_token || localStorage.getItem(`koko_active_ig_token_${selectedClientId}`) || 'active_token';

      const newAccount: SocialAccountData = {
        id: `sa_${selectedClientId}_instagram`,
        clientId: selectedClientId,
        platform: 'instagram',
        platformAccountId: displayAcct,
        accessToken: activeToken,
        pageId: page.id,
        pageName: page.name,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      };
      updated.push(newAccount);
      localStorage.setItem('koko_connected_social_accounts', JSON.stringify(updated));
      localStorage.setItem(`koko_active_page_id_${selectedClientId}`, page.id);
      localStorage.setItem(`koko_active_page_name_${selectedClientId}`, page.name);
      localStorage.setItem(`koko_active_ig_account_${selectedClientId}`, instagramId || page.id);
      if (instagramUsername) {
        localStorage.setItem(`koko_active_ig_username_${selectedClientId}`, instagramUsername);
      }
      if (page.access_token) {
        localStorage.setItem(`koko_active_ig_token_${selectedClientId}`, page.access_token);
      }

      setSocialAccounts((prev) => {
        const filtered = prev.filter((a) => !(a.clientId === selectedClientId && a.platform === 'instagram'));
        return [...filtered, newAccount];
      });
    } catch (e) {
      console.warn('LocalStorage save error on page select:', e);
    }

    try {
      await axios.post('/api/social-accounts/meta-pages', {
        clientId: selectedClientId,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        instagramId,
        instagramUsername,
      });
    } catch (apiErr) {
      console.warn('API meta-pages switch notice:', apiErr);
    }
  };

  useEffect(() => {
    async function loadSocialAccounts() {
      if (!selectedClientId) {
        setSocialAccounts([]);
        return;
      }
      setIsLoading(true);
      try {
        let accounts: SocialAccountData[] = [];
        try {
          const res = await axios.get(`/api/social-accounts?clientId=${selectedClientId}`);
          if (res.data && Array.isArray(res.data) && res.data.length > 0) {
            accounts = res.data;
          }
        } catch (e) {
          console.warn('Social accounts API fetch fallback:', e);
          accounts = [];
        }

        // Merge persistent accounts from browser localStorage
        try {
          const stored = localStorage.getItem('koko_connected_social_accounts');
          if (stored) {
            const parsed: SocialAccountData[] = JSON.parse(stored);
            const clientAccounts = parsed.filter((a) => a.clientId === selectedClientId);
            clientAccounts.forEach((ca) => {
              const idx = accounts.findIndex((a) => a.platform === ca.platform);
              if (idx >= 0) {
                accounts[idx] = ca;
              } else {
                accounts.push(ca);
              }
            });
          }
        } catch (e) {
          console.warn('LocalStorage read error:', e);
        }

        setSocialAccounts(accounts);

        // Load active page details from localStorage if present
        try {
          const storedPages = localStorage.getItem(`koko_meta_available_pages_${selectedClientId}`);
          if (storedPages) {
            const parsedPages = JSON.parse(storedPages);
            if (Array.isArray(parsedPages)) {
              setAvailablePages(parsedPages);
            }
          }
          const storedActivePage = localStorage.getItem(`koko_active_page_id_${selectedClientId}`);
          if (storedActivePage) {
            setActivePageId(storedActivePage);
          }
        } catch (e) {}
      } finally {
        setIsLoading(false);
      }
    }
    loadSocialAccounts();
  }, [selectedClientId]);

  // Create New Dynamic Client Account
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const newId = `client-${Date.now()}`;
    const newClientObj: ClientData = {
      id: newId,
      name: newClientName.trim(),
      logoUrl: newClientLogo.trim() || '/logos/default.svg',
      createdAt: new Date().toISOString(),
      socialAccounts: [],
    };

    try {
      const res = await axios.post('/api/clients', {
        name: newClientObj.name,
        logoUrl: newClientObj.logoUrl,
      });
      if (res.data?.id) {
        newClientObj.id = res.data.id;
      }
    } catch (err) {
      console.warn('POST /api/clients fallback to localStorage:', err);
    }

    // Save to localStorage and ensure it's removed from deleted list
    try {
      const localCustom = localStorage.getItem('koko_custom_clients');
      const currentList: ClientData[] = localCustom ? JSON.parse(localCustom) : [];
      const filtered = currentList.filter((c) => c.id !== newClientObj.id);
      filtered.push(newClientObj);
      localStorage.setItem('koko_custom_clients', JSON.stringify(filtered));

      const storedDeleted = localStorage.getItem('koko_deleted_client_ids');
      if (storedDeleted) {
        const deletedArr: string[] = JSON.parse(storedDeleted);
        localStorage.setItem(
          'koko_deleted_client_ids',
          JSON.stringify(deletedArr.filter((id) => id !== newClientObj.id))
        );
      }
    } catch (e) {
      console.warn('Error saving custom client to localStorage:', e);
    }

    const updatedClients = [...clients.filter((c) => c.id !== newClientObj.id), newClientObj];
    setClients(updatedClients);
    setSelectedClientId(newClientObj.id);
    setNewClientName('');
    setNewClientLogo('');
    setShowAddClientModal(false);
  };

  // Delete Client Account permanently
  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to remove this client account?')) return;

    // 1. Record ID in koko_deleted_client_ids permanently
    try {
      const stored = localStorage.getItem('koko_deleted_client_ids');
      const list: string[] = stored ? JSON.parse(stored) : ['client-bulungi-town', 'client-safi-bay'];
      if (!list.includes(clientId)) {
        list.push(clientId);
      }
      localStorage.setItem('koko_deleted_client_ids', JSON.stringify(list));
    } catch (e) {}

    // 2. Remove from local state
    const updated = clients.filter((c) => c.id !== clientId);
    setClients(updated);

    // 3. Remove from koko_custom_clients
    try {
      const localCustom = localStorage.getItem('koko_custom_clients');
      if (localCustom) {
        const currentList: ClientData[] = JSON.parse(localCustom);
        const filtered = currentList.filter((c) => c.id !== clientId);
        localStorage.setItem('koko_custom_clients', JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('Error updating custom clients in localStorage:', e);
    }

    // 4. Remove associated social accounts and cached report
    try {
      localStorage.removeItem(`koko_report_${clientId}`);
      localStorage.removeItem(`koko_posts_${clientId}`);
      localStorage.removeItem(`koko_active_ig_token_${clientId}`);
      localStorage.removeItem(`koko_active_ig_account_${clientId}`);
      localStorage.removeItem(`koko_active_ig_username_${clientId}`);
      localStorage.removeItem(`koko_active_tt_token_${clientId}`);
      localStorage.removeItem(`koko_active_tt_account_${clientId}`);
      localStorage.removeItem(`koko_active_tt_username_${clientId}`);
      localStorage.removeItem(`koko_meta_available_pages_${clientId}`);
      localStorage.removeItem(`koko_active_page_id_${clientId}`);
      localStorage.removeItem(`koko_active_page_name_${clientId}`);
      document.cookie = `koko_session_ig_connected_${encodeURIComponent(clientId)}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `koko_session_ig_account_${encodeURIComponent(clientId)}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `koko_active_ig_token_${encodeURIComponent(clientId)}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `koko_session_tt_connected_${encodeURIComponent(clientId)}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `koko_session_tt_account_${encodeURIComponent(clientId)}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `koko_active_tt_token_${encodeURIComponent(clientId)}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      const storedAccounts = localStorage.getItem('koko_connected_social_accounts');
      if (storedAccounts) {
        const accounts: SocialAccountData[] = JSON.parse(storedAccounts);
        const remaining = accounts.filter((a) => a.clientId !== clientId);
        localStorage.setItem('koko_connected_social_accounts', JSON.stringify(remaining));
      }
    } catch (e) {}

    // 5. Fire DB delete request
    try {
      await axios.delete(`/api/clients?id=${clientId}`);
    } catch (apiErr) {
      console.warn('API client delete call notice:', apiErr);
    }

    // 6. Update selectedClientId
    if (selectedClientId === clientId) {
      setSelectedClientId(updated[0]?.id || '');
    }
  };

  // Canonical OAuth origin helper: locks vercel.app deploys to the whitelisted production domain
  const getOAuthOrigin = () => {
    if (typeof window === 'undefined') return 'https://koko-digital-studio-insights.vercel.app';
    if (window.location.hostname === 'localhost') return 'http://localhost:3000';
    if (window.location.hostname.includes('github.io')) return 'https://kasumbaelijah.github.io/koko-digital-studio-insights';
    if (window.location.hostname.endsWith('vercel.app')) return 'https://koko-digital-studio-insights.vercel.app';
    return window.location.origin;
  };

  // 1. Connect TikTok directly by username/handle (bypasses developer app approval)
  const handleConnectTikTokDirect = async (identifier?: string) => {
    const rawTarget = identifier?.trim() || ttIdentifier.trim();
    if (!rawTarget) {
      alert('Please enter your TikTok username (e.g. @kokodigital) or phone number.');
      return;
    }
    if (!selectedClientId) {
      alert('Please create or select a client account first.');
      setShowAddClientModal(true);
      return;
    }

    const cleanUsername = rawTarget.replace(/^@/, '');
    const displayHandle = tiktokTab === 'phone' ? rawTarget : `@${cleanUsername}`;
    const directToken = `tt_direct_${cleanUsername}_${Date.now()}`;

    const newAccount: SocialAccountData = {
      id: `sa_${selectedClientId}_tiktok`,
      clientId: selectedClientId,
      platform: 'tiktok',
      platformAccountId: displayHandle,
      accessToken: directToken,
      tokenExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };

    try {
      const stored = localStorage.getItem('koko_connected_social_accounts');
      const list: SocialAccountData[] = stored ? JSON.parse(stored) : [];
      const updated = list.filter((a) => !(a.clientId === selectedClientId && a.platform === 'tiktok'));
      updated.push(newAccount);
      localStorage.setItem('koko_connected_social_accounts', JSON.stringify(updated));
      localStorage.setItem('koko_selected_client_id', selectedClientId);
      localStorage.setItem(`koko_active_tt_token_${selectedClientId}`, directToken);
      localStorage.setItem(`koko_active_tt_account_${selectedClientId}`, displayHandle);
      localStorage.setItem(`koko_active_tt_username_${selectedClientId}`, cleanUsername);

      // Persistent cookies (1-year duration) scoped strictly to selectedClientId
      const cookieAge = 31536000;
      document.cookie = `koko_selected_client_id=${encodeURIComponent(selectedClientId)}; path=/; max-age=${cookieAge}; SameSite=Lax`;
      document.cookie = `koko_session_tt_connected_${encodeURIComponent(selectedClientId)}=true; path=/; max-age=${cookieAge}; SameSite=Lax`;
      document.cookie = `koko_session_tt_account_${encodeURIComponent(selectedClientId)}=${encodeURIComponent(displayHandle)}; path=/; max-age=${cookieAge}; SameSite=Lax`;
      document.cookie = `koko_active_tt_token_${encodeURIComponent(selectedClientId)}=${encodeURIComponent(directToken)}; path=/; max-age=${cookieAge}; SameSite=Lax`;
      // Invalidate legacy unscoped global cookies
      document.cookie = `koko_session_tt_connected=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `koko_session_tt_account=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    } catch (e) {
      console.warn('LocalStorage save error on direct TikTok connect:', e);
    }

    setSocialAccounts((prev) => {
      const filtered = prev.filter((a) => !(a.clientId === selectedClientId && a.platform === 'tiktok'));
      return [...filtered, newAccount];
    });

    setTtIdentifier('');
    setTtPassword('');

    try {
      await axios.post('/api/social-accounts', {
        clientId: selectedClientId,
        platform: 'tiktok',
        platformAccountId: displayHandle,
        accessToken: directToken,
      });
    } catch (apiErr) {
      console.warn('API social-accounts notice:', apiErr);
    }
  };

  // 2. Connect Instagram directly by handle (alternative to Meta OAuth)
  const handleConnectInstagramDirect = async (identifier?: string) => {
    const rawTarget = identifier?.trim() || igIdentifier.trim();
    if (!rawTarget) {
      alert('Please enter an Instagram handle (e.g. @kokodigital).');
      return;
    }
    if (!selectedClientId) {
      alert('Please create or select a client account first.');
      setShowAddClientModal(true);
      return;
    }

    const cleanUsername = rawTarget.replace(/^@/, '');
    const displayHandle = `@${cleanUsername}`;
    const directToken = `ig_direct_${cleanUsername}_${Date.now()}`;

    const newAccount: SocialAccountData = {
      id: `sa_${selectedClientId}_instagram`,
      clientId: selectedClientId,
      platform: 'instagram',
      platformAccountId: displayHandle,
      accessToken: directToken,
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    };

    try {
      const stored = localStorage.getItem('koko_connected_social_accounts');
      const list: SocialAccountData[] = stored ? JSON.parse(stored) : [];
      const updated = list.filter((a) => !(a.clientId === selectedClientId && a.platform === 'instagram'));
      updated.push(newAccount);
      localStorage.setItem('koko_connected_social_accounts', JSON.stringify(updated));
      localStorage.setItem('koko_selected_client_id', selectedClientId);
      localStorage.setItem(`koko_active_ig_token_${selectedClientId}`, directToken);
      localStorage.setItem(`koko_active_ig_account_${selectedClientId}`, displayHandle);
      localStorage.setItem(`koko_active_ig_username_${selectedClientId}`, cleanUsername);

      // Persistent cookies (1-year duration) scoped strictly to selectedClientId
      const cookieAge = 31536000;
      document.cookie = `koko_selected_client_id=${encodeURIComponent(selectedClientId)}; path=/; max-age=${cookieAge}; SameSite=Lax`;
      document.cookie = `koko_session_ig_connected_${encodeURIComponent(selectedClientId)}=true; path=/; max-age=${cookieAge}; SameSite=Lax`;
      document.cookie = `koko_session_ig_account_${encodeURIComponent(selectedClientId)}=${encodeURIComponent(displayHandle)}; path=/; max-age=${cookieAge}; SameSite=Lax`;
      document.cookie = `koko_active_ig_token_${encodeURIComponent(selectedClientId)}=${encodeURIComponent(directToken)}; path=/; max-age=${cookieAge}; SameSite=Lax`;
      // Invalidate legacy unscoped global cookies
      document.cookie = `koko_session_ig_connected=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `koko_session_ig_account=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    } catch (e) {
      console.warn('LocalStorage save error on direct Instagram connect:', e);
    }

    setSocialAccounts((prev) => {
      const filtered = prev.filter((a) => !(a.clientId === selectedClientId && a.platform === 'instagram'));
      return [...filtered, newAccount];
    });

    setIgIdentifier('');
    setIgPassword('');

    try {
      await axios.post('/api/social-accounts', {
        clientId: selectedClientId,
        platform: 'instagram',
        platformAccountId: displayHandle,
        accessToken: directToken,
      });
    } catch (apiErr) {
      console.warn('API social-accounts notice:', apiErr);
    }
  };

  // 3. Save custom developer portal credentials to browser localStorage
  const handleSaveDeveloperKeys = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      if (tiktokClientKey.trim()) {
        localStorage.setItem('koko_tiktok_client_key', tiktokClientKey.trim());
      } else {
        localStorage.removeItem('koko_tiktok_client_key');
      }
      if (tiktokClientSecret.trim()) {
        localStorage.setItem('koko_tiktok_client_secret', tiktokClientSecret.trim());
      } else {
        localStorage.removeItem('koko_tiktok_client_secret');
      }
      if (metaAppId.trim()) {
        localStorage.setItem('koko_meta_app_id', metaAppId.trim());
      }
      if (metaAppSecret.trim()) {
        localStorage.setItem('koko_meta_app_secret', metaAppSecret.trim());
      }
      if (configIdInput.trim()) {
        localStorage.setItem('koko_meta_config_id', configIdInput.trim());
      }
      setCredentialsSaved(true);
      setTimeout(() => setCredentialsSaved(false), 3000);
    } catch (err) {
      console.warn('Error saving developer keys to localStorage:', err);
    }
  };

  // 4. Trigger Official Instagram Business Login (Direct Instagram Dialog)
  const triggerInstagramDirectLogin = () => {
    if (!selectedClientId) {
      alert('Please create or select a client account first.');
      setShowAddClientModal(true);
      return;
    }
    if (igIdentifier.trim()) {
      try {
        localStorage.setItem(`koko_pending_username_${selectedClientId}_instagram`, igIdentifier.trim());
      } catch (e) {}
    }

    const origin = getOAuthOrigin();
    const appId = (metaAppId || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '1762099978384335').trim();
    const redirectUri = encodeURIComponent(`${origin}/api/auth/callback/instagram`);
    const state = encodeURIComponent(selectedClientId);
    
    // Official Business Login for Instagram OAuth Dialog (with Instagram login)
    const igOauthUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish&state=${state}`;
    openCenteredPopup(igOauthUrl, 'InstagramOAuth');
  };

  // 5. Trigger Meta Facebook Business Login (With Config ID 1590313085890812)
  const triggerMetaFacebookLogin = (bypassConfigId: boolean = false) => {
    if (!selectedClientId) {
      alert('Please create or select a client account first.');
      setShowAddClientModal(true);
      return;
    }
    if (igIdentifier.trim()) {
      try {
        localStorage.setItem(`koko_pending_username_${selectedClientId}_instagram`, igIdentifier.trim());
      } catch (e) {}
    }

    const fbAppId = (metaAppId || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '1762099978384335').trim();
    const configId = bypassConfigId ? null : (configIdInput.trim() || process.env.NEXT_PUBLIC_INSTAGRAM_CONFIG_ID || '1590313085890812');

    const origin = getOAuthOrigin();
    const redirectUri = encodeURIComponent(`${origin}/api/auth/callback/facebook`);
    const state = encodeURIComponent(selectedClientId);
    
    const oauthUrl = configId
      ? `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fbAppId}&config_id=${configId}&redirect_uri=${redirectUri}&state=${state}&response_type=code`
      : `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${redirectUri}&state=${state}&scope=instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement&response_type=code`;

    openCenteredPopup(oauthUrl, 'MetaOAuth');
  };

  // 6. Trigger Direct TikTok OAuth Login Flow with PKCE
  const triggerTikTokOAuthLogin = async () => {
    if (!selectedClientId) {
      alert('Please create or select a client account first.');
      setShowAddClientModal(true);
      return;
    }
    const clientKey = (tiktokClientKey || process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'awzwmzqb12ijk009').trim();

    if (!clientKey || clientKey === 'your_tiktok_client_key' || clientKey.length < 5) {
      setShowSetupGuide(true);
      return;
    }

    const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem('tiktok_code_verifier', verifier);
    document.cookie = `tiktok_code_verifier=${verifier}; path=/; max-age=600; SameSite=Lax`;

    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const origin = getOAuthOrigin();
    const redirectUri = encodeURIComponent(`${origin}/api/auth/callback/tiktok`);
    const state = encodeURIComponent(selectedClientId);
    const scope = encodeURIComponent('user.info.basic,video.list');

    const oauthUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scope}&response_type=code&redirect_uri=${redirectUri}&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;

    openCenteredPopup(oauthUrl, 'TikTokOAuth');
  };

  // Trigger manual refresh for all active long-lived tokens
  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    try {
      await axios.post('/api/auth/refresh');
      const res = await axios.get(`/api/social-accounts?clientId=${selectedClientId}`);
      setSocialAccounts(res.data || []);
    } catch (err) {
      console.error('Error refreshing token:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const igAccount = socialAccounts.find((a) => a.platform === 'instagram');
  const ttAccount = socialAccounts.find((a) => a.platform === 'tiktok');

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-black mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading">
            Agency Account Access & Integrations
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Connect client Instagram & TikTok accounts with a direct 1-click agency login.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSetupGuide(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-100 text-gray-800 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-all cursor-pointer border border-gray-200"
          >
            <Key className="w-4 h-4 text-gray-600" />
            Developer Keys & Guide
          </button>
          <button
            onClick={() => handleRefreshToken()}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing Tokens...' : 'Refresh All Tokens'}
          </button>
        </div>
      </div>

      {/* Target Client Switcher & Add Client Control */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {clients.length > 0 ? (
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Client Account:</label>
            <select
              value={selectedClientId}
              onChange={(e) => handleSelectClient(e.target.value)}
              className="bg-gray-50 border border-gray-300 font-semibold text-gray-900 text-sm rounded-xl focus:ring-black focus:border-black p-2.5 outline-none cursor-pointer"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowAddClientModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Client
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-700">No client accounts added yet</span>
            <button
              onClick={() => setShowAddClientModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Client Account
            </button>
          </div>
        )}

        {selectedClient && (
          <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
            <span>Connecting for <strong className="text-gray-900">{selectedClient.name}</strong></span>
            <button
              onClick={() => handleDeleteClient(selectedClient.id)}
              title="Remove this client account"
              className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Connected Accounts Grid - Familiar Mobile Card Experiences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Instagram Account Card - Modeled after Dark Phone-Sleek Login UI */}
        <div className="bg-black border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between text-white relative overflow-hidden">
          {/* Top brand gradient line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600" />

          <div>
            {/* Top Bar: Client Scope & Status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-neutral-400">Workspace:</span>
                <span className="text-[11px] font-bold text-neutral-200">{selectedClient ? selectedClient.name : 'No Client Selected'}</span>
              </div>

              {igAccount ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950/90 text-emerald-400 text-xs font-bold rounded-full border border-emerald-800/80">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-900 text-neutral-400 text-xs font-bold rounded-full border border-neutral-800">
                  <AlertCircle className="w-3.5 h-3.5" /> Ready to Connect
                </span>
              )}
            </div>

            {/* Stylized Instagram Script Heading */}
            <div className="text-center my-6">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-pink-500 to-purple-500 bg-clip-text text-transparent font-serif italic">
                Instagram
              </span>
              <p className="text-[11px] text-neutral-400 mt-1">Professional & Creator Account Connection</p>
            </div>

            {igAccount ? (
              <div className="my-6 p-5 rounded-2xl bg-gradient-to-b from-emerald-950/40 via-neutral-900/60 to-neutral-900 border border-emerald-500/30 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white tracking-tight">Instagram Account Connected</h4>
                  <p className="text-base font-extrabold text-emerald-400 mt-1">
                    {igAccount.platformAccountId}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    60-day Long-Lived Token Active • Auto-Refreshing
                  </p>
                </div>

                {/* Page / Channel Selection Section */}
                <div className="pt-3 border-t border-emerald-500/20 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                      Source Page & Channel {availablePages.length > 0 ? `(${availablePages.length})` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={fetchAvailablePages}
                      disabled={isFetchingPages}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isFetchingPages ? 'animate-spin' : ''}`} />
                      {isFetchingPages ? 'Scanning...' : 'Scan Pages'}
                    </button>
                  </div>

                  {availablePages.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {availablePages.map((page) => {
                        const isCurrentActive =
                          activePageId === page.id ||
                          igAccount.pageId === page.id ||
                          igAccount.platformAccountId === `@${page.instagramBusinessAccount?.username}` ||
                          igAccount.platformAccountId === page.instagramBusinessAccount?.id ||
                          igAccount.platformAccountId === page.id;
                        const igUser = page.instagramBusinessAccount?.username;
                        const followers = page.instagramBusinessAccount?.followersCount;

                        return (
                          <div
                            key={page.id}
                            onClick={() => handleSelectPage(page)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                              isCurrentActive
                                ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-sm ring-1 ring-emerald-500/30'
                                : 'bg-black/40 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-850'
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold truncate">{page.name}</span>
                                {isCurrentActive && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                                {igUser ? (
                                  <span className="text-emerald-400/90 font-medium">
                                    @{igUser} {followers != null ? `• ${followers.toLocaleString()} followers` : ''}
                                  </span>
                                ) : (
                                  <span className="text-neutral-500">Facebook Page</span>
                                )}
                              </p>
                            </div>
                            <div>
                              {isCurrentActive ? (
                                <span className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-xs font-black">
                                  ✓
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                                >
                                  Select
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800 text-xs text-neutral-400">
                      <p>Active channel: <strong className="text-white">{igAccount.platformAccountId}</strong>.</p>
                      <button
                        type="button"
                        onClick={fetchAvailablePages}
                        disabled={isFetchingPages}
                        className="mt-1.5 text-emerald-400 hover:underline text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isFetchingPages ? 'animate-spin' : ''}`} />
                        {isFetchingPages ? 'Scanning Pages...' : 'Scan & Choose from Multiple Managed Pages'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2 space-y-2.5">
                  <Link
                    href="/"
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    View Live Analytics in Dashboard →
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDisconnectAccount('instagram')}
                      className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-rose-400 hover:text-rose-300 border border-neutral-800 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                    <button
                      type="button"
                      onClick={triggerInstagramDirectLogin}
                      className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Switch Account
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Form Input Mockups matching Screenshot 2 */}
                <div className="space-y-3 mb-2">
                  <div>
                    <input
                      type="text"
                      value={igIdentifier}
                      onChange={(e) => setIgIdentifier(e.target.value)}
                      placeholder="Phone number, username or email address"
                      className="w-full bg-[#1c1c1e] text-white placeholder-neutral-500 text-xs rounded-xl px-3.5 py-3 border border-neutral-800 focus:border-neutral-600 outline-none transition-all"
                    />
                  </div>

                  <div className="relative">
                    <input
                      type={showIgPassword ? "text" : "password"}
                      value={igPassword}
                      onChange={(e) => setIgPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-[#1c1c1e] text-white placeholder-neutral-500 text-xs rounded-xl px-3.5 py-3 border border-neutral-800 focus:border-neutral-600 outline-none transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowIgPassword(!showIgPassword)}
                      className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300"
                    >
                      {showIgPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowSetupGuide(true)}
                      className="text-[11px] text-neutral-400 hover:text-white transition-colors"
                    >
                      Need help with setup?
                    </button>
                  </div>
                </div>

                {/* Primary Action Button: Purple to Crimson Gradient */}
                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (igIdentifier.trim()) {
                        handleConnectInstagramDirect();
                      } else {
                        triggerInstagramDirectLogin();
                      }
                    }}
                    className="w-full py-3 bg-gradient-to-r from-[#692795] via-[#a8256b] to-[#d62839] hover:opacity-95 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {igIdentifier.trim() ? 'Connect Instagram Profile' : 'login'}
                  </button>

                  {/* OR Divider Line */}
                  <div className="flex items-center my-3">
                    <div className="flex-grow border-t border-neutral-800" />
                    <span className="px-3 text-[10px] font-bold text-neutral-500 tracking-wider">OR</span>
                    <div className="flex-grow border-t border-neutral-800" />
                  </div>

                  {/* Meta Business Login Button from Screenshot 2 */}
                  <button
                    type="button"
                    onClick={() => triggerMetaFacebookLogin(false)}
                    className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v7.001C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    login with meta
                  </button>

                  {/* Direct Scopes Button (Bypasses email check completely) */}
                  <button
                    type="button"
                    onClick={() => triggerMetaFacebookLogin(true)}
                    className="w-full py-2 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800/80 text-[11px] font-medium rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    login with direct scopes (bypasses email)
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Card Footer Info */}
          <div className="mt-6 pt-4 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500">
            <span>Account: <strong className="text-neutral-300">{igAccount?.platformAccountId || 'Not Connected'}</strong></span>
            <span className="text-emerald-500 font-medium">{igAccount ? '60-Day Active' : 'Auto-Sync Ready'}</span>
          </div>
        </div>

        {/* TikTok Account Card - Tabbed Login & Connected Channel UI */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between text-gray-900 relative">
          <div>
            {/* Top Bar: Back Chevron, Title "Log in", and Help Question Mark */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setTiktokTab(tiktokTab === 'phone' ? 'email' : 'phone')}
                className="text-gray-600 hover:text-black p-1 transition-colors"
                title="Toggle Login Method"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <h3 className="text-base font-extrabold text-gray-900 font-heading">
                {ttAccount ? 'TikTok Account' : 'Log in'}
              </h3>

              <button
                type="button"
                onClick={() => setShowSetupGuide(true)}
                className="text-gray-400 hover:text-black p-1 transition-colors"
                title="Developer App Keys & Setup Guide"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            {ttAccount ? (
              /* Connected TikTok Channel UI */
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      TikTok Connected
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                      365-Day Active
                    </span>
                  </div>
                  <p className="text-lg font-extrabold text-gray-900 font-heading mt-2">
                    {ttAccount.platformAccountId}
                  </p>
                  <p className="text-xs text-emerald-700 font-medium mt-1">
                    ✓ Active Channel • Ready for Live Sync & Analytics
                  </p>
                </div>

                <div className="pt-2 space-y-2.5">
                  <Link
                    href="/"
                    className="w-full py-3 bg-black hover:bg-neutral-800 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    View Live Analytics in Dashboard →
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDisconnectAccount('tiktok')}
                      className="flex-1 py-2.5 bg-gray-100 hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-gray-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDisconnectAccount('tiktok')}
                      className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Switch Account
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Unconnected Login Card Matching Familiar Mobile Interface */
              <>
                {/* Interactive Tabs from Screenshot 1: Phone | Email / Username */}
                <div className="flex border-b border-gray-200 mb-6">
                  <button
                    type="button"
                    onClick={() => setTiktokTab('phone')}
                    className={`w-1/2 py-2.5 text-center text-xs font-bold transition-all relative ${
                      tiktokTab === 'phone'
                        ? 'text-gray-900'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Phone
                    {tiktokTab === 'phone' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTiktokTab('email')}
                    className={`w-1/2 py-2.5 text-center text-xs font-bold transition-all relative ${
                      tiktokTab === 'email'
                        ? 'text-gray-900'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Email / Username
                    {tiktokTab === 'email' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                    )}
                  </button>
                </div>

                {/* Form Input Fields */}
                <div className="space-y-4 mb-4">
                  {tiktokTab === 'phone' ? (
                    <div className="flex items-center border-b border-gray-200 pb-2.5">
                      <span className="text-xs font-bold text-gray-700 pr-2 border-r border-gray-200 mr-2">+256</span>
                      <input
                        type="tel"
                        value={ttIdentifier}
                        onChange={(e) => setTtIdentifier(e.target.value)}
                        placeholder="Phone number"
                        className="w-full text-xs text-gray-900 placeholder-gray-400 outline-none font-medium bg-transparent"
                      />
                    </div>
                  ) : (
                    <div className="border-b border-gray-200 pb-2.5">
                      <input
                        type="text"
                        value={ttIdentifier}
                        onChange={(e) => setTtIdentifier(e.target.value)}
                        placeholder="Email or @username (e.g. @kokodigital)"
                        className="w-full text-xs text-gray-900 placeholder-gray-400 outline-none font-medium bg-transparent"
                      />
                    </div>
                  )}

                  <div className="border-b border-gray-200 pb-2.5 flex items-center justify-between">
                    <input
                      type={showTtPassword ? "text" : "password"}
                      value={ttPassword}
                      onChange={(e) => setTtPassword(e.target.value)}
                      placeholder="Password (optional for direct handle link)"
                      className="w-full text-xs text-gray-900 placeholder-gray-400 outline-none font-medium bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTtPassword(!showTtPassword)}
                      className="text-gray-400 hover:text-gray-600 ml-2"
                    >
                      {showTtPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <button
                      type="button"
                      onClick={() => setShowSetupGuide(true)}
                      className="text-gray-500 hover:text-black hover:underline"
                    >
                      Configure Developer Keys
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSetupGuide(true)}
                      className="font-semibold text-gray-900 hover:underline"
                    >
                      Need help?
                    </button>
                  </div>
                </div>

                {/* Primary Action Button: Connect Directly */}
                <div className="mt-5 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (ttIdentifier.trim()) {
                        handleConnectTikTokDirect();
                      } else {
                        triggerTikTokOAuthLogin();
                      }
                    }}
                    className="w-full py-3.5 bg-black hover:bg-neutral-800 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-[0.99]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {ttIdentifier.trim() ? 'Connect TikTok Profile' : 'Log in with TikTok'}
                  </button>

                  {/* OR Divider Line */}
                  <div className="flex items-center my-2">
                    <div className="flex-grow border-t border-gray-200" />
                    <span className="px-2 text-[10px] font-bold text-gray-400 tracking-wider">OR DEVELOPER OAUTH</span>
                    <div className="flex-grow border-t border-gray-200" />
                  </div>

                  {/* Secondary Action Button: TikTok Developer OAuth */}
                  <button
                    type="button"
                    onClick={triggerTikTokOAuthLogin}
                    className="w-full py-2.5 bg-[#F1F1F2] hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Log in with TikTok Developer App (OAuth)
                  </button>

                  <p className="text-[10px] text-center text-gray-400">
                    Direct handle connection or TikTok Display API v2 (PKCE SHA-256)
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Card Footer Info */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Account: <strong className="text-gray-900">{ttAccount?.platformAccountId || 'Not Connected'}</strong></span>
            {ttAccount ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 365-Day Active
              </span>
            ) : (
              <span className="text-amber-600 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Ready to Connect
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Add New Client Account Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative border border-gray-100">
            <button
              onClick={() => setShowAddClientModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-black p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 font-heading">Add New Client Account</h3>
                <p className="text-xs text-gray-500">Create a brand workspace to connect social channels</p>
              </div>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Client / Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Koko Studio Client Z"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-3 text-gray-900 font-medium focus:ring-black focus:border-black outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Logo Image URL (Optional)</label>
                <input
                  type="text"
                  placeholder="/logos/default.svg or https://..."
                  value={newClientLogo}
                  onChange={(e) => setNewClientLogo(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-3 text-gray-900 font-medium focus:ring-black focus:border-black outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="w-1/2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Developer App Credentials & Setup Guide Modal */}
      {showSetupGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative max-h-[85vh] overflow-y-auto border border-gray-100">
            <button
              onClick={() => setShowSetupGuide(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-black p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-900 flex items-center justify-center font-bold">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 font-heading">
                  Developer App Keys & Setup Guide
                </h3>
                <p className="text-xs text-gray-500">Configure custom OAuth credentials or connect profiles directly</p>
              </div>
            </div>

            {/* Explanation of the TikTok Error */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <strong className="font-bold text-amber-950 block mb-1">
                    Why did TikTok show: &quot;We couldn&apos;t log in with TikTok • client_key&quot;?
                  </strong>
                  <p className="leading-relaxed mb-2">
                    TikTok OAuth 2.0 strictly verifies that your request contains a registered <strong>Client Key</strong> from an approved app created at <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold">developers.tiktok.com</code>.
                  </p>
                  <p className="leading-relaxed font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                    💡 <strong>Instant Connection (No Developer Account Needed):</strong> Simply enter your TikTok username (e.g. <code>@kokodigital</code>) in the TikTok card on the settings page and click &quot;Connect TikTok Profile&quot; to link your account immediately!
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Developer Credentials Form */}
            <div className="mb-6 p-5 bg-gray-50 border border-gray-200 rounded-2xl">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Key className="w-4 h-4 text-black" />
                Configure Custom Developer App Keys
              </h4>
              <p className="text-xs text-gray-500 mb-4">
                If you have created your own developer applications, you can save your keys here. They will be stored securely in your browser session.
              </p>

              <form onSubmit={handleSaveDeveloperKeys} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      TikTok Client Key
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. awzw..."
                      value={tiktokClientKey}
                      onChange={(e) => setTiktokClientKey(e.target.value)}
                      className="w-full bg-white border border-gray-300 text-xs rounded-xl p-2.5 text-gray-900 font-mono outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      TikTok Client Secret
                    </label>
                    <input
                      type="password"
                      placeholder="e.g. 48f9..."
                      value={tiktokClientSecret}
                      onChange={(e) => setTiktokClientSecret(e.target.value)}
                      className="w-full bg-white border border-gray-300 text-xs rounded-xl p-2.5 text-gray-900 font-mono outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Meta / Instagram App ID
                    </label>
                    <input
                      type="text"
                      placeholder="1762099978384335"
                      value={metaAppId}
                      onChange={(e) => setMetaAppId(e.target.value)}
                      className="w-full bg-white border border-gray-300 text-xs rounded-xl p-2.5 text-gray-900 font-mono outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Meta Config ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="1590313085890812"
                      value={configIdInput}
                      onChange={(e) => setConfigIdInput(e.target.value)}
                      className="w-full bg-white border border-gray-300 text-xs rounded-xl p-2.5 text-gray-900 font-mono outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-emerald-600 font-bold">
                    {credentialsSaved && '✓ Credentials saved to browser storage!'}
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    Save Developer Keys
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-6 text-xs text-gray-700 leading-relaxed">
              {/* Business Login for Instagram Setup Instructions */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  Business Login for Instagram (Instagram API with Instagram Login)
                </h4>
                <ol className="list-decimal list-inside space-y-1 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <li>Go to <strong>developers.facebook.com</strong> and open your Meta App.</li>
                  <li>In App Dashboard, navigate to <strong>Instagram &gt; API setup with Instagram login &gt; 3. Set up Instagram business login &gt; Business login settings</strong>.</li>
                  <li>In <strong>OAuth redirect URIs</strong>, add: <code>https://koko-digital-studio-insights.vercel.app/api/auth/callback/facebook</code> and <code>http://localhost:3000/api/auth/callback/facebook</code>.</li>
                  <li>Required new permissions: <code>instagram_basic</code>, <code>instagram_manage_insights</code>, <code>pages_show_list</code>.</li>
                  <li>Click <strong>login with meta</strong> in Settings to authenticate with automatic 60-day token renewal.</li>
                </ol>
              </div>

              {/* TikTok Setup Instructions */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-bold">2</span>
                  TikTok for Developers (Display API v2)
                </h4>
                <ol className="list-decimal list-inside space-y-1 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <li>Go to <strong>developers.tiktok.com</strong> and click <strong>Create App</strong>.</li>
                  <li>Name: <code>Koko Digital Studio Insights</code>, Category: <code>Business / Analytics</code>.</li>
                  <li>Add Product: <strong>TikTok Display API v2</strong>. Add Scopes: <code>user.info.basic</code>, <code>video.list</code>.</li>
                  <li>Set Redirect URI: <code>https://koko-digital-studio-insights.vercel.app/api/auth/callback/tiktok</code> and <code>http://localhost:3000/api/auth/callback/tiktok</code>.</li>
                  <li>Copy your <strong>Client Key</strong> and <strong>Client Secret</strong> into the inputs above and click <strong>Save Developer Keys</strong>.</li>
                </ol>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowSetupGuide(false)}
                className="px-5 py-2.5 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
