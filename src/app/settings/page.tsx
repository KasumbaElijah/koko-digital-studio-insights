'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  ArrowLeft,
  Key,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Lock,
  Building,
  Plus,
  Trash2,
} from 'lucide-react';
import { INITIAL_CLIENTS } from '@/lib/mockData';
import { ClientData, SocialAccountData } from '@/lib/types';

export default function SettingsPage() {
  const [clients, setClients] = useState<ClientData[]>(INITIAL_CLIENTS);
  const [selectedClientId, setSelectedClientId] = useState<string>(INITIAL_CLIENTS[0].id);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal States
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState<'instagram' | 'tiktok' | null>(null);
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  // New Client Form State
  const [newClientName, setNewClientName] = useState('');
  const [newClientLogo, setNewClientLogo] = useState('');

  // Manual Vault Form States
  const [vaultAccountId, setVaultAccountId] = useState('');
  const [vaultAccessToken, setVaultAccessToken] = useState('');
  const [vaultRefreshToken, setVaultRefreshToken] = useState('');
  const [isVaultSaving, setIsVaultSaving] = useState(false);

  // Meta Developer Portal Inputs
  const [metaAppId, setMetaAppId] = useState(
    process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '1532121481550639'
  );
  const [metaAppSecret, setMetaAppSecret] = useState('');
  const [tiktokClientKey, setTiktokClientKey] = useState(
    process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'awzwmzqb12ijk009'
  );
  const [tiktokClientSecret, setTiktokClientSecret] = useState('');

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0] || INITIAL_CLIENTS[0];

  // Helper to load clients from API + localStorage
  const loadClientsList = async () => {
    let baseClients = INITIAL_CLIENTS;
    try {
      const clientsRes = await axios.get('/api/clients');
      if (clientsRes.data && Array.isArray(clientsRes.data) && clientsRes.data.length > 0) {
        baseClients = clientsRes.data;
      }
    } catch (e) {
      console.warn('Clients API fetch fallback:', e);
    }

    // Merge custom clients saved in localStorage
    try {
      const localCustom = localStorage.getItem('koko_custom_clients');
      if (localCustom) {
        const parsed: ClientData[] = JSON.parse(localCustom);
        const existingIds = new Set(baseClients.map((c) => c.id));
        const newOnes = parsed.filter((c) => !existingIds.has(c.id));
        baseClients = [...baseClients, ...newOnes];
      }
    } catch (e) {
      console.warn('localStorage custom clients parse error:', e);
    }

    setClients(baseClients);
  };

  useEffect(() => {
    loadClientsList();
  }, []);

  useEffect(() => {
    async function loadSocialAccounts() {
      setIsLoading(true);
      try {
        const res = await axios.get(`/api/social-accounts?clientId=${selectedClientId}`);
        setSocialAccounts(res.data || []);
      } catch (e) {
        console.warn('Social accounts API fetch fallback:', e);
        const fallback = INITIAL_CLIENTS.find((c) => c.id === selectedClientId)?.socialAccounts || [];
        setSocialAccounts(fallback);
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
      await axios.post('/api/clients', {
        name: newClientObj.name,
        logoUrl: newClientObj.logoUrl,
      });
    } catch (err) {
      console.warn('POST /api/clients fallback to localStorage:', err);
    }

    // Save to localStorage
    try {
      const localCustom = localStorage.getItem('koko_custom_clients');
      const currentList: ClientData[] = localCustom ? JSON.parse(localCustom) : [];
      currentList.push(newClientObj);
      localStorage.setItem('koko_custom_clients', JSON.stringify(currentList));
    } catch (e) {
      console.warn('Error saving custom client to localStorage:', e);
    }

    const updatedClients = [...clients, newClientObj];
    setClients(updatedClients);
    setSelectedClientId(newId);
    setNewClientName('');
    setNewClientLogo('');
    setShowAddClientModal(false);
  };

  // Delete Custom Client Account
  const handleDeleteClient = (clientId: string) => {
    if (!confirm('Are you sure you want to remove this client account?')) return;
    const updated = clients.filter((c) => c.id !== clientId);
    setClients(updated);

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

    if (selectedClientId === clientId && updated.length > 0) {
      setSelectedClientId(updated[0].id);
    }
  };

  // Trigger Direct Meta OAuth Login Flow with Onboarding Configuration
  const triggerMetaOAuthLogin = () => {
    const appId = metaAppId || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '1532121481550639';
    const configId = process.env.NEXT_PUBLIC_INSTAGRAM_CONFIG_ID || '1590313085890812';

    if (!appId || appId === 'your_instagram_app_id' || appId.length < 5) {
      setShowSetupGuide(true);
      return;
    }

    const origin = window.location.hostname.includes('github.io')
      ? 'https://kasumbaelijah.github.io/koko-digital-studio-insights'
      : window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : window.location.origin;
    const redirectUri = encodeURIComponent(`${origin}/api/auth/callback/facebook?clientId=${selectedClientId}`);
    
    const oauthUrl = configId
      ? `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&config_id=${configId}&redirect_uri=${redirectUri}&response_type=code`
      : `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=instagram_basic,instagram_manage_insights,pages_read_engagement,pages_show_list&response_type=code`;

    window.open(oauthUrl, 'MetaOAuth', 'width=600,height=700');
  };

  // Trigger Direct TikTok OAuth Login Flow with PKCE
  const triggerTikTokOAuthLogin = async () => {
    const clientKey = tiktokClientKey || process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'awzwmzqb12ijk009';

    if (!clientKey || clientKey === 'your_tiktok_client_key' || clientKey.length < 5) {
      setShowSetupGuide(true);
      return;
    }

    const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem('tiktok_code_verifier', verifier);

    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const origin = window.location.hostname.includes('github.io')
      ? 'https://kasumbaelijah.github.io/koko-digital-studio-insights'
      : window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : window.location.origin;
    const redirectUri = encodeURIComponent(`${origin}/api/auth/callback/tiktok?clientId=${selectedClientId}`);
    const scope = encodeURIComponent('user.info.basic,video.list');

    const oauthUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scope}&response_type=code&redirect_uri=${redirectUri}&code_challenge=${challenge}&code_challenge_method=S256`;

    window.open(oauthUrl, 'TikTokOAuth', 'width=600,height=700');
  };

  // Save manual credential vault updates
  const handleSaveVaultCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showVaultModal) return;

    setIsVaultSaving(true);
    try {
      await axios.post('/api/social-accounts', {
        clientId: selectedClientId,
        platform: showVaultModal,
        platformAccountId: vaultAccountId || `${showVaultModal}_${selectedClientId}_official`,
        accessToken: vaultAccessToken,
        refreshToken: vaultRefreshToken || undefined,
      });

      const res = await axios.get(`/api/social-accounts?clientId=${selectedClientId}`);
      setSocialAccounts(res.data || []);
      setShowVaultModal(null);
      setVaultAccountId('');
      setVaultAccessToken('');
      setVaultRefreshToken('');
    } catch (err) {
      console.error('Error saving vault credential:', err);
    } finally {
      setIsVaultSaving(false);
    }
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
            Connect client Instagram & TikTok accounts using direct 1-click agency login or credential vault management.
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

        <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
          <span>Connecting for <strong className="text-gray-900">{selectedClient.name}</strong></span>
          {clients.length > 1 && (
            <button
              onClick={() => handleDeleteClient(selectedClient.id)}
              title="Remove this client"
              className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Connected Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Instagram Account Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  IG
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 font-heading">
                    Instagram Business
                  </h3>
                  <p className="text-xs text-gray-500">Meta Graph API v19.0</p>
                </div>
              </div>

              {igAccount ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5" /> Disconnected
                </span>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2 mb-6 text-xs text-gray-600 font-mono">
              <div className="flex justify-between">
                <span>Account ID:</span>
                <span className="font-bold text-gray-900">{igAccount?.platformAccountId || 'Not Connected'}</span>
              </div>
              <div className="flex justify-between">
                <span>Token Type:</span>
                <span className="font-bold text-gray-900">60-Day Meta Long-Lived Token</span>
              </div>
              <div className="flex justify-between">
                <span>Auto-Refresh:</span>
                <span className="text-emerald-600 font-bold">Active</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={triggerMetaOAuthLogin}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              1-Click Agency Meta Login ({selectedClient.name})
            </button>
            <button
              onClick={() => setShowVaultModal('instagram')}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition-all border border-gray-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-gray-500" />
              Update Credential Vault
            </button>
          </div>
        </div>

        {/* TikTok Account Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  TT
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 font-heading">
                    TikTok for Developers
                  </h3>
                  <p className="text-xs text-gray-500">TikTok Display API v2 (PKCE)</p>
                </div>
              </div>

              {ttAccount ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5" /> Disconnected
                </span>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2 mb-6 text-xs text-gray-600 font-mono">
              <div className="flex justify-between">
                <span>Account ID:</span>
                <span className="font-bold text-gray-900">{ttAccount?.platformAccountId || 'Not Connected'}</span>
              </div>
              <div className="flex justify-between">
                <span>Token Type:</span>
                <span className="font-bold text-gray-900">365-Day TikTok Refresh Token</span>
              </div>
              <div className="flex justify-between">
                <span>Auto-Refresh:</span>
                <span className="text-emerald-600 font-bold">Active</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={triggerTikTokOAuthLogin}
              className="w-full py-2.5 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              1-Click Agency TikTok Login ({selectedClient.name})
            </button>
            <button
              onClick={() => setShowVaultModal('tiktok')}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition-all border border-gray-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-gray-500" />
              Update Credential Vault
            </button>
          </div>
        </div>
      </div>

      {/* Developer App Configuration Section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
          <Key className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900 font-heading">
            Agency App Key & Secret Vault
          </h2>
        </div>
        <p className="text-xs text-gray-500 mb-6">
          These credentials identify Koko Digital Studio as an authorized partner app when requesting OAuth authorization for client accounts.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Meta App Config */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Meta Developer App</h4>
            <div>
              <label className="text-xs text-gray-500 font-semibold mb-1 block">Meta App ID (INSTAGRAM_APP_ID)</label>
              <input
                type="text"
                value={metaAppId}
                onChange={(e) => setMetaAppId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-2.5 font-mono text-gray-800 focus:ring-black outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold mb-1 block">Meta App Secret (INSTAGRAM_APP_SECRET)</label>
              <input
                type="password"
                placeholder="••••••••••••••••••••••••••••••••"
                value={metaAppSecret}
                onChange={(e) => setMetaAppSecret(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-2.5 font-mono text-gray-800 focus:ring-black outline-none"
              />
            </div>
          </div>

          {/* TikTok App Config */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">TikTok for Developers App</h4>
            <div>
              <label className="text-xs text-gray-500 font-semibold mb-1 block">TikTok Client Key (TIKTOK_CLIENT_KEY)</label>
              <input
                type="text"
                value={tiktokClientKey}
                onChange={(e) => setTiktokClientKey(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-2.5 font-mono text-gray-800 focus:ring-black outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold mb-1 block">TikTok Client Secret (TIKTOK_CLIENT_SECRET)</label>
              <input
                type="password"
                placeholder="••••••••••••••••••••••••••••••••"
                value={tiktokClientSecret}
                onChange={(e) => setTiktokClientSecret(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-2.5 font-mono text-gray-800 focus:ring-black outline-none"
              />
            </div>
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

      {/* Manual Credential Vault Modal */}
      {showVaultModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative border border-gray-100">
            <button
              onClick={() => setShowVaultModal(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-black p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 font-heading">
                  Manual Vault: {showVaultModal === 'instagram' ? 'Instagram Business' : 'TikTok for Developers'}
                </h3>
                <p className="text-xs text-gray-500">
                  Target: <strong className="text-gray-900">{selectedClient.name}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveVaultCredential} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Platform Account ID ({showVaultModal === 'instagram' ? 'Instagram Business ID' : 'TikTok Open ID'})
                </label>
                <input
                  type="text"
                  placeholder={showVaultModal === 'instagram' ? 'ig_1784140000000' : 'tt_open_id_12345'}
                  value={vaultAccountId}
                  onChange={(e) => setVaultAccountId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-3 text-gray-900 font-mono focus:ring-black focus:border-black outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Access Token ({showVaultModal === 'instagram' ? '60-Day Meta Long-Lived Token' : 'TikTok User Access Token'})
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="EAA..."
                  value={vaultAccessToken}
                  onChange={(e) => setVaultAccessToken(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-3 text-gray-900 font-mono focus:ring-black focus:border-black outline-none"
                />
              </div>

              {showVaultModal === 'tiktok' && (
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Refresh Token (365-Day TikTok Refresh Token)
                  </label>
                  <input
                    type="text"
                    placeholder="r.12345..."
                    value={vaultRefreshToken}
                    onChange={(e) => setVaultRefreshToken(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-3 text-gray-900 font-mono focus:ring-black focus:border-black outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowVaultModal(null)}
                  className="w-1/2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVaultSaving}
                  className="w-1/2 py-2.5 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {isVaultSaving ? 'Saving Vault...' : 'Save Credential'}
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
              {/* Meta Setup Instructions */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  Meta Graph API (Instagram Business)
                </h4>
                <ol className="list-decimal list-inside space-y-1 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <li>Go to <strong>developers.facebook.com</strong> and open your Meta App.</li>
                  <li>In <strong>App Settings &gt; Basic</strong>, set App Domains to <code>kasumbaelijah.github.io</code> and <code>localhost</code>.</li>
                  <li>Set Privacy Policy URL to <code>https://kasumbaelijah.github.io/koko-digital-studio-insights/privacy</code>.</li>
                  <li>In <strong>Facebook Login for Business &gt; Settings</strong>, add Valid OAuth Redirect URI: <code>http://localhost:3000/api/auth/callback/facebook</code> and <code>https://kasumbaelijah.github.io/koko-digital-studio-insights/api/auth/callback/facebook</code>.</li>
                  <li>Create an <strong>Instagram Onboarding Configuration</strong> (ID: <code>1590313085890812</code>) with permissions: <code>instagram_basic</code>, <code>instagram_manage_insights</code>, <code>pages_read_engagement</code>.</li>
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
                  <li>Set Redirect URI: <code>http://localhost:3000/api/auth/callback/tiktok</code> and <code>https://kasumbaelijah.github.io/koko-digital-studio-insights/api/auth/callback/tiktok</code>.</li>
                  <li>Copy your <strong>Client Key</strong> (<code>awzwmzqb12ijk009</code>) and <strong>Client Secret</strong> (<code>0Zb7Xi3fyDH4uRsIH5zSBndADoEnXZoj</code>).</li>
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
