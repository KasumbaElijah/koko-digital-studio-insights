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
import { ClientData, SocialAccountData } from '@/lib/types';

export default function SettingsPage() {
  const [clients, setClients] = useState<ClientData[]>(INITIAL_CLIENTS);
  const [selectedClientId, setSelectedClientId] = useState<string>(INITIAL_CLIENTS[0].id);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Card Design States matching familiar mobile login UI
  const [tiktokTab, setTiktokTab] = useState<'email' | 'phone'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [igIdentifier, setIgIdentifier] = useState('');
  const [ttIdentifier, setTtIdentifier] = useState('');

  // Modal States
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  // New Client Form State
  const [newClientName, setNewClientName] = useState('');
  const [newClientLogo, setNewClientLogo] = useState('');

  // Meta Developer Portal Inputs
  const [metaAppId, setMetaAppId] = useState(
    process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '1762099978384335'
  );
  const [metaAppSecret, setMetaAppSecret] = useState('');
  const [tiktokClientKey, setTiktokClientKey] = useState(
    process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'awzwmzqb12ijk009'
  );
  const [tiktokClientSecret, setTiktokClientSecret] = useState('');

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0] || INITIAL_CLIENTS[0];

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

  // Canonical OAuth origin helper: locks vercel.app deploys to the whitelisted production domain
  const getOAuthOrigin = () => {
    if (typeof window === 'undefined') return 'https://koko-digital-studio-insights.vercel.app';
    if (window.location.hostname === 'localhost') return 'http://localhost:3000';
    if (window.location.hostname.includes('github.io')) return 'https://kasumbaelijah.github.io/koko-digital-studio-insights';
    if (window.location.hostname.endsWith('vercel.app')) return 'https://koko-digital-studio-insights.vercel.app';
    return window.location.origin;
  };

  // 1. Trigger Direct Business Login for Instagram (Requires Instagram App ID)
  const triggerInstagramDirectLogin = () => {
    const appId = metaAppId || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '1762099978384335';

    if (!appId || appId === 'your_instagram_app_id' || appId.length < 5) {
      setShowSetupGuide(true);
      return;
    }

    const origin = getOAuthOrigin();
    const redirectUri = encodeURIComponent(`${origin}/api/auth/callback/instagram`);
    const state = encodeURIComponent(selectedClientId);
    const scope = encodeURIComponent(
      'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish'
    );
    
    // Official Business Login for Instagram authorization window (Requires Instagram App ID)
    const oauthUrl = `https://www.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&enable_fb_login=true`;

    openCenteredPopup(oauthUrl, 'InstagramBusinessLogin');
  };

  // 2. Trigger Meta Facebook Business Login (Works directly with Facebook App ID 1532121481550639 & Config ID)
  const triggerMetaFacebookLogin = () => {
    const fbAppId = '1532121481550639';
    const configId = process.env.NEXT_PUBLIC_INSTAGRAM_CONFIG_ID || '1590313085890812';

    if (!fbAppId || fbAppId.length < 5) {
      setShowSetupGuide(true);
      return;
    }

    const origin = getOAuthOrigin();
    const redirectUri = encodeURIComponent(`${origin}/api/auth/callback/facebook`);
    const state = encodeURIComponent(selectedClientId);
    
    const oauthUrl = configId
      ? `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fbAppId}&config_id=${configId}&redirect_uri=${redirectUri}&state=${state}&response_type=code`
      : `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${redirectUri}&state=${state}&scope=instagram_basic,instagram_manage_insights,pages_read_engagement,pages_show_list&response_type=code`;

    openCenteredPopup(oauthUrl, 'MetaOAuth');
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
                <span className="text-[11px] font-bold text-neutral-200">{selectedClient.name}</span>
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

            {/* Form Input Mockups matching Screenshot 2 */}
            <div className="space-y-3 mb-2">
              <div>
                <input
                  type="text"
                  value={igIdentifier}
                  onChange={(e) => setIgIdentifier(e.target.value)}
                  placeholder={igAccount?.platformAccountId || "Phone number, username or email address"}
                  className="w-full bg-[#1c1c1e] text-white placeholder-neutral-500 text-xs rounded-xl px-3.5 py-3 border border-neutral-800 focus:border-neutral-600 outline-none transition-all"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  readOnly
                  value={igAccount ? "••••••••••••••••••••" : ""}
                  placeholder={igAccount ? "60-Day Long-Lived Token Active" : "Password / Secure Token"}
                  className="w-full bg-[#1c1c1e] text-white placeholder-neutral-500 text-xs rounded-xl px-3.5 py-3 border border-neutral-800 focus:border-neutral-600 outline-none transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

            {/* Primary Action Button: Purple to Crimson Gradient from Screenshot 2 */}
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={triggerInstagramDirectLogin}
                className="w-full py-3 bg-gradient-to-r from-[#692795] via-[#a8256b] to-[#d62839] hover:opacity-95 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <ExternalLink className="w-4 h-4" />
                login
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
                onClick={triggerMetaFacebookLogin}
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v7.001C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                login with meta
              </button>
            </div>
          </div>

          {/* Card Footer Info */}
          <div className="mt-6 pt-4 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500">
            <span>Account: <strong className="text-neutral-300">{igAccount?.platformAccountId || 'Not Connected'}</strong></span>
            <span className="text-emerald-500 font-medium">{igAccount ? '60-Day Active' : 'Auto-Sync Ready'}</span>
          </div>
        </div>

        {/* TikTok Account Card - Modeled after Clean Mobile Tabbed Login UI */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between text-gray-900 relative">
          <div>
            {/* Top Bar: Back Chevron, Title "Log in", and Help Question Mark from Screenshot 1 */}
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
                Log in
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

            {/* Form Input Fields matching Screenshot 1 */}
            <div className="space-y-4 mb-4">
              {tiktokTab === 'phone' ? (
                <div className="flex items-center border-b border-gray-200 pb-2.5">
                  <span className="text-xs font-bold text-gray-700 pr-2 border-r border-gray-200 mr-2">+256</span>
                  <input
                    type="tel"
                    value={ttIdentifier}
                    onChange={(e) => setTtIdentifier(e.target.value)}
                    placeholder={ttAccount?.platformAccountId || "Phone number"}
                    className="w-full text-xs text-gray-900 placeholder-gray-400 outline-none font-medium bg-transparent"
                  />
                </div>
              ) : (
                <div className="border-b border-gray-200 pb-2.5">
                  <input
                    type="text"
                    value={ttIdentifier}
                    onChange={(e) => setTtIdentifier(e.target.value)}
                    placeholder={ttAccount?.platformAccountId || "Email or username"}
                    className="w-full text-xs text-gray-900 placeholder-gray-400 outline-none font-medium bg-transparent"
                  />
                </div>
              )}

              <div className="border-b border-gray-200 pb-2.5 flex items-center justify-between">
                <input
                  type={showPassword ? "text" : "password"}
                  readOnly
                  value={ttAccount ? "••••••••••••••••••••" : ""}
                  placeholder={ttAccount ? "365-Day Refresh Token Active" : "Password"}
                  className="w-full text-xs text-gray-900 placeholder-gray-400 outline-none font-medium bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 ml-2"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

            {/* Primary Action Button matching Screenshot 1 */}
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={triggerTikTokOAuthLogin}
                className="w-full py-3.5 bg-[#F1F1F2] hover:bg-black text-gray-800 hover:text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-[0.99]"
              >
                <ExternalLink className="w-4 h-4" />
                Log in
              </button>

              <p className="text-[11px] text-center text-gray-400">
                Official TikTok Display API v2 • Secured with PKCE SHA-256
              </p>
            </div>
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
              {/* Business Login for Instagram Setup Instructions */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  Business Login for Instagram (Instagram API with Instagram Login)
                </h4>
                <ol className="list-decimal list-inside space-y-1 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <li>Go to <strong>developers.facebook.com</strong> and open your Meta App.</li>
                  <li>In App Dashboard, navigate to <strong>Instagram &gt; API setup with Instagram login &gt; 3. Set up Instagram business login &gt; Business login settings</strong>.</li>
                  <li>Copy your <strong>Instagram App ID</strong> and <strong>Instagram App Secret</strong> into your Vercel project environment variables (<code>INSTAGRAM_APP_ID</code> and <code>INSTAGRAM_APP_SECRET</code>).</li>
                  <li>In <strong>OAuth redirect URIs</strong>, add: <code>https://YOUR-VERCEL-URL/api/auth/callback/instagram</code> and <code>http://localhost:3000/api/auth/callback/instagram</code>.</li>
                  <li>Required new permissions: <code>instagram_business_basic</code>, <code>instagram_business_manage_messages</code>, <code>instagram_business_manage_comments</code>, <code>instagram_business_content_publish</code>.</li>
                  <li>Click <strong>1-Click Business Login for Instagram</strong> to authenticate. Tokens are automatically upgraded to 60-day long-lived tokens with automatic renewal.</li>
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
                  <li>Set Redirect URI: <code>https://YOUR-VERCEL-URL/api/auth/callback/tiktok</code> and <code>http://localhost:3000/api/auth/callback/tiktok</code>.</li>
                  <li>Copy your <strong>Client Key</strong> and <strong>Client Secret</strong> into your Vercel project environment variables (<code>TIKTOK_CLIENT_KEY</code> and <code>TIKTOK_CLIENT_SECRET</code>).</li>
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
