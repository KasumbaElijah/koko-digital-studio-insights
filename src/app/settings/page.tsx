'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ClientData, SocialAccountData } from '@/lib/types';
import { INITIAL_CLIENTS } from '@/lib/mockData';
import { Key, ShieldCheck, RefreshCw, ArrowLeft, AlertTriangle, ExternalLink, Lock, UserCheck, HelpCircle } from 'lucide-react';

export default function SettingsPage() {
  const [clients, setClients] = useState<ClientData[]>(INITIAL_CLIENTS);
  const [selectedClientId, setSelectedClientId] = useState<string>('client-bulungi-town');
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountData[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'instagram' | 'tiktok'>('instagram');

  // App Credentials Config
  const [metaAppId, setMetaAppId] = useState('');
  const [tiktokClientKey, setTiktokClientKey] = useState('');

  // Form states for manual token / credential vault
  const [platformAccountId, setPlatformAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  const selectedClient = clients.find((c) => c.id === selectedClientId) || INITIAL_CLIENTS[0];

  useEffect(() => {
    async function loadData() {
      try {
        const clientsRes = await axios.get('/api/clients');
        if (clientsRes.data && Array.isArray(clientsRes.data) && clientsRes.data.length > 0) {
          setClients(clientsRes.data);
        }
      } catch (e) {
        console.warn('Clients API fetch fallback:', e);
      }
    }
    loadData();
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

  // Trigger Direct Meta OAuth Login Flow with Onboarding Configuration
  const triggerMetaOAuthLogin = () => {
    const appId = metaAppId || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '1532121481550639';
    const configId = process.env.NEXT_PUBLIC_INSTAGRAM_CONFIG_ID || '1590313085890812';

    if (!appId || appId === 'your_instagram_app_id' || appId.length < 5) {
      setShowSetupGuide(true);
      return;
    }

    const origin = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
    const redirectUri = encodeURIComponent(`${origin}/api/auth/callback/facebook?clientId=${selectedClientId}`);
    
    // Note: Meta prohibits passing explicit 'scope' when 'config_id' is present because config_id defines the onboarding scopes in Meta portal.
    const oauthUrl = configId
      ? `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&config_id=${configId}&redirect_uri=${redirectUri}&response_type=code`
      : `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=instagram_basic,instagram_manage_insights,pages_read_engagement,pages_show_list&response_type=code`;

    window.open(oauthUrl, 'MetaOAuth', 'width=600,height=700');
  };

  // Trigger Direct TikTok OAuth Login Flow with PKCE
  const triggerTikTokOAuthLogin = async () => {
    const clientKey = tiktokClientKey || process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;

    if (!clientKey || clientKey === 'your_tiktok_client_key' || clientKey.length < 5) {
      setShowSetupGuide(true);
      return;
    }

    // Generate PKCE code verifier and challenge
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    const codeVerifier = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('tt_code_verifier', codeVerifier);

    // Simple SHA-256 base64url for client side
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/callback/tiktok?clientId=${selectedClientId}`);
    const scope = encodeURIComponent('user.info.basic,video.list');
    const oauthUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&code_challenge=${base64Digest}&code_challenge_method=S256`;

    window.open(oauthUrl, 'TikTokOAuth', 'width=600,height=700');
  };

  const handleSaveSocialAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/social-accounts', {
        clientId: selectedClientId,
        platform: selectedPlatform,
        platformAccountId,
        accessToken: accessToken || `mock_${selectedPlatform}_token_${Date.now()}`,
        refreshToken: refreshToken || null,
      });

      setSocialAccounts((prev) => [...prev.filter((a) => a.platform !== selectedPlatform), res.data]);
      setShowConnectModal(false);
      setPlatformAccountId('');
      setAccessToken('');
      setRefreshToken('');
    } catch (err) {
      console.error('Error connecting social account:', err);
    }
  };

  const handleRefreshToken = async (accountId?: string) => {
    setIsRefreshing(true);
    try {
      await axios.post('/api/auth/refresh', { socialAccountId: accountId });
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

      {/* Target Client Switcher */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
        </div>

        <div className="text-xs font-medium text-gray-500">
          Connecting for <span className="font-bold text-gray-900">{selectedClient.name}</span>
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
                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" /> Not Connected
                </span>
              )}
            </div>

            {igAccount ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Account ID:</span>
                  <span className="font-mono font-bold text-gray-900">{igAccount.platformAccountId}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Token Type:</span>
                  <span className="font-semibold text-gray-800">60-Day Meta Long-Lived Token</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Auto-Refresh:</span>
                  <span className="font-semibold text-emerald-600">Active</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                Connect {selectedClient.name}&apos;s Instagram Business account to pull follower growth, post reach, engagement rate %, and content formats.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={triggerMetaOAuthLogin}
              className="w-full py-2.5 px-4 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              1-Click Agency Meta Login ({selectedClient.name})
            </button>
            <button
              onClick={() => {
                setSelectedPlatform('instagram');
                setPlatformAccountId(igAccount?.platformAccountId || '');
                setShowConnectModal(true);
              }}
              className="w-full py-2 px-4 bg-gray-100 text-gray-800 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              {igAccount ? 'Update Credential Vault' : 'Manual Token Vault'}
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
                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" /> Not Connected
                </span>
              )}
            </div>

            {ttAccount ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Account ID:</span>
                  <span className="font-mono font-bold text-gray-900">{ttAccount.platformAccountId}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Token Type:</span>
                  <span className="font-semibold text-gray-800">365-Day TikTok Refresh Token</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Auto-Refresh:</span>
                  <span className="font-semibold text-emerald-600">Active</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                Connect {selectedClient.name}&apos;s TikTok account to pull video view counts, engagement %, and top post metrics.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={triggerTikTokOAuthLogin}
              className="w-full py-2.5 px-4 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              1-Click Agency TikTok Login ({selectedClient.name})
            </button>
            <button
              onClick={() => {
                setSelectedPlatform('tiktok');
                setPlatformAccountId(ttAccount?.platformAccountId || '');
                setShowConnectModal(true);
              }}
              className="w-full py-2 px-4 bg-gray-100 text-gray-800 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              {ttAccount ? 'Update Credential Vault' : 'Manual Token Vault'}
            </button>
          </div>
        </div>
      </div>

      {/* App Credentials Quick Setup Guide Modal */}
      {showSetupGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-gray-200 my-8">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 font-heading flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-600" />
                Developer App Registration Setup
              </h3>
              <button
                onClick={() => setShowSetupGuide(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 text-xs text-gray-700 leading-relaxed">
              <p>
                To resolve the Meta / TikTok misconfiguration error, register Koko Digital Studio&apos;s Developer App IDs in your <code>.env</code> file.
              </p>

              {/* Meta Setup Steps */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  1. Meta for Developers (Instagram Business)
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 font-medium">
                  <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">developers.facebook.com</a> and click <strong>Create App</strong>.</li>
                  <li>Select App Type: <strong>Business</strong>.</li>
                  <li>Add Product: <strong>Facebook Login for Business</strong> & <strong>Instagram Graph API</strong>.</li>
                  <li>Under <em>Facebook Login Settings</em>, set Valid OAuth Redirect URI to:
                    <div className="bg-gray-900 text-emerald-400 font-mono p-2 rounded-lg mt-1 select-all">
                      http://localhost:3000/api/auth/callback/facebook
                    </div>
                  </li>
                  <li>Copy your <strong>App ID</strong> & <strong>App Secret</strong> into <code>.env</code>:
                    <div className="bg-gray-900 text-gray-200 font-mono p-2 rounded-lg mt-1 select-all">
                      INSTAGRAM_APP_ID=&quot;your_meta_app_id&quot;<br />
                      INSTAGRAM_APP_SECRET=&quot;your_meta_app_secret&quot;<br />
                      NEXT_PUBLIC_INSTAGRAM_APP_ID=&quot;your_meta_app_id&quot;
                    </div>
                  </li>
                </ol>
              </div>

              {/* TikTok Setup Steps */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  2. TikTok for Developers (Display API v2 + PKCE)
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 font-medium">
                  <li>Go to <a href="https://developers.tiktok.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">developers.tiktok.com</a> and create an app.</li>
                  <li>Add Scopes: <code>user.info.basic</code>, <code>video.list</code>.</li>
                  <li>Set Redirect URI to:
                    <div className="bg-gray-900 text-emerald-400 font-mono p-2 rounded-lg mt-1 select-all">
                      http://localhost:3000/api/auth/callback/tiktok
                    </div>
                  </li>
                  <li>Copy your <strong>Client Key</strong> & <strong>Client Secret</strong> into <code>.env</code>:
                    <div className="bg-gray-900 text-gray-200 font-mono p-2 rounded-lg mt-1 select-all">
                      TIKTOK_CLIENT_KEY=&quot;your_tiktok_client_key&quot;<br />
                      TIKTOK_CLIENT_SECRET=&quot;your_tiktok_client_secret&quot;<br />
                      NEXT_PUBLIC_TIKTOK_CLIENT_KEY=&quot;your_tiktok_client_key&quot;
                    </div>
                  </li>
                </ol>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowSetupGuide(false)}
                  className="px-5 py-2.5 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-all cursor-pointer"
                >
                  Got It!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Access Token / Credentials Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 font-heading">
                Credential Vault ({selectedPlatform === 'instagram' ? 'Instagram' : 'TikTok'})
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSocialAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Account Handle / ID:
                </label>
                <input
                  type="text"
                  required
                  value={platformAccountId}
                  onChange={(e) => setPlatformAccountId(e.target.value)}
                  placeholder={selectedPlatform === 'instagram' ? 'e.g. ig_bulungitown_official' : 'e.g. tt_bulungitown_official'}
                  className="w-full text-xs font-medium bg-gray-50 border border-gray-300 rounded-xl p-3 outline-none focus:ring-black focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Access Token:
                </label>
                <textarea
                  rows={3}
                  required
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={
                    selectedPlatform === 'instagram'
                      ? 'Paste short-lived or long-lived Meta Graph token...'
                      : 'Paste TikTok Display API v2 access token...'
                  }
                  className="w-full text-xs font-mono bg-gray-50 border border-gray-300 rounded-xl p-3 outline-none focus:ring-black focus:border-black resize-none"
                />
              </div>

              {selectedPlatform === 'tiktok' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    365-Day Refresh Token (Optional):
                  </label>
                  <input
                    type="text"
                    value={refreshToken}
                    onChange={(e) => setRefreshToken(e.target.value)}
                    placeholder="Paste TikTok 365-day refresh token..."
                    className="w-full text-xs font-mono bg-gray-50 border border-gray-300 rounded-xl p-3 outline-none focus:ring-black focus:border-black"
                  />
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-black rounded-xl hover:bg-gray-800 transition-all cursor-pointer"
                >
                  Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
