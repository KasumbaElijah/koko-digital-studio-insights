'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  Trophy,
  RefreshCw,
  CheckCircle2,
  Check,
  Plus,
  Search,
  ExternalLink,
  Flame,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Download,
  Copy,
  Trash2,
  Sparkles,
  Filter,
  Users,
  Video,
  X,
  Link as LinkIcon,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { ContentPostData, ClientData, SocialAccountData, MetaPageItem } from '@/lib/types';
import {
  DEFAULT_VERIFIED_PAGES,
  sanitizePostsList,
  normalizeInstagramUsername,
  normalizeTikTokUsername,
  formatTikTokHandle,
  resolveInstagramUsername,
} from '@/lib/managedPages';
import { formatNumberShort } from '@/lib/analytics';

const BONUS_VIEW_THRESHOLD = 50000;

interface ConnectedBonusAccount {
  id: string;
  platform: 'instagram' | 'tiktok';
  username: string;
  handle: string;
  displayName: string;
  clientName?: string;
  pageId?: string;
  followerCount?: number;
  isScanning?: boolean;
  lastScannedAt?: string;
}

interface BonusVideoItem extends ContentPostData {
  accountKey: string;
  accountHandle: string;
  accountDisplayName: string;
}

const STORAGE_TRACKED_VIDEOS_KEY = 'koko_bonus_tracked_videos_v1';
const STORAGE_SCANNED_VIDEOS_KEY = 'koko_bonus_scanned_videos_v1';
const STORAGE_UNPICKED_IDS_KEY = 'koko_bonus_unpicked_ids_v1';
const STORAGE_EXTRA_ACCOUNTS_KEY = 'koko_bonus_extra_accounts_v1';

