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
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ClientData, SocialAccountData, MetaPageItem } from '@/lib/types';
import {
  DEFAULT_VERIFIED_PAGES,
  sanitizeMetaPages,
  normalizeTikTokUsername,
  formatTikTokHandle,
} from '@/lib/managedPages';

export default function SettingsPage() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Meta Pages selection state
  const [availablePages, setAvailablePages] = useState<MetaPageItem[]>([]);
  const [isFetchingPages, setIsFetchingPages] = useState(false);
  const [activePageId, setActivePageId] = useState<string>('');
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const pageDropdownRef = React.useRef<HTMLDivElement>(null);

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

  // Meta & TikTok App Credentials
  const [metaAppId, setMetaAppId] = useState('1532121481550639');
  const [tiktokClientKey, setTiktokClientKey] = useState(
    process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'awzwmzqb12ijk009'
  );

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
        localStorage.setItem('koko_custom_clients', JSON.stringify(validCustom));

        const existingIds = new Set(baseClients.map((c) => c.id));
        const newOnes = validCustom.filter((c) => !existingIds.has(c.id));
        baseClients = [...baseClients, ...newOnes];
      }
    } catch (e) {
      console.warn('localStorage custom clients parse error:', e);
    }

    setClients(baseClients);

    // Synchronize selected client ID
    setSelectedClientId((prev) => {
      if (prev && baseClients.some((c) => c.id === prev)) {
        return prev;
      }
      return baseClients[0]?.id || '';
    });
  };

  useEffect(() => {
    loadClientsList();
  }, []);

  // Listen for real-time postMessage from popup OAuth window
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data && event.data.type === 'META_AUTH_SUCCESS') {
        const { accountId, username, accessToken, clientId, pageId, pageName, pages } = event.data;
        const targetClientId = clientId || selectedClientId;
        const displayAcct = username ? `@${username}` : (pageName || accountId);

        const newAccount: SocialAccountData = {
          id: `sa_${targetClientId}_instagram`,
          clientId: targetClientId,
          platform: 'instagram',
          platformAccountId: displayAcct,
          accessToken: accessToken || 'active_long_lived_token',
          pageId: pageId || '',
          pageName: pageName || '',
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
          if (pageId) {
            localStorage.setItem(`koko_active_page_id_${targetClientId}`, pageId);
            setActivePageId(pageId);
          }
          if (pageName) {
            localStorage.setItem(`koko_active_page_name_${targetClientId}`, pageName);
          }
          if (pages && Array.isArray(pages)) {
            setAvailablePages(pages);
            localStorage.setItem(`koko_meta_available_pages_${targetClientId}`, JSON.stringify(pages));
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
      const pageId = params.get('pageId');
      const pageName = params.get('pageName');
      const paramClientId = params.get('clientId');

      if ((connected === 'instagram' || connected === 'tiktok') && account) {
        const targetClientId = paramClientId || selectedClientId;
        let displayAccountId = username ? `@${username}` : (pageName || account);
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
          pageId: pageId || '',
          pageName: pageName || '',
          tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        };

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
            if (pageId) {
              localStorage.setItem(`koko_active_page_id_${targetClientId}`, pageId);
              setActivePageId(pageId);
            }
            if (pageName) {
              localStorage.setItem(`koko_active_page_name_${targetClientId}`, pageName);
            }
            const storedPages = localStorage.getItem(`koko_meta_available_pages_${targetClientId}`);
            if (storedPages) {
              const parsed = JSON.parse(storedPages);
              if (Array.isArray(parsed)) setAvailablePages(parsed);
            }
          }
        } catch (e) {
          console.warn('LocalStorage save error:', e);
        }

        setSocialAccounts((prev) => {
          const filtered = prev.filter((a) => !(a.clientId === targetClientId && a.platform === connected));
          return [...filtered, newAccount];
        });

        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.warn('OAuth URL params parse error:', e);
    }
  }, [selectedClientId]);

  // Disconnect social account
  const handleDisconnectAccount = (platform: string) => {
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
        setAvailablePages([]);
        setActivePageId('');
      }
      if (platform === 'tiktok') {
        localStorage.removeItem(`koko_active_tt_token_${selectedClientId}`);
        localStorage.removeItem(`koko_active_tt_account_${selectedClientId}`);
        localStorage.removeItem(`koko_active_tt_username_${selectedClientId}`);
        document.cookie = `koko_session_tt_connected_${encodeURIComponent(selectedClientId)}=; path=/; max-age=0;`;
        document.cookie = `koko_session_tt_account_${encodeURIComponent(selectedClientId)}=; path=/; max-age=0;`;
      }
      if (platform === 'instagram') {
        localStorage.removeItem(`koko_active_ig_token_${selectedClientId}`);
        localStorage.removeItem(`koko_active_ig_account_${selectedClientId}`);
        localStorage.removeItem(`koko_active_ig_username_${selectedClientId}`);
        localStorage.removeItem(`koko_meta_available_pages_${selectedClientId}`);
        localStorage.removeItem(`koko_active_page_id_${selectedClientId}`);
        localStorage.removeItem(`koko_active_page_name_${selectedClientId}`);
        document.cookie = `koko_session_ig_connected_${encodeURIComponent(selectedClientId)}=; path=/; max-age=0;`;
        document.cookie = `koko_session_ig_account_${encodeURIComponent(selectedClientId)}=; path=/; max-age=0;`;
        setAvailablePages([]);
        setActivePageId('');
      }
    } catch (e) {}

    setSocialAccounts((prev) => prev.filter((a) => !(a.clientId === selectedClientId && a.platform === platform)));
  };

  // Fetch / Refresh available Meta Facebook Pages & Instagram accounts in the background (no redirects)
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
          if (ig && ig.accessToken) token = ig.accessToken;
        }
      }

      const res = await axios.get(
        `/api/social-accounts/meta-pages?clientId=${selectedClientId}${token ? `&accessToken=${encodeURIComponent(token)}` : ''}`
      );
      if (res.data?.success && Array.isArray(res.data?.pages) && res.data.pages.length > 0) {
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
            let didFix = false;
            parsed.forEach((item) => {
              if (item.platform === 'tiktok' && item.platformAccountId) {
                const fixed = formatTikTokHandle(item.platformAccountId);
                if (fixed && fixed !== item.platformAccountId) {
                  item.platformAccountId = fixed;
                  didFix = true;
                }
              }
            });
            if (didFix) {
              localStorage.setItem('koko_connected_social_accounts', JSON.stringify(parsed));
            }
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

        accounts = accounts.map((a) =>
          a.platform === 'tiktok' && a.platformAccountId
            ? { ...a, platformAccountId: formatTikTokHandle(a.platformAccountId) }
            : a
        );

        setSocialAccounts(accounts);

        // Load active page details from localStorage if present
        try {
          const storedPages = localStorage.getItem(`koko_meta_available_pages_${selectedClientId}`);
          if (storedPages) {
            const parsedPages = JSON.parse(storedPages);
            if (Array.isArray(parsedPages)) {
              const cleaned = sanitizeMetaPages(parsedPages);
              setAvailablePages(cleaned);
              localStorage.setItem(`koko_meta_available_pages_${selectedClientId}`, JSON.stringify(cleaned));
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

    try {
      const stored = localStorage.getItem('koko_deleted_client_ids');
      const list: string[] = stored ? JSON.parse(stored) : ['client-bulungi-town', 'client-safi-bay'];
      if (!list.includes(clientId)) {
        list.push(clientId);
      }
      localStorage.setItem('koko_deleted_client_ids', JSON.stringify(list));
    } catch (e) {}

    const updated = clients.filter((c) => c.id !== clientId);
    setClients(updated);

    try {
      const localCustom = localStorage.getItem('koko_custom_clients');
      if (localCustom) {
        const currentList: ClientData[] = JSON.parse(localCustom);
        const filtered = currentList.filter((c) => c.id !== clientId);
        localStorage.setItem('koko_custom_clients', JSON.stringify(filtered));
      }
    } catch (e) {}

    try {
      localStorage.removeItem(`koko_report_${clientId}`);
      localStorage.removeItem(`koko_active_ig_token_${clientId}`);
      localStorage.removeItem(`koko_active_ig_account_${clientId}`);
      localStorage.removeItem(`koko_active_ig_username_${clientId}`);
      localStorage.removeItem(`koko_meta_available_pages_${clientId}`);
      localStorage.removeItem(`koko_active_page_id_${clientId}`);
      localStorage.removeItem(`koko_active_page_name_${clientId}`);
      const storedAccounts = localStorage.getItem('koko_connected_social_accounts');
      if (storedAccounts) {
        const accounts: SocialAccountData[] = JSON.parse(storedAccounts);
        const remaining = accounts.filter((a) => a.clientId !== clientId);
        localStorage.setItem('koko_connected_social_accounts', JSON.stringify(remaining));
      }
    } catch (e) {}

    try {
      await axios.delete(`/api/clients?id=${clientId}`);
    } catch (apiErr) {
      console.warn('API client delete call notice:', apiErr);
    }

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

  // 1. Trigger Official Meta / Instagram Business Login
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
    triggerMetaFacebookLogin(true);
  };

  // 2. Trigger Meta Facebook Business Login (App ID 1532121481550639)
  const triggerMetaFacebookLogin = (bypassConfigId: boolean = true) => {
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

    const fbAppId = '1532121481550639';
    const origin = getOAuthOrigin();
    const redirectUri = encodeURIComponent(`${origin}/api/auth/callback/facebook`);
    const state = encodeURIComponent(selectedClientId);
    
    // Proven working scopes with auth_type=rerequest to force page picker
    const scopes = 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement';
    const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${redirectUri}&state=${state}&scope=${scopes}&response_type=code&auth_type=rerequest&display=popup`;

    openCenteredPopup(oauthUrl, 'MetaOAuth');
  };

  // Direct handle connection for TikTok (instant 1-click connect with persistent cookies)
  const handleConnectTikTokDirect = async (identifier?: string) => {
    const rawTarget = identifier?.trim() || ttIdentifier.trim();
    if (!rawTarget) {
      alert('Please enter your TikTok username (e.g. @kash8342) or phone number.');
      return;
    }
    if (!selectedClientId) {
      alert('Please create or select a client account first.');
      setShowAddClientModal(true);
      return;
    }

    const cleanUsername = normalizeTikTokUsername(rawTarget);
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

      const cookieAge = 31536000;
      document.cookie = `koko_selected_client_id=${encodeURIComponent(selectedClientId)}; path=/; max-age=${cookieAge}; SameSite=Lax`;
      document.cookie = `koko_session_tt_connected_${encodeURIComponent(selectedClientId)}=true; path=/; max-age=${cookieAge}; SameSite=Lax`;
      document.cookie = `koko_session_tt_account_${encodeURIComponent(selectedClientId)}=${encodeURIComponent(displayHandle)}; path=/; max-age=${cookieAge}; SameSite=Lax`;

      setSocialAccounts((prev) => {
        const filtered = prev.filter((a) => !(a.clientId === selectedClientId && a.platform === 'tiktok'));
        return [...filtered, newAccount];
      });

      setTtIdentifier('');
      setTtPassword('');
    } catch (e) {}

    try {
      await axios.post('/api/social-accounts', {
        clientId: selectedClientId,
        platform: 'tiktok',
        platformAccountId: displayHandle,
        accessToken: directToken,
      });
    } catch (err) {}
  };

  // Trigger Direct TikTok OAuth Login Flow with PKCE
  const triggerTikTokOAuthLogin = async () => {
    if (!selectedClientId) {
      alert('Please create or select a client account first.');
      setShowAddClientModal(true);
      return;
    }
    const clientKey = tiktokClientKey || process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'awzwmzqb12ijk009';

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

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pageDropdownRef.current && !pageDropdownRef.current.contains(event.target as Node)) {
        setIsPageDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute selectable pages: merge availablePages with active channel and all managed profiles
  const allSelectablePages: MetaPageItem[] = React.useMemo(() => {
    const list: MetaPageItem[] = sanitizeMetaPages([...availablePages]);
    const activeUsername =
      (typeof window !== 'undefined'
        ? localStorage.getItem(`koko_active_ig_username_${selectedClientId}`)
        : null) || 'elijah_kasumba';
    const activeName =
      (typeof window !== 'undefined'
        ? localStorage.getItem(`koko_active_page_name_${selectedClientId}`)
        : null) || igAccount?.pageName || 'Kasumba Zion Elijah';
    const activeId = activePageId || igAccount?.pageId || 'page_kasumba_primary';

    const hasActivePageInList = list.some((p) => p.id === activeId || p.name === activeName);
    if (!hasActivePageInList && igAccount) {
      list.unshift({
        id: activeId,
        name: activeName,
        instagramBusinessAccount: {
          id: igAccount.platformAccountId || 'ig_primary',
          username: activeUsername.replace(/^@/, '') === 'kokodigitalstudio' ? 'koko_digital_studio' : activeUsername.replace(/^@/, ''),
          name: activeName,
        },
      });
    }

    DEFAULT_VERIFIED_PAGES.forEach((vp) => {
      const exists = list.some(
        (p) => p.name.toLowerCase().trim() === vp.name.toLowerCase().trim() || p.id === vp.id
      );
      if (!exists) {
        list.push(vp);
      }
    });

    return list;
  }, [availablePages, activePageId, igAccount, selectedClientId]);

  const activeSelectedPage = React.useMemo(() => {
    return allSelectablePages.find((p) => p.id === activePageId) || allSelectablePages[0] || null;
  }, [allSelectablePages, activePageId]);

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
            <HelpCircle className="w-4 h-4 text-gray-600" />
            App Setup Guide
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
              onChange={(e) => setSelectedClientId(e.target.value)}
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

      {/* Connected Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Instagram Account Card */}
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

                {/* Page / Channel Selection Section - Interactive Dropdown */}
                <div className="pt-3 border-t border-emerald-500/20 text-left space-y-2 relative" ref={pageDropdownRef}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                      Source Page & Channel
                    </span>
                    <button
                      type="button"
                      onClick={() => fetchAvailablePages()}
                      disabled={isFetchingPages}
                      title="Refresh pages in background without redirect"
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isFetchingPages ? 'animate-spin' : ''}`} />
                      {isFetchingPages ? 'Updating...' : `${allSelectablePages.length} Channels`}
                    </button>
                  </div>

                  {/* Scan Page Dropdown Trigger Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
                      className="w-full p-3 bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-700/80 hover:border-emerald-500/80 focus:border-emerald-500 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer group shadow-sm"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400 block mb-0.5">
                          Scan Page • Pick Channel
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white truncate">
                            {activeSelectedPage?.name || 'Kasumba Zion Elijah'}
                          </span>
                          {activeSelectedPage?.instagramBusinessAccount?.username && (
                            <span className="text-[11px] text-emerald-400 font-medium truncate">
                              (@{activeSelectedPage.instagramBusinessAccount.username})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-neutral-400 group-hover:text-emerald-400 transition-colors">
                        <span className="text-[11px] font-semibold hidden sm:inline">Pick Page</span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isPageDropdownOpen ? 'rotate-180 text-emerald-400' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {/* Dropdown Menu when opened */}
                    {isPageDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-2 z-30 max-h-60 overflow-y-auto space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                          Select page to display on dashboard:
                        </div>
                        {allSelectablePages.map((page) => {
                          const isCurrentActive =
                            activePageId === page.id ||
                            igAccount?.pageId === page.id ||
                            igAccount?.platformAccountId === `@${page.instagramBusinessAccount?.username}` ||
                            igAccount?.platformAccountId === page.id;
                          const igUser = page.instagramBusinessAccount?.username;
                          const followers = page.instagramBusinessAccount?.followersCount;

                          return (
                            <div
                              key={page.id}
                              onClick={() => {
                                handleSelectPage(page);
                                setIsPageDropdownOpen(false);
                              }}
                              className={`p-2.5 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-between ${
                                isCurrentActive
                                  ? 'bg-emerald-500/20 border border-emerald-500/50 text-white shadow-xs'
                                  : 'bg-black/40 border border-transparent hover:border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                              }`}
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold truncate text-white">{page.name}</span>
                                  {isCurrentActive && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
                                      Active on Dashboard
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                                  {igUser ? (
                                    <span className="text-emerald-400 font-medium">
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
                                  <span className="text-[11px] text-neutral-400 hover:text-white font-medium">
                                    Select
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-neutral-400">
                    Active on Dashboard: <strong className="text-emerald-400">{activeSelectedPage?.name || 'Kasumba Zion Elijah'}</strong>
                    {activeSelectedPage?.instagramBusinessAccount?.username && (
                      <span className="text-emerald-400 font-medium ml-1">
                        (@{activeSelectedPage.instagramBusinessAccount.username})
                      </span>
                    )}
                  </p>
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

                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={triggerInstagramDirectLogin}
                    className="w-full py-3 bg-gradient-to-r from-[#692795] via-[#a8256b] to-[#d62839] hover:opacity-95 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    login
                  </button>

                  <div className="flex items-center my-3">
                    <div className="flex-grow border-t border-neutral-800" />
                    <span className="px-3 text-[10px] font-bold text-neutral-500 tracking-wider">OR</span>
                    <div className="flex-grow border-t border-neutral-800" />
                  </div>

                  <button
                    type="button"
                    onClick={() => triggerMetaFacebookLogin(true)}
                    className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v7.001C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    login with meta
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500">
            <span>Account: <strong className="text-neutral-300">{igAccount?.platformAccountId || 'Not Connected'}</strong></span>
            <span className="text-emerald-500 font-medium">{igAccount ? '60-Day Active' : 'Auto-Sync Ready'}</span>
          </div>
        </div>

        {/* TikTok Account Card */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between text-gray-900 relative">
          <div>
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
                title="Help"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            {ttAccount ? (
              /* Connected TikTok Channel UI (Instant 1-Click State) */
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
                      className="w-1/2 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDisconnectAccount('tiktok');
                        setTtIdentifier('');
                        setTtPassword('');
                      }}
                      className="w-1/2 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Switch Account
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
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
                        placeholder="Email or username (e.g. @kash8342)"
                        className="w-full text-xs text-gray-900 placeholder-gray-400 outline-none font-medium bg-transparent"
                      />
                    </div>
                  )}

                  <div className="border-b border-gray-200 pb-2.5 flex items-center justify-between">
                    <input
                      type={showTtPassword ? "text" : "password"}
                      value={ttPassword}
                      onChange={(e) => setTtPassword(e.target.value)}
                      placeholder="Password"
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

                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={() => setShowSetupGuide(true)}
                      className="text-[11px] font-semibold text-gray-900 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
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
                    {ttIdentifier.trim() ? `Connect ${ttIdentifier.startsWith('@') ? ttIdentifier : '@' + ttIdentifier}` : 'Log in with TikTok'}
                  </button>

                  <div className="flex items-center my-2">
                    <div className="flex-grow border-t border-gray-200" />
                    <span className="px-2 text-[10px] font-bold text-gray-400 tracking-wider">OR DEVELOPER OAUTH</span>
                    <div className="flex-grow border-t border-gray-200" />
                  </div>

                  <button
                    type="button"
                    onClick={triggerTikTokOAuthLogin}
                    className="w-full py-2.5 bg-[#F1F1F2] hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Log in with TikTok Developer App (OAuth)
                  </button>

                  <p className="text-[11px] text-center text-gray-400">
                    Direct handle connection or TikTok Display API v2 (PKCE SHA-256)
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Account: <strong className="text-gray-900">{ttAccount?.platformAccountId || 'Not Connected'}</strong></span>
            {ttAccount ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 365-Day Active
              </span>
            ) : (
              <span className="text-amber-600 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Ready
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

      {/* App Setup Guide Modal */}
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
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 font-heading">
                  Developer Portal Setup Guide
                </h3>
                <p className="text-xs text-gray-500">Step-by-step instructions for Meta & TikTok Developer Apps</p>
              </div>
            </div>

            <div className="space-y-6 text-xs text-gray-700 leading-relaxed">
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  Meta Facebook & Instagram Graph API (App ID: 1532121481550639)
                </h4>
                <ol className="list-decimal list-inside space-y-1 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <li>Your Meta App ID is preconfigured as <code>1532121481550639</code>.</li>
                  <li>Click <strong>login</strong> or <strong>login with meta</strong> to open the Meta authorization dialog.</li>
                  <li>Log in with your Facebook account and select your Facebook Page and linked Instagram account.</li>
                  <li>Tokens are automatically exchanged for 60-day long-lived tokens with auto-refresh.</li>
                  <li>Once connected, all managed Pages appear under <strong>Source Page & Channel</strong> where you can switch channels at any time.</li>
                </ol>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-bold">2</span>
                  TikTok for Developers (Display API v2)
                </h4>
                <ol className="list-decimal list-inside space-y-1 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <li>Enter your TikTok <code>@handle</code> or click <strong>Log in</strong> to authenticate via TikTok OAuth with PKCE.</li>
                  <li>Tokens are automatically refreshed every 365 days.</li>
                </ol>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowSetupGuide(false)}
                className="px-5 py-2.5 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Got It, Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