export default function BonusTrackerPage() {
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedBonusAccount[]>([]);
  const [scannedVideos, setScannedVideos] = useState<BonusVideoItem[]>([]);
  const [trackedVideos, setTrackedVideos] = useState<BonusVideoItem[]>([]);
  const [unpickedIds, setUnpickedIds] = useState<string[]>([]);

  const [isScanningAll, setIsScanningAll] = useState<boolean>(false);
  const [selectedAccountKey, setSelectedAccountKey] = useState<string>('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'instagram' | 'tiktok'>('all');
  const [viewFilterMode, setViewFilterMode] = useState<'50k_only' | 'all_videos'>('50k_only');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);

  // Month & Date Range Filter State ('ALL' = all months, 'MONTH' = specific YYYY-MM, 'CUSTOM' = startDate..endDate)
  const [dateFilterMode, setDateFilterMode] = useState<'ALL' | 'MONTH' | 'CUSTOM'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Add 50K+ Video by URL or Add Account Modal state
  const [showAddVideoModal, setShowAddVideoModal] = useState<boolean>(false);
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');
  const [videoPlatformInput, setVideoPlatformInput] = useState<'instagram' | 'tiktok'>('instagram');
  const [videoHandleInput, setVideoHandleInput] = useState<string>('');
  const [videoTitleInput, setVideoTitleInput] = useState<string>('');
  const [videoViewsInput, setVideoViewsInput] = useState<string>('50000');
  const [videoLikesInput, setVideoLikesInput] = useState<string>('0');
  const [videoCommentsInput, setVideoCommentsInput] = useState<string>('0');
  const [videoDateInput, setVideoDateInput] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [videoThumbnailInput, setVideoThumbnailInput] = useState<string>('');
  const [isFetchingPreview, setIsFetchingPreview] = useState<boolean>(false);
  const [addVideoError, setAddVideoError] = useState<string>('');

  // Quick Scan New Connected Account Modal
  const [showAddAccountModal, setShowAddAccountModal] = useState<boolean>(false);
  const [newAccPlatform, setNewAccPlatform] = useState<'instagram' | 'tiktok'>('instagram');
  const [newAccHandle, setNewAccHandle] = useState<string>('');
  const [newAccDisplayName, setNewAccDisplayName] = useState<string>('');

  const getProxiedUrl = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.startsWith('/api/image-proxy')) return url;
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    if (
      url.includes('cdninstagram.com') ||
      url.includes('fbcdn.net') ||
      url.includes('tiktokcdn') ||
      url.includes('tiktokv.com')
    ) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const getVideoUniqueKey = (v: Pick<BonusVideoItem, 'platform' | 'postId' | 'id' | 'permalink'>) => {
    const rawId = String(v.postId || v.id || v.permalink || '').trim();
    return `${String(v.platform || '').toLowerCase()}_${rawId}`;
  };

  // Helpers for Month & Date Range Filtering
  const handleSelectMonthFilter = (yyyyMm: string) => {
    if (!yyyyMm || yyyyMm === 'ALL') {
      setDateFilterMode('ALL');
      return;
    }
    setSelectedMonth(yyyyMm);
    setDateFilterMode('MONTH');
    const [yr, mo] = yyyyMm.split('-').map(Number);
    if (yr && mo) {
      const firstDay = `${yr}-${String(mo).padStart(2, '0')}-01`;
      const lastDate = new Date(yr, mo, 0).getDate();
      const lastDay = `${yr}-${String(mo).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  };

  const formatMonthLabel = (yyyyMm: string) => {
    if (!yyyyMm || !yyyyMm.includes('-')) return 'All Months';
    const [yr, mo] = yyyyMm.split('-').map(Number);
    if (!yr || !mo) return yyyyMm;
    const d = new Date(yr, mo - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatVideoDateBadge = (iso?: string | null) => {
    if (!iso) return 'Recent';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Recent';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const matchesActiveDateFilter = (isoDate?: string | null): boolean => {
    if (dateFilterMode === 'ALL') return true;
    if (!isoDate) return false;
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return false;

    if (dateFilterMode === 'MONTH') {
      const videoMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return videoMonth === selectedMonth;
    }

    // CUSTOM date range
    const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
    const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Number.MAX_SAFE_INTEGER;
    const t = d.getTime();
    return t >= startMs && t <= endMs;
  };

  // 1. Load persisted tracked videos & cached scanned videos on mount, then discover all connected accounts
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let initialUnpicked: string[] = [];
    try {
      const savedUnpicked = localStorage.getItem(STORAGE_UNPICKED_IDS_KEY);
      if (savedUnpicked) {
        const parsed = JSON.parse(savedUnpicked);
        if (Array.isArray(parsed)) {
          initialUnpicked = parsed;
          setUnpickedIds(parsed);
        }
      }
    } catch (e) {}

    try {
      const savedTracked = localStorage.getItem(STORAGE_TRACKED_VIDEOS_KEY);
      if (savedTracked) {
        const parsed = JSON.parse(savedTracked);
        if (Array.isArray(parsed)) {
          const valid50k = parsed.filter((v: any) => (Number(v?.viewsCount) || 0) >= BONUS_VIEW_THRESHOLD);
          setTrackedVideos(valid50k);
        }
      }
    } catch (e) {}

    try {
      const savedScanned = localStorage.getItem(STORAGE_SCANNED_VIDEOS_KEY);
      if (savedScanned) {
        const parsed = JSON.parse(savedScanned);
        if (Array.isArray(parsed)) {
          setScannedVideos(parsed);
        }
      }
    } catch (e) {}

    discoverAndScanConnectedAccounts(initialUnpicked);
  }, []);

  // Discover all accounts connected across Settings, Dashboard, Managed Pages, and Server Store
  const discoverAndScanConnectedAccounts = async (currentUnpickedIds: string[] = unpickedIds) => {
    setIsScanningAll(true);
    try {
      const accountMap = new Map<string, ConnectedBonusAccount>();

      const registerAccount = (
        platform: 'instagram' | 'tiktok',
        rawHandleOrUser: string,
        displayName?: string | null,
        clientName?: string | null,
        pageId?: string | null,
        followerCount?: number | null
      ) => {
        const cleanUser =
          platform === 'instagram'
            ? normalizeInstagramUsername(rawHandleOrUser)
            : normalizeTikTokUsername(rawHandleOrUser);

        if (!cleanUser || cleanUser.length < 2) return;
        // Skip generic placeholder tokens
        if (['active_token', 'ig_primary', 'connected'].includes(cleanUser.toLowerCase())) return;

        const key = `${platform}:${cleanUser.toLowerCase()}`;
        const handle = platform === 'tiktok' ? formatTikTokHandle(cleanUser) : `@${cleanUser}`;
        const existing = accountMap.get(key);

        if (existing) {
          accountMap.set(key, {
            ...existing,
            displayName:
              existing.displayName && !existing.displayName.startsWith('@')
                ? existing.displayName
                : displayName || existing.displayName || handle,
            clientName: existing.clientName || clientName || undefined,
            pageId: existing.pageId || pageId || undefined,
            followerCount: followerCount ?? existing.followerCount,
          });
        } else {
          accountMap.set(key, {
            id: key,
            platform,
            username: cleanUser,
            handle,
            displayName: displayName || handle,
            clientName: clientName || undefined,
            pageId: pageId || undefined,
            followerCount: followerCount ?? undefined,
          });
        }
      };

      // A. Load clients from API & localStorage to map client names and per-client active accounts
      let allClients: ClientData[] = [];
      try {
        const cRes = await axios.get('/api/clients');
        if (Array.isArray(cRes.data)) {
          allClients = cRes.data;
        }
      } catch (e) {}

      if (typeof window !== 'undefined') {
        try {
          const customStr = localStorage.getItem('koko_custom_clients');
          if (customStr) {
            const customArr: ClientData[] = JSON.parse(customStr);
            if (Array.isArray(customArr)) {
              customArr.forEach((c) => {
                if (!allClients.some((existing) => existing.id === c.id)) {
                  allClients.push(c);
                }
              });
            }
          }
        } catch (e) {}
      }

      const clientNameById = new Map<string, string>();
      allClients.forEach((c) => clientNameById.set(c.id, c.name));

      // B. Load connected social accounts from localStorage
      if (typeof window !== 'undefined') {
        try {
          const storedAccountsStr = localStorage.getItem('koko_connected_social_accounts');
          if (storedAccountsStr) {
            const storedAccounts: SocialAccountData[] = JSON.parse(storedAccountsStr);
            if (Array.isArray(storedAccounts)) {
              storedAccounts.forEach((sa) => {
                const cName = clientNameById.get(sa.clientId);
                if (sa.platform === 'instagram') {
                  const resolved = resolveInstagramUsername(sa.platformAccountId, sa.pageId, sa.pageName);
                  if (resolved) {
                    registerAccount('instagram', resolved, sa.pageName || `@${resolved}`, cName, sa.pageId);
                  }
                } else if (sa.platform === 'tiktok' && sa.platformAccountId) {
                  registerAccount('tiktok', sa.platformAccountId, formatTikTokHandle(sa.platformAccountId), cName);
                }
              });
            }
          }
        } catch (e) {}

        // C. Check per-client localStorage keys & cached Meta pages
        allClients.forEach((client) => {
          try {
            const cid = client.id;
            const igUser =
              localStorage.getItem(`koko_active_ig_username_${cid}`) ||
              localStorage.getItem(`koko_active_ig_account_${cid}`);
            const igPageId = localStorage.getItem(`koko_active_page_id_${cid}`) || undefined;
            const igPageName = localStorage.getItem(`koko_active_page_name_${cid}`) || undefined;
            if (igUser || igPageId || igPageName) {
              const resolved = resolveInstagramUsername(igUser || undefined, igPageId, igPageName);
              if (resolved) {
                registerAccount('instagram', resolved, igPageName || client.name, client.name, igPageId);
              }
            }

            const ttUser =
              localStorage.getItem(`koko_active_tt_username_${cid}`) ||
              localStorage.getItem(`koko_active_tt_account_${cid}`);
            if (ttUser) {
              registerAccount('tiktok', ttUser, formatTikTokHandle(ttUser), client.name);
            }

            const pagesStr = localStorage.getItem(`koko_meta_available_pages_${cid}`);
            if (pagesStr) {
              const pages: MetaPageItem[] = JSON.parse(pagesStr);
              if (Array.isArray(pages)) {
                pages.forEach((p) => {
                  const u =
                    p.instagramBusinessAccount?.username ||
                    resolveInstagramUsername(undefined, p.id, p.name);
                  if (u) {
                    registerAccount(
                      'instagram',
                      u,
                      p.name,
                      client.name,
                      p.id,
                      p.instagramBusinessAccount?.followersCount
                    );
                  }
                });
              }
            }
          } catch (e) {}
        });
      }

      // D. Fetch server-persisted social accounts across all clients
      try {
        const sRes = await axios.get('/api/social-accounts?clientId=all');
        if (Array.isArray(sRes.data)) {
          sRes.data.forEach((sa: any) => {
            const cName = clientNameById.get(sa.clientId) || sa.client?.name;
            if (sa.platform === 'instagram') {
              const resolved = resolveInstagramUsername(sa.platformAccountId, sa.pageId, sa.pageName);
              if (resolved) {
                registerAccount('instagram', resolved, sa.pageName || `@${resolved}`, cName, sa.pageId);
              }
            } else if (sa.platform === 'tiktok' && sa.platformAccountId) {
              registerAccount('tiktok', sa.platformAccountId, formatTikTokHandle(sa.platformAccountId), cName);
            }
          });
        }
      } catch (e) {}

      // E. Include all verified agency managed pages connected to the site
      DEFAULT_VERIFIED_PAGES.forEach((vp) => {
        const u = vp.instagramBusinessAccount?.username;
        if (u) {
          registerAccount('instagram', u, vp.name, vp.category, vp.id);
        }
      });

      // Ensure primary connected TikTok account (@kash8342) is included if not already present
      registerAccount('tiktok', 'kash8342', '@kash8342', 'Connected TikTok Channel');

      // F. Include any extra accounts added on the Bonus Tracker page
      if (typeof window !== 'undefined') {
        try {
          const extraStr = localStorage.getItem(STORAGE_EXTRA_ACCOUNTS_KEY);
          if (extraStr) {
            const extraList: ConnectedBonusAccount[] = JSON.parse(extraStr);
            if (Array.isArray(extraList)) {
              extraList.forEach((ea) => {
                registerAccount(ea.platform, ea.username, ea.displayName, ea.clientName, ea.pageId);
              });
            }
          }
        } catch (e) {}
      }

      const accountsList = Array.from(accountMap.values());
      setConnectedAccounts(accountsList);

      // G. Gather any already-synced real videos from localStorage reports first for instant display
      const videoMap = new Map<string, BonusVideoItem>();

      const ingestPostsForAccount = (acc: ConnectedBonusAccount, rawPosts: any[]) => {
        const cleanPosts = sanitizePostsList(rawPosts || []);
        cleanPosts.forEach((p: ContentPostData) => {
          const views = Number(p.viewsCount) || 0;
          const isVideo =
            p.contentFormat === 'Videos' ||
            String(p.platform || '').toLowerCase() === 'tiktok' ||
            String(p.permalink || '').includes('/reel/') ||
            String(p.permalink || '').includes('/video/') ||
            views > 0;
          if (!isVideo) return;

          const item: BonusVideoItem = {
            ...p,
            platform: acc.platform,
            contentFormat: 'Videos',
            viewsCount: views,
            likesCount: Number(p.likesCount) || 0,
            commentsCount: Number(p.commentsCount) || 0,
            sharesCount: Number(p.sharesCount) || 0,
            accountKey: acc.id,
            accountHandle: acc.handle,
            accountDisplayName: acc.displayName,
          };
          const vKey = getVideoUniqueKey(item);
          const existing = videoMap.get(vKey);
          if (!existing || item.viewsCount >= existing.viewsCount) {
            videoMap.set(vKey, item);
          }
        });
      };

      // Scan live endpoints for every connected account in parallel
      await Promise.allSettled(
        accountsList.map(async (acc) => {
          setConnectedAccounts((prev) =>
            prev.map((a) => (a.id === acc.id ? { ...a, isScanning: true } : a))
          );
          try {
            if (acc.platform === 'instagram') {
              const res = await axios.get(
                `/api/instagram/posts?username=${encodeURIComponent(acc.username)}&pageId=${encodeURIComponent(
                  acc.pageId || ''
                )}&pageName=${encodeURIComponent(acc.displayName || '')}`
              );
              if (res.data?.success && Array.isArray(res.data?.posts)) {
                ingestPostsForAccount(acc, res.data.posts);
              }
              if (res.data?.followerCount != null) {
                setConnectedAccounts((prev) =>
                  prev.map((a) =>
                    a.id === acc.id
                      ? {
                          ...a,
                          followerCount: Number(res.data.followerCount) || a.followerCount,
                          isScanning: false,
                          lastScannedAt: new Date().toISOString(),
                        }
                      : a
                  )
                );
                return;
              }
            } else {
              const res = await axios.get(
                `/api/tiktok/posts?username=${encodeURIComponent(acc.username)}`
              );
              if (res.data?.success && Array.isArray(res.data?.posts)) {
                ingestPostsForAccount(acc, res.data.posts);
              }
              if (res.data?.followerCount != null) {
                setConnectedAccounts((prev) =>
                  prev.map((a) =>
                    a.id === acc.id
                      ? {
                          ...a,
                          followerCount: Number(res.data.followerCount) || a.followerCount,
                          isScanning: false,
                          lastScannedAt: new Date().toISOString(),
                        }
                      : a
                  )
                );
                return;
              }
            }
          } catch (e) {
            // Keep cached videos on network error
          }
          setConnectedAccounts((prev) =>
            prev.map((a) =>
              a.id === acc.id
                ? { ...a, isScanning: false, lastScannedAt: new Date().toISOString() }
                : a
            )
          );
        })
      );

      // Also check any manually linked posts in client reports that belong to connected accounts
      if (typeof window !== 'undefined') {
        allClients.forEach((client) => {
          try {
            const postsStr = localStorage.getItem(`koko_posts_${client.id}`);
            if (postsStr) {
              const parsed = sanitizePostsList(JSON.parse(postsStr));
              parsed.forEach((p: ContentPostData) => {
                const plat = String(p.platform || '').toLowerCase() === 'tiktok' ? 'tiktok' : 'instagram';
                const matchingAcc =
                  accountsList.find(
                    (a) =>
                      a.platform === plat &&
                      (String(p.title || '').toLowerCase().includes(a.username.toLowerCase()) ||
                        String(p.permalink || '').toLowerCase().includes(a.username.toLowerCase()))
                  ) || accountsList.find((a) => a.platform === plat);
                if (matchingAcc) {
                  ingestPostsForAccount(matchingAcc, [p]);
                }
              });
            }
          } catch (e) {}
        });
      }

      const mergedScanned = Array.from(videoMap.values()).sort(
        (a, b) => (Number(b.viewsCount) || 0) - (Number(a.viewsCount) || 0)
      );

      if (mergedScanned.length > 0) {
        setScannedVideos(mergedScanned);
        try {
          localStorage.setItem(STORAGE_SCANNED_VIDEOS_KEY, JSON.stringify(mergedScanned));
        } catch (e) {}

        // Auto-sync 50K+ qualifying videos into Tracked Bonus Videos (unless explicitly unpicked by user)
        const qualifying50k = mergedScanned.filter(
          (v) => (Number(v.viewsCount) || 0) >= BONUS_VIEW_THRESHOLD
        );

        setTrackedVideos((prevTracked) => {
          const trackedMap = new Map<string, BonusVideoItem>();
          prevTracked.forEach((tv) => {
            if ((Number(tv.viewsCount) || 0) >= BONUS_VIEW_THRESHOLD) {
              trackedMap.set(getVideoUniqueKey(tv), tv);
            }
          });
          qualifying50k.forEach((qv) => {
            const k = getVideoUniqueKey(qv);
            if (!currentUnpickedIds.includes(k)) {
              trackedMap.set(k, qv);
            }
          });
          const updatedTracked = Array.from(trackedMap.values()).sort(
            (a, b) => (Number(b.viewsCount) || 0) - (Number(a.viewsCount) || 0)
          );
          try {
            localStorage.setItem(STORAGE_TRACKED_VIDEOS_KEY, JSON.stringify(updatedTracked));
          } catch (e) {}
          return updatedTracked;
        });
      }
    } finally {
      setIsScanningAll(false);
    }
  };

  // Toggle whether a 50K+ video is picked/tracked in the Bonus Tracker
  const handleToggleTrackVideo = (video: BonusVideoItem) => {
    if ((Number(video.viewsCount) || 0) < BONUS_VIEW_THRESHOLD) {
      alert('Only videos with 50,000 views and above qualify to be tracked under Bonus Tracker.');
      return;
    }

    const vKey = getVideoUniqueKey(video);
    const isCurrentlyTracked = trackedVideos.some((tv) => getVideoUniqueKey(tv) === vKey);

    if (isCurrentlyTracked) {
      const updatedTracked = trackedVideos.filter((tv) => getVideoUniqueKey(tv) !== vKey);
      const updatedUnpicked = Array.from(new Set([...unpickedIds, vKey]));
      setTrackedVideos(updatedTracked);
      setUnpickedIds(updatedUnpicked);
      try {
        localStorage.setItem(STORAGE_TRACKED_VIDEOS_KEY, JSON.stringify(updatedTracked));
        localStorage.setItem(STORAGE_UNPICKED_IDS_KEY, JSON.stringify(updatedUnpicked));
      } catch (e) {}
    } else {
      const updatedTracked = [...trackedVideos, video].sort(
        (a, b) => (Number(b.viewsCount) || 0) - (Number(a.viewsCount) || 0)
      );
      const updatedUnpicked = unpickedIds.filter((id) => id !== vKey);
      setTrackedVideos(updatedTracked);
      setUnpickedIds(updatedUnpicked);
      try {
        localStorage.setItem(STORAGE_TRACKED_VIDEOS_KEY, JSON.stringify(updatedTracked));
        localStorage.setItem(STORAGE_UNPICKED_IDS_KEY, JSON.stringify(updatedUnpicked));
      } catch (e) {}
    }
  };

  // Pick all 50K+ videos currently visible (matching active month/date filter)
  const handlePickAllQualifying = () => {
    const qualifying = scannedVideos.filter(
      (v) =>
        (Number(v.viewsCount) || 0) >= BONUS_VIEW_THRESHOLD &&
        matchesActiveDateFilter(v.publishedAt)
    );
    const trackedMap = new Map<string, BonusVideoItem>();
    trackedVideos.forEach((tv) => trackedMap.set(getVideoUniqueKey(tv), tv));
    qualifying.forEach((qv) => trackedMap.set(getVideoUniqueKey(qv), qv));

    const updatedTracked = Array.from(trackedMap.values()).sort(
      (a, b) => (Number(b.viewsCount) || 0) - (Number(a.viewsCount) || 0)
    );
    setTrackedVideos(updatedTracked);
    const pickedKeys = new Set(qualifying.map((q) => getVideoUniqueKey(q)));
    const remainingUnpicked = unpickedIds.filter((id) => !pickedKeys.has(id));
    setUnpickedIds(remainingUnpicked);
    try {
      localStorage.setItem(STORAGE_TRACKED_VIDEOS_KEY, JSON.stringify(updatedTracked));
      localStorage.setItem(STORAGE_UNPICKED_IDS_KEY, JSON.stringify(remainingUnpicked));
    } catch (e) {}
  };

  // Auto-preview video metadata when pasting an Instagram or TikTok URL
  const handleFetchVideoUrlPreview = async () => {
    if (!videoUrlInput.trim()) return;
    setIsFetchingPreview(true);
    setAddVideoError('');
    try {
      const res = await axios.get(`/api/media-preview?url=${encodeURIComponent(videoUrlInput.trim())}`);
      if (res.data?.success) {
        const plat = res.data.platform === 'tiktok' ? 'tiktok' : 'instagram';
        setVideoPlatformInput(plat);
        if (res.data.title) setVideoTitleInput(res.data.title);
        if (res.data.thumbnailUrl) setVideoThumbnailInput(res.data.thumbnailUrl);
        if (res.data.authorName && !videoHandleInput) {
          setVideoHandleInput(res.data.authorName);
        }
      }
    } catch (e) {
      // Allow manual entry if preview endpoint fails
    } finally {
      setIsFetchingPreview(false);
    }
  };

  // Add a 50K+ video directly to Bonus Tracker
  const handleAddQualifyingVideo = (e: React.FormEvent) => {
    e.preventDefault();
    setAddVideoError('');
    const views = Number(String(videoViewsInput).replace(/,/g, '')) || 0;
    if (views < BONUS_VIEW_THRESHOLD) {
      setAddVideoError('Only videos that have reached 50,000 views and above can be tracked in Bonus Tracker.');
      return;
    }

    const rawHandle = videoHandleInput.trim() || (videoPlatformInput === 'tiktok' ? '@kash8342' : '@elijah_kasumba');
    const cleanUser =
      videoPlatformInput === 'instagram'
        ? normalizeInstagramUsername(rawHandle)
        : normalizeTikTokUsername(rawHandle);
    const handle = videoPlatformInput === 'tiktok' ? formatTikTokHandle(cleanUser) : `@${cleanUser}`;
    const accountKey = `${videoPlatformInput}:${cleanUser.toLowerCase()}`;

    const matchedAcc = connectedAccounts.find((a) => a.id === accountKey);
    const publishedIso = videoDateInput
      ? new Date(`${videoDateInput}T12:00:00`).toISOString()
      : new Date().toISOString();
    const newVideo: BonusVideoItem = {
      id: `bonus_${Date.now()}`,
      postId: `bonus_${Date.now()}`,
      platform: videoPlatformInput,
      contentFormat: 'Videos',
      title: videoTitleInput.trim() || `${handle} • 50K+ Bonus Video`,
      viewsCount: views,
      likesCount: Number(String(videoLikesInput).replace(/,/g, '')) || 0,
      commentsCount: Number(String(videoCommentsInput).replace(/,/g, '')) || 0,
      sharesCount: 0,
      publishedAt: publishedIso,
      isTopPerformer: true,
      thumbnailUrl: videoThumbnailInput.trim() || null,
      permalink: videoUrlInput.trim() || null,
      accountKey,
      accountHandle: handle,
      accountDisplayName: matchedAcc?.displayName || handle,
    };

    const updatedScanned = [newVideo, ...scannedVideos].sort(
      (a, b) => (Number(b.viewsCount) || 0) - (Number(a.viewsCount) || 0)
    );
    const updatedTracked = [newVideo, ...trackedVideos].sort(
      (a, b) => (Number(b.viewsCount) || 0) - (Number(a.viewsCount) || 0)
    );

    setScannedVideos(updatedScanned);
    setTrackedVideos(updatedTracked);
    try {
      localStorage.setItem(STORAGE_SCANNED_VIDEOS_KEY, JSON.stringify(updatedScanned));
      localStorage.setItem(STORAGE_TRACKED_VIDEOS_KEY, JSON.stringify(updatedTracked));
    } catch (e) {}

    setVideoUrlInput('');
    setVideoTitleInput('');
    setVideoViewsInput('50000');
    setVideoLikesInput('0');
    setVideoCommentsInput('0');
    setVideoThumbnailInput('');
    setShowAddVideoModal(false);
  };

  // Add & Scan another connected account directly from Bonus Tracker
  const handleAddAndScanAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccHandle.trim()) return;

    const cleanUser =
      newAccPlatform === 'instagram'
        ? normalizeInstagramUsername(newAccHandle)
        : normalizeTikTokUsername(newAccHandle);
    if (!cleanUser) return;

    const handle = newAccPlatform === 'tiktok' ? formatTikTokHandle(cleanUser) : `@${cleanUser}`;
    const newEntry: ConnectedBonusAccount = {
      id: `${newAccPlatform}:${cleanUser.toLowerCase()}`,
      platform: newAccPlatform,
      username: cleanUser,
      handle,
      displayName: newAccDisplayName.trim() || handle,
      clientName: 'Connected Account',
    };

    try {
      const existingStr = localStorage.getItem(STORAGE_EXTRA_ACCOUNTS_KEY);
      const list: ConnectedBonusAccount[] = existingStr ? JSON.parse(existingStr) : [];
      const filtered = list.filter((a) => a.id !== newEntry.id);
      filtered.push(newEntry);
      localStorage.setItem(STORAGE_EXTRA_ACCOUNTS_KEY, JSON.stringify(filtered));
    } catch (e) {}

    setNewAccHandle('');
    setNewAccDisplayName('');
    setShowAddAccountModal(false);
    await discoverAndScanConnectedAccounts();
  };

  // Build list of selectable months (recent 12 months + any months present in scanned/tracked videos)
  const availableMonthsWithCounts = useMemo(() => {
    const monthCounts = new Map<string, number>();
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthCounts.set(ym, 0);
    }

    scannedVideos.forEach((v) => {
      if ((Number(v.viewsCount) || 0) < BONUS_VIEW_THRESHOLD) return;
      if (!v.publishedAt) return;
      const d = new Date(v.publishedAt);
      if (isNaN(d.getTime())) return;
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthCounts.set(ym, (monthCounts.get(ym) || 0) + 1);
    });

    return Array.from(monthCounts.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([ym, count]) => ({
        ym,
        label: formatMonthLabel(ym),
        count,
      }));
  }, [scannedVideos]);

  // Per-account video counts & 50K+ counts (respecting active month/date filter)
  const accountStatsMap = useMemo(() => {
    const map = new Map<string, { totalVideos: number; qualifying50k: number; trackedCount: number; topViews: number }>();
    connectedAccounts.forEach((acc) => {
      const accVideos = scannedVideos.filter(
        (v) => v.accountKey === acc.id && matchesActiveDateFilter(v.publishedAt)
      );
      const q50k = accVideos.filter((v) => (Number(v.viewsCount) || 0) >= BONUS_VIEW_THRESHOLD);
      const tracked = trackedVideos.filter(
        (tv) =>
          tv.accountKey === acc.id &&
          (Number(tv.viewsCount) || 0) >= BONUS_VIEW_THRESHOLD &&
          matchesActiveDateFilter(tv.publishedAt)
      );
      const topViews = accVideos.reduce((max, v) => Math.max(max, Number(v.viewsCount) || 0), 0);
      map.set(acc.id, {
        totalVideos: accVideos.length,
        qualifying50k: q50k.length,
        trackedCount: tracked.length,
        topViews,
      });
    });
    return map;
  }, [connectedAccounts, scannedVideos, trackedVideos, dateFilterMode, selectedMonth, startDate, endDate]);

  // All 50K+ qualifying videos across connected accounts for active month/date filter
  const allQualifying50kVideos = useMemo(() => {
    return scannedVideos.filter(
      (v) =>
        (Number(v.viewsCount) || 0) >= BONUS_VIEW_THRESHOLD &&
        matchesActiveDateFilter(v.publishedAt)
    );
  }, [scannedVideos, dateFilterMode, selectedMonth, startDate, endDate]);

  // Scanned videos matching active month/date filter
  const dateFilteredScannedVideos = useMemo(() => {
    return scannedVideos.filter((v) => matchesActiveDateFilter(v.publishedAt));
  }, [scannedVideos, dateFilterMode, selectedMonth, startDate, endDate]);

  // Filtered videos for the Account Video Picker section
  const filteredPickerVideos = useMemo(() => {
    return scannedVideos.filter((v) => {
      if (!matchesActiveDateFilter(v.publishedAt)) {
        return false;
      }
      const views = Number(v.viewsCount) || 0;
      if (viewFilterMode === '50k_only' && views < BONUS_VIEW_THRESHOLD) {
        return false;
      }
      if (selectedAccountKey !== 'ALL' && v.accountKey !== selectedAccountKey) {
        return false;
      }
      if (selectedPlatform !== 'all' && v.platform !== selectedPlatform) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = String(v.title || '').toLowerCase().includes(q);
        const matchHandle = String(v.accountHandle || '').toLowerCase().includes(q);
        const matchName = String(v.accountDisplayName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchHandle && !matchName) return false;
      }
      return true;
    });
  }, [scannedVideos, viewFilterMode, selectedAccountKey, selectedPlatform, searchQuery, dateFilterMode, selectedMonth, startDate, endDate]);

  // Filtered Tracked Bonus Videos
  const filteredTrackedVideos = useMemo(() => {
    return trackedVideos.filter((v) => {
      if ((Number(v.viewsCount) || 0) < BONUS_VIEW_THRESHOLD) return false;
      if (!matchesActiveDateFilter(v.publishedAt)) return false;
      if (selectedAccountKey !== 'ALL' && v.accountKey !== selectedAccountKey) return false;
      if (selectedPlatform !== 'all' && v.platform !== selectedPlatform) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = String(v.title || '').toLowerCase().includes(q);
        const matchHandle = String(v.accountHandle || '').toLowerCase().includes(q);
        const matchName = String(v.accountDisplayName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchHandle && !matchName) return false;
      }
      return true;
    });
  }, [trackedVideos, selectedAccountKey, selectedPlatform, searchQuery, dateFilterMode, selectedMonth, startDate, endDate]);

  // Summary KPIs
  const summaryStats = useMemo(() => {
    const totalBonusViews = filteredTrackedVideos.reduce(
      (sum, v) => sum + (Number(v.viewsCount) || 0),
      0
    );
    const totalBonusLikes = filteredTrackedVideos.reduce(
      (sum, v) => sum + (Number(v.likesCount) || 0),
      0
    );
    const totalBonusComments = filteredTrackedVideos.reduce(
      (sum, v) => sum + (Number(v.commentsCount) || 0),
      0
    );
    return {
      connectedCount: connectedAccounts.length,
      qualifying50kCount: allQualifying50kVideos.length,
      trackedCount: filteredTrackedVideos.length,
      totalBonusViews,
      totalBonusLikes,
      totalBonusComments,
    };
  }, [connectedAccounts, allQualifying50kVideos, filteredTrackedVideos]);

  const getBonusTierBadge = (views: number) => {
    if (views >= 1_000_000) {
      return { label: '1M+ Mega Viral Bonus', className: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
    }
    if (views >= 500_000) {
      return { label: '500K+ Super Bonus', className: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    }
    if (views >= 100_000) {
      return { label: '100K+ High Performer', className: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    }
    if (views >= BONUS_VIEW_THRESHOLD) {
      return { label: '50K+ Bonus Qualified', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    }
    return { label: 'Below 50K Threshold', className: 'bg-gray-200 text-gray-600 border-gray-300' };
  };

  // Export Tracked Bonus Videos as CSV
  const buildBonusCsv = () => {
    const headers = [
      'Bonus Month',
      'Published Date',
      'Platform',
      'Account Handle',
      'Account Name',
      'Video Title',
      'Views (50K+ Qualified)',
      'Likes',
      'Comments',
      'Bonus Tier',
      'Video Link',
    ];
    const rows = filteredTrackedVideos.map((v) => {
      const views = Number(v.viewsCount) || 0;
      const tier = getBonusTierBadge(views).label;
      const d = v.publishedAt ? new Date(v.publishedAt) : null;
      const validDate = d && !isNaN(d.getTime()) ? d : null;
      const dateStr = validDate ? validDate.toISOString().split('T')[0] : '';
      const monthStr = validDate
        ? validDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'All Time';
      return [
        `"${monthStr}"`,
        `"${dateStr}"`,
        `"${v.platform.toUpperCase()}"`,
        `"${v.accountHandle}"`,
        `"${(v.accountDisplayName || '').replace(/"/g, '""')}"`,
        `"${(v.title || '').replace(/"/g, '""')}"`,
        views,
        Number(v.likesCount) || 0,
        Number(v.commentsCount) || 0,
        `"${tier}"`,
        `"${v.permalink || ''}"`,
      ];
    });
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  const handleCopyCsv = () => {
    const csv = buildBonusCsv();
    navigator.clipboard.writeText(csv);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2500);
  };

  const handleDownloadCsv = () => {
    const csv = buildBonusCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const periodSuffix =
      dateFilterMode === 'MONTH'
        ? selectedMonth
        : dateFilterMode === 'CUSTOM'
        ? `${startDate}_to_${endDate}`
        : new Date().toISOString().split('T')[0];
    link.setAttribute('download', `koko_bonus_tracker_50k_videos_${periodSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-14">
      {/* 1. Top Hero Banner */}
      <div className="bg-black text-white rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-purple-500" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              50,000+ Views Milestone Tracker
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-heading flex items-center gap-3">
              Bonus Tracker
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                50K+ Views Minimum
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl">
              View all Instagram & TikTok accounts connected to the platform and pick videos that have reached{' '}
              <strong className="text-white">50,000+ views</strong> to track for creator & team bonuses.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => discoverAndScanConnectedAccounts()}
              disabled={isScanningAll}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanningAll ? 'animate-spin' : ''}`} />
              {isScanningAll ? 'Scanning Connected Accounts...' : 'Scan Connected Accounts Live'}
            </button>

            <button
              type="button"
              onClick={() => setShowAddVideoModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add 50K+ Video Link
            </button>

            <button
              type="button"
              onClick={() => setShowAddAccountModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              + Scan Handle
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-neutral-800/80">
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
              Connected Accounts
            </span>
            <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-2">
              {summaryStats.connectedCount}
              <span className="text-xs font-semibold text-emerald-400">Active Channels</span>
            </div>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
              50K+ Eligible Videos Found
            </span>
            <div className="text-2xl font-black text-amber-400 mt-1 flex items-baseline gap-2">
              {summaryStats.qualifying50kCount}
              <span className="text-xs font-semibold text-neutral-400">&ge; 50,000 Views</span>
            </div>
          </div>

          <div className="bg-neutral-900/90 border border-emerald-500/30 rounded-2xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
              Tracked Bonus Videos
            </span>
            <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-2">
              {summaryStats.trackedCount}
              <span className="text-xs font-semibold text-emerald-400">Picked for Bonus</span>
            </div>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
              Combined Bonus Views
            </span>
            <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-2">
              {formatNumberShort(summaryStats.totalBonusViews)}
              <span className="text-xs font-semibold text-amber-300">
                {summaryStats.totalBonusViews.toLocaleString()} total
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 1B. Bonus Month & Date Range Picker Bar */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                Filter Bonuses by Month & Date
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-black text-amber-300">
                {dateFilterMode === 'ALL'
                  ? 'Showing: All Months'
                  : dateFilterMode === 'MONTH'
                  ? `Month: ${formatMonthLabel(selectedMonth)}`
                  : `${startDate} to ${endDate}`}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Pick a specific month or custom date range to view and export 50K+ bonus videos for that period.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Quick Period Buttons */}
          <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200">
            <button
              type="button"
              onClick={() => setDateFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilterMode === 'ALL'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              All Months
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                handleSelectMonthFilter(
                  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                );
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilterMode === 'MONTH' &&
                selectedMonth ===
                  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
                  ? 'bg-black text-white shadow-xs'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                handleSelectMonthFilter(
                  `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
                );
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilterMode === 'MONTH' &&
                selectedMonth ===
                  `${new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getFullYear()}-${String(
                    new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getMonth() + 1
                  ).padStart(2, '0')}`
                  ? 'bg-black text-white shadow-xs'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Last Month
            </button>
          </div>

          {/* Month Dropdown Selector */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Month:</span>
            <select
              value={dateFilterMode === 'MONTH' ? selectedMonth : 'ALL'}
              onChange={(e) => handleSelectMonthFilter(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-gray-900 outline-none cursor-pointer"
            >
              <option value="ALL">All Months</option>
              {availableMonthsWithCounts.map((m) => (
                <option key={m.ym} value={m.ym}>
                  {m.label} {m.count > 0 ? `(${m.count} >= 50K)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Native Calendar Month Picker */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) {
                  handleSelectMonthFilter(e.target.value);
                }
              }}
              aria-label="Pick bonus month"
              className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer"
            />
          </div>

          {/* Exact Start / End Date Range Pickers */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDateFilterMode('CUSTOM');
              }}
              aria-label="Bonus start date"
              className="bg-transparent text-xs font-semibold text-gray-800 outline-none cursor-pointer"
            />
            <span className="text-[11px] text-gray-400 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDateFilterMode('CUSTOM');
              }}
              aria-label="Bonus end date"
              className="bg-transparent text-xs font-semibold text-gray-800 outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 2. Connected Accounts Directory */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-black" />
              All Connected Accounts ({connectedAccounts.length})
            </h2>
            <p className="text-xs text-gray-500">
              Click any connected account below to filter its videos, or view all connected accounts together.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedAccountKey !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedAccountKey('ALL')}
                className="px-3 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-all cursor-pointer"
              >
                Show All Accounts ({connectedAccounts.length})
              </button>
            )}
            <Link
              href="/settings"
              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all"
            >
              Manage Connections →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {connectedAccounts.map((acc) => {
            const stats = accountStatsMap.get(acc.id) || {
              totalVideos: 0,
              qualifying50k: 0,
              trackedCount: 0,
              topViews: 0,
            };
            const isSelected = selectedAccountKey === acc.id;

            return (
              <div
                key={acc.id}
                onClick={() => setSelectedAccountKey(isSelected ? 'ALL' : acc.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-black text-white border-black shadow-lg ring-2 ring-amber-400/70'
                    : 'bg-gray-50/70 hover:bg-white text-gray-900 border-gray-200 hover:border-gray-300 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          acc.platform === 'instagram'
                            ? 'bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 text-white'
                            : isSelected
                            ? 'bg-white text-black'
                            : 'bg-black text-white'
                        }`}
                      >
                        {acc.platform}
                      </span>
                      {acc.isScanning && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Scanning
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-sm truncate mt-1.5">{acc.displayName}</h3>
                    <p className={`text-xs font-semibold truncate ${isSelected ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {acc.handle}
                      {acc.followerCount != null
                        ? ` • ${formatNumberShort(acc.followerCount)} followers`
                        : ''}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black shrink-0 ${
                      stats.qualifying50k > 0
                        ? 'bg-amber-400 text-black'
                        : isSelected
                        ? 'bg-neutral-800 text-neutral-300'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {stats.qualifying50k} &ge; 50K
                  </span>
                </div>

                <div
                  className={`pt-2.5 border-t flex items-center justify-between text-[11px] ${
                    isSelected ? 'border-neutral-800 text-neutral-300' : 'border-gray-200/80 text-gray-500'
                  }`}
                >
                  <span>
                    Scanned: <strong>{stats.totalVideos} videos</strong>
                  </span>
                  <span>
                    Top Views:{' '}
                    <strong className={stats.topViews >= BONUS_VIEW_THRESHOLD ? 'text-emerald-500' : ''}>
                      {stats.topViews > 0 ? formatNumberShort(stats.topViews) : '—'}
                    </strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Tracked Bonus Videos Section (Videos >= 50K Views Picked for Bonus) */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">
                Tracked Bonus Videos (50K+ Views)
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {filteredTrackedVideos.length} Videos Tracked
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Videos from your connected accounts that have reached <strong>50,000+ views</strong> and are actively tracked for bonuses.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {allQualifying50kVideos.length > trackedVideos.length && (
              <button
                type="button"
                onClick={handlePickAllQualifying}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-extrabold rounded-xl transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Pick All 50K+ Videos ({allQualifying50kVideos.length})
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyCsv}
              disabled={filteredTrackedVideos.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40"
            >
              {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCsv ? 'Copied CSV!' : 'Copy CSV'}
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={filteredTrackedVideos.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              Export Bonus CSV
            </button>
          </div>
        </div>

        {filteredTrackedVideos.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-gray-50 border border-dashed border-gray-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-sm font-extrabold text-gray-900">
                {dateFilterMode === 'MONTH'
                  ? `No 50K+ Bonus Videos Found for ${formatMonthLabel(selectedMonth)}`
                  : dateFilterMode === 'CUSTOM'
                  ? `No 50K+ Bonus Videos Found from ${startDate} to ${endDate}`
                  : 'No 50K+ Bonus Videos Picked Yet for This Filter'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Pick any qualifying 50K+ video from the connected accounts section below, switch the month filter, or click{' '}
                <strong>Add 50K+ Video Link</strong> to track a specific 50K+ reel or TikTok video.
              </p>
            </div>
            <div className="flex items-center justify-center flex-wrap gap-2 pt-2">
              {dateFilterMode !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setDateFilterMode('ALL')}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-amber-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Show All Months
                </button>
              )}
              {allQualifying50kVideos.length > 0 && (
                <button
                  type="button"
                  onClick={handlePickAllQualifying}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Pick All {allQualifying50kVideos.length} Qualifying 50K+ Videos
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAddVideoModal(true)}
                className="px-4 py-2 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                + Add 50K+ Video Link
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrackedVideos.map((video, idx) => {
              const views = Number(video.viewsCount) || 0;
              const likes = Number(video.likesCount) || 0;
              const comments = Number(video.commentsCount) || 0;
              const engRate = views > 0 ? (((likes + comments) / views) * 100).toFixed(1) : '0.0';
              const tier = getBonusTierBadge(views);
              const thumb = getProxiedUrl(video.thumbnailUrl);

              return (
                <div
                  key={getVideoUniqueKey(video)}
                  className="bg-black text-white rounded-3xl overflow-hidden border border-neutral-800 shadow-xl flex flex-col justify-between group"
                >
                  <div>
                    {/* Video Thumbnail Header */}
                    <div className="relative h-64 bg-neutral-900 overflow-hidden">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={video.title || 'Bonus Video'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-black text-neutral-500">
                          <Video className="w-10 h-10 mb-2 text-amber-400/70" />
                          <span className="text-xs font-bold text-neutral-400">{video.accountHandle}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md ${
                            video.platform === 'instagram'
                              ? 'bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 text-white'
                              : 'bg-white text-black'
                          }`}
                        >
                          {video.platform} #{idx + 1}
                        </span>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border backdrop-blur-md ${tier.className}`}
                        >
                          ★ {tier.label}
                        </span>
                      </div>

                      {/* Bottom Overlay Info */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-extrabold text-emerald-400 truncate">
                              {video.accountHandle}
                            </p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/70 text-neutral-300 border border-neutral-700">
                              {formatVideoDateBadge(video.publishedAt)}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug mt-0.5">
                            {video.title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="p-4 grid grid-cols-3 gap-2 border-b border-neutral-800/80 text-center bg-neutral-950">
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <div className="text-base font-black text-amber-400 flex items-center justify-center gap-1">
                          <Flame className="w-4 h-4" />
                          {formatNumberShort(views)}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/80">
                          Views (50K+)
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-neutral-900">
                        <div className="text-base font-black text-white">{formatNumberShort(likes)}</div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Likes
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-neutral-900">
                        <div className="text-base font-black text-emerald-400">{engRate}%</div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Eng. Rate
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-4 bg-black flex items-center justify-between gap-2">
                    {video.permalink ? (
                      <a
                        href={video.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-300 hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                        Watch Live Video
                      </a>
                    ) : (
                      <span className="text-xs text-neutral-500 font-medium">{video.accountDisplayName}</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleTrackVideo(video)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/30 hover:border-rose-500/40 text-xs font-bold transition-all cursor-pointer"
                      title="Click to remove from Tracked Bonus Videos"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tracked ✓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Pick Videos from Connected Accounts (50K+ Views Filter & Picker) */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Pick Qualifying Videos from Connected Accounts
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Select videos with <strong>50,000+ views</strong> from your connected accounts to track on this Bonus Tracker page.
            </p>
          </div>

          {/* Filter Controls */}
          <div className="flex items-center flex-wrap gap-2">
            {/* 50K+ Only vs All Scanned Videos Toggle */}
            <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200">
              <button
                type="button"
                onClick={() => setViewFilterMode('50k_only')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewFilterMode === '50k_only'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                50K+ Views Only ({allQualifying50kVideos.length})
              </button>
              <button
                type="button"
                onClick={() => setViewFilterMode('all_videos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewFilterMode === 'all_videos'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                All Scanned Videos ({dateFilteredScannedVideos.length})
              </button>
            </div>

            {/* Platform Filter */}
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800 rounded-xl px-3 py-2 outline-none cursor-pointer"
            >
              <option value="all">All Platforms</option>
              <option value="instagram">Instagram Only</option>
              <option value="tiktok">TikTok Only</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search @account or video..."
                className="pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-black"
              />
            </div>
          </div>
        </div>

        {filteredPickerVideos.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
            <p className="text-sm font-bold text-gray-800">
              {isScanningAll
                ? 'Scanning live videos from your connected accounts...'
                : viewFilterMode === '50k_only'
                ? 'No videos >= 50,000 views found for the current filter.'
                : 'No videos found for the current filter.'}
            </p>
            {viewFilterMode === '50k_only' && scannedVideos.length > 0 && (
              <button
                type="button"
                onClick={() => setViewFilterMode('all_videos')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-all cursor-pointer mt-2"
              >
                <Eye className="w-3.5 h-3.5" />
                View All {scannedVideos.length} Scanned Videos & Progress Toward 50K
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-3">Video & Caption</th>
                  <th className="py-3 px-3">Connected Account</th>
                  <th className="py-3 px-3">Views & 50K Status</th>
                  <th className="py-3 px-3">Engagement</th>
                  <th className="py-3 px-3 text-right">Bonus Tracker Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredPickerVideos.map((video) => {
                  const views = Number(video.viewsCount) || 0;
                  const qualifies50k = views >= BONUS_VIEW_THRESHOLD;
                  const vKey = getVideoUniqueKey(video);
                  const isPicked = trackedVideos.some((tv) => getVideoUniqueKey(tv) === vKey);
                  const progressPct = Math.min(100, Math.round((views / BONUS_VIEW_THRESHOLD) * 100));
                  const thumb = getProxiedUrl(video.thumbnailUrl);

                  return (
                    <tr
                      key={vKey}
                      className={`transition-colors ${
                        qualifies50k ? 'hover:bg-amber-50/30' : 'opacity-75 hover:bg-gray-50'
                      }`}
                    >
                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-16 rounded-xl bg-gray-900 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                            {thumb ? (
                              <img src={thumb} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Video className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 line-clamp-2 leading-snug">
                              {video.title || 'Social Video'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                {formatVideoDateBadge(video.publishedAt)}
                              </span>
                              {video.permalink && (
                                <a
                                  href={video.permalink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" /> Open post
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full mb-1 ${
                            video.platform === 'instagram'
                              ? 'bg-pink-100 text-pink-800'
                              : 'bg-gray-900 text-white'
                          }`}
                        >
                          {video.platform}
                        </span>
                        <div className="font-bold text-gray-900">{video.accountDisplayName}</div>
                        <div className="text-[11px] text-gray-500 font-medium">{video.accountHandle}</div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-black ${
                              qualifies50k ? 'text-emerald-700' : 'text-gray-800'
                            }`}
                          >
                            {views.toLocaleString()} views
                          </span>
                          {qualifies50k ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              50K+ Qualified
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                              {progressPct}% of 50K
                            </span>
                          )}
                        </div>
                        <div className="w-36 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full rounded-full ${
                              qualifies50k ? 'bg-emerald-500' : 'bg-amber-400'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-gray-600 font-medium">
                        <div>{(Number(video.likesCount) || 0).toLocaleString()} likes</div>
                        <div className="text-[11px] text-gray-400">
                          {(Number(video.commentsCount) || 0).toLocaleString()} comments
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        {qualifies50k ? (
                          <button
                            type="button"
                            onClick={() => handleToggleTrackVideo(video)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                              isPicked
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                : 'bg-black hover:bg-gray-800 text-amber-300'
                            }`}
                          >
                            {isPicked ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Picked for Bonus
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                Pick to Track
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-500 text-[11px] font-semibold">
                            Needs {(BONUS_VIEW_THRESHOLD - views).toLocaleString()} more views
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Add a 50K+ Video by Link */}
      {showAddVideoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative border border-gray-100">
            <button
              type="button"
              onClick={() => setShowAddVideoModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-black p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">Add 50K+ Bonus Video</h3>
                <p className="text-xs text-gray-500">
                  Link an Instagram Reel or TikTok video that has reached 50,000+ views
                </p>
              </div>
            </div>

            {addVideoError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {addVideoError}
              </div>
            )}

            <form onSubmit={handleAddQualifyingVideo} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Video URL (Instagram Reel or TikTok Link)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="https://www.instagram.com/reel/... or https://www.tiktok.com/..."
                    className="flex-1 bg-gray-50 border border-gray-300 text-xs rounded-xl p-2.5 text-gray-900 font-medium outline-none focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={handleFetchVideoUrlPreview}
                    disabled={isFetchingPreview || !videoUrlInput.trim()}
                    className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {isFetchingPreview ? 'Fetching...' : 'Fetch Info'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Platform</label>
                  <select
                    value={videoPlatformInput}
                    onChange={(e) => setVideoPlatformInput(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-2.5 text-gray-900 font-semibold outline-none"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Connected Account</label>
                  <input
                    type="text"
                    list="bonus-connected-handles"
                    value={videoHandleInput}
                    onChange={(e) => setVideoHandleInput(e.target.value)}
                    placeholder="e.g. @elijah_kasumba or @kash8342"
                    className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-2.5 text-gray-900 font-medium outline-none"
                  />
                  <datalist id="bonus-connected-handles">
                    {connectedAccounts.map((acc) => (
                      <option key={acc.id} value={acc.handle}>
                        {acc.displayName}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Video Caption / Title</label>
                  <input
                    type="text"
                    value={videoTitleInput}
                    onChange={(e) => setVideoTitleInput(e.target.value)}
                    placeholder="e.g. Behind the scenes campaign video"
                    className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-2.5 text-gray-900 font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Published Date / Bonus Month
                  </label>
                  <input
                    type="date"
                    value={videoDateInput}
                    onChange={(e) => setVideoDateInput(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-2.5 text-gray-900 font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-emerald-700 block mb-1">
                    Views (Min 50,000) *
                  </label>
                  <input
                    type="number"
                    min={50000}
                    required
                    value={videoViewsInput}
                    onChange={(e) => setVideoViewsInput(e.target.value)}
                    className="w-full bg-emerald-50 border border-emerald-300 text-xs rounded-xl p-2.5 text-gray-900 font-extrabold outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Likes</label>
                  <input
                    type="number"
                    min={0}
                    value={videoLikesInput}
                    onChange={(e) => setVideoLikesInput(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-2.5 text-gray-900 font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Comments</label>
                  <input
                    type="number"
                    min={0}
                    value={videoCommentsInput}
                    onChange={(e) => setVideoCommentsInput(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-2.5 text-gray-900 font-medium outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddVideoModal(false)}
                  className="w-1/2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-black hover:bg-gray-800 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  Track 50K+ Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Quick-Scan Additional Connected Handle */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative border border-gray-100">
            <button
              type="button"
              onClick={() => setShowAddAccountModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-black p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-gray-900 mb-1">Scan Connected Account</h3>
            <p className="text-xs text-gray-500 mb-4">
              Add an Instagram or TikTok handle to scan its live videos for 50K+ bonus qualification.
            </p>

            <form onSubmit={handleAddAndScanAccount} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Platform</label>
                <select
                  value={newAccPlatform}
                  onChange={(e) => setNewAccPlatform(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-3 text-gray-900 font-semibold outline-none"
                >
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Account Handle *</label>
                <input
                  type="text"
                  required
                  value={newAccHandle}
                  onChange={(e) => setNewAccHandle(e.target.value)}
                  placeholder="e.g. @totaltoolsprostoreug or @kash8342"
                  className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-3 text-gray-900 font-medium outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Display Name (Optional)</label>
                <input
                  type="text"
                  value={newAccDisplayName}
                  onChange={(e) => setNewAccDisplayName(e.target.value)}
                  placeholder="e.g. Total Tools Uganda"
                  className="w-full bg-gray-50 border border-gray-300 text-xs rounded-xl p-3 text-gray-900 font-medium outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="w-1/2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl cursor-pointer"
                >
                  Scan Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
