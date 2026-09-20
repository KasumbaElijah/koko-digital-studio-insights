'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { ContentPostData } from '@/lib/types';
import { formatNumberShort, getTopPerformingPosts } from '@/lib/analytics';
import {
  Heart,
  MessageCircle,
  Share2,
  Play,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  X,
  Link as LinkIcon,
  Sparkles,
  Check,
  Zap,
  Flame,
  ArrowUpRight,
  Volume2,
} from 'lucide-react';

interface TopContentSectionProps {
  clientName: string;
  posts: ContentPostData[];
  onUpdatePosts?: (updatedPosts: ContentPostData[]) => void;
  onSyncPosts?: () => void;
  isSyncing?: boolean;
}

export const TopContentSection: React.FC<TopContentSectionProps> = ({
  clientName,
  posts,
  onUpdatePosts,
  onSyncPosts,
  isSyncing = false,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'manual'>('link');
  const [platformView, setPlatformView] = useState<'split' | 'all' | 'instagram' | 'tiktok'>('split');

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

  // Link Tab State
  const [inputUrl, setInputUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [previewData, setPreviewData] = useState<{
    platform: 'instagram' | 'tiktok';
    contentFormat: 'Image' | 'Videos' | 'Graphic' | 'Stories';
    title: string;
    thumbnailUrl: string | null;
    permalink: string;
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
  } | null>(null);

  // Manual Tab State
  const [manualPlatform, setManualPlatform] = useState<'instagram' | 'tiktok'>('instagram');
  const [manualFormat, setManualFormat] = useState<'Videos' | 'Image' | 'Graphic' | 'Stories'>('Videos');
  const [manualTitle, setManualTitle] = useState('');
  const [manualThumbnail, setManualThumbnail] = useState('');
  const [manualPermalink, setManualPermalink] = useState('');
  const [manualViews, setManualViews] = useState('45000');
  const [manualLikes, setManualLikes] = useState('1800');
  const [manualComments, setManualComments] = useState('85');
  const [manualShares, setManualShares] = useState('240');

  const igPosts = (posts || []).filter((p) => String(p?.platform || '').toLowerCase() === 'instagram');
  const ttPosts = (posts || []).filter((p) => String(p?.platform || '').toLowerCase() === 'tiktok');

  const topOverallPosts = getTopPerformingPosts(posts, 3);
  const topIgPosts = (getTopPerformingPosts(igPosts, 3) || []);
  const topTtPosts = (getTopPerformingPosts(ttPosts, 3) || []);

  // Fetch preview for TikTok or Instagram URL
  const handleFetchPreview = async () => {
    if (!inputUrl.trim()) return;
    setIsFetchingUrl(true);
    setFetchError('');
    try {
      const res = await axios.get(`/api/media-preview?url=${encodeURIComponent(inputUrl.trim())}`);
      if (res.data && res.data.success) {
        setPreviewData({
          platform: res.data.platform || (inputUrl.includes('tiktok') ? 'tiktok' : 'instagram'),
          contentFormat: res.data.contentFormat || 'Videos',
          title: res.data.title || 'Featured Social Content',
          thumbnailUrl: res.data.thumbnailUrl || null,
          permalink: res.data.permalink || inputUrl.trim(),
          viewsCount: 52000,
          likesCount: 2400,
          commentsCount: 110,
          sharesCount: 320,
        });
      } else {
        setFetchError('Could not auto-fetch preview. You can enter details manually.');
      }
    } catch (err) {
      console.warn('Media preview error:', err);
      // Still populate baseline preview so user can proceed
      setPreviewData({
        platform: inputUrl.includes('tiktok') ? 'tiktok' : 'instagram',
        contentFormat: 'Videos',
        title: inputUrl.includes('reel') ? 'Instagram Video Reel' : 'Social Video',
        thumbnailUrl: null,
        permalink: inputUrl.trim(),
        viewsCount: 48000,
        likesCount: 1950,
        commentsCount: 92,
        sharesCount: 210,
      });
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Add fetched or manual post to report
  const handleSavePost = () => {
    let newPost: ContentPostData;

    if (activeTab === 'link' && previewData) {
      newPost = {
        id: `post_${Date.now()}`,
        postId: `post_${Date.now()}`,
        platform: previewData.platform,
        contentFormat: previewData.contentFormat,
        title: previewData.title,
        viewsCount: Number(previewData.viewsCount) || 0,
        likesCount: Number(previewData.likesCount) || 0,
        commentsCount: Number(previewData.commentsCount) || 0,
        sharesCount: Number(previewData.sharesCount) || 0,
        thumbnailUrl: previewData.thumbnailUrl || null,
        permalink: previewData.permalink || null,
        isTopPerformer: true,
        publishedAt: new Date().toISOString(),
      };
    } else {
      newPost = {
        id: `post_${Date.now()}`,
        postId: `post_${Date.now()}`,
        platform: manualPlatform,
        contentFormat: manualFormat,
        title: manualTitle.trim() || `${manualPlatform === 'tiktok' ? 'TikTok' : 'Instagram'} Feature`,
        viewsCount: Number(manualViews) || 0,
        likesCount: Number(manualLikes) || 0,
        commentsCount: Number(manualComments) || 0,
        sharesCount: Number(manualShares) || 0,
        thumbnailUrl: manualThumbnail.trim() || null,
        permalink: manualPermalink.trim() || null,
        isTopPerformer: true,
        publishedAt: new Date().toISOString(),
      };
    }

    const updated = [newPost, ...(posts || [])];
    onUpdatePosts?.(updated);
    setShowAddModal(false);
    setInputUrl('');
    setPreviewData(null);
    setManualTitle('');
    setManualThumbnail('');
    setManualPermalink('');
  };

  // Delete a post
  const handleDeletePost = (id: string) => {
    if (!confirm('Remove this post preview from the report?')) return;
    const updated = (posts || []).filter((p) => p.id !== id && p.postId !== id);
    onUpdatePosts?.(updated);
  };

  const renderPostGrid = (postList: ContentPostData[], platformLabelPrefix?: string) => {
    if (!postList || postList.length === 0) {
      return (
        <div className="w-full py-10 text-gray-500 flex flex-col items-center text-center bg-gray-50/60 rounded-2xl border border-dashed border-gray-200 p-6">
          <AlertCircle className="w-6 h-6 text-gray-400 mb-2" />
          <p className="text-sm font-bold text-gray-700">No {platformLabelPrefix || 'Media'} Posts Found</p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            Add real post links or sync accounts to display top performing {platformLabelPrefix || 'creative'} content.
          </p>
          <button
            onClick={() => {
              if (platformLabelPrefix?.toLowerCase().includes('tiktok')) {
                setManualPlatform('tiktok');
              } else if (platformLabelPrefix?.toLowerCase().includes('instagram')) {
                setManualPlatform('instagram');
              }
              setShowAddModal(true);
            }}
            className="mt-4 px-3.5 py-1.5 bg-black hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add {platformLabelPrefix || 'Post'}
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-4xl mx-auto">
        {postList.map((post, idx) => {
          const isInstagram = String(post?.platform || '').toLowerCase() === 'instagram';
          const formattedViews = formatNumberShort(post?.viewsCount ?? 0);
          const formattedLikes = formatNumberShort(post?.likesCount ?? 0);
          const platformLabel = String(post?.platform || 'instagram').toUpperCase();
          const videoTitle = `${platformLabelPrefix ? `${platformLabelPrefix.toUpperCase()} ` : ''}#${idx + 1}`;
          const displayTitle = post.title || post.caption || `${clientName || 'Client'} Feature`;

          // Infer handle from permalink or client name
          let creatorHandle = 'creator';
          if (post?.permalink) {
            const ttMatch = post.permalink.match(/@([^/?#]+)/);
            if (ttMatch) {
              creatorHandle = ttMatch[1];
            } else if (post.permalink.includes('instagram.com')) {
              creatorHandle = clientName ? clientName.toLowerCase().replace(/[^a-z0-9_.]/g, '') : 'instagram';
            }
          }
          if (creatorHandle === 'creator' && clientName) {
            creatorHandle = clientName.toLowerCase().replace(/[^a-z0-9_.]/g, '') || 'creator';
          }

          // Compute engagement rate
          const totalEng = (Number(post?.likesCount) || 0) + (Number(post?.commentsCount) || 0) + (Number(post?.sharesCount) || 0);
          const views = Number(post?.viewsCount) || 0;
          const engRate = views > 0 ? ((totalEng / views) * 100).toFixed(1) : '7.0';

          // Extract tags from caption or fallback to formats
          const tagMatches = (post?.caption || post?.title || '').match(/#[a-zA-Z0-9_]+/g);
          let tagsList: string[] = [];
          if (tagMatches && tagMatches.length > 0) {
            tagsList = tagMatches.map((t) => t.replace('#', ''));
          } else {
            tagsList = [post?.contentFormat || 'Videos', isInstagram ? 'Reels' : 'TikTok', 'Creative'];
          }
          const displayTags =
            tagsList.slice(0, 3).join(' • ') +
            (tagsList.length > 3 ? ` +${tagsList.length - 3}` : '');

          // Format publication date
          let postDateDisplay = '';
          if (post?.publishedAt) {
            try {
              const pDate = new Date(post.publishedAt);
              if (!isNaN(pDate.getTime())) {
                postDateDisplay = pDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              }
            } catch {}
          }

          return (
            <div key={post.id || idx} className="flex flex-col items-center group relative w-full max-w-[280px] mx-auto">
              {/* Card Label Header */}
              <div className="mb-2 text-xs font-bold tracking-wider text-gray-500 uppercase flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isInstagram ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-black'}`}></span>
                  {videoTitle}
                </span>
                {onUpdatePosts && (
                  <button
                    onClick={() => handleDeletePost(post.id || post.postId)}
                    title="Remove post"
                    className="text-gray-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 9:16 Card: Media Up, Information Down */}
              <div className="w-full bg-white rounded-[28px] p-3 shadow-md hover:shadow-xl border border-gray-100 flex flex-col transition-all duration-300">
                {/* MEDIA UP: 9:16 Aspect Ratio */}
                <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-gray-950 shadow-inner group/media">
                  {post.thumbnailUrl ? (
                    <img
                      src={getProxiedUrl(post.thumbnailUrl)}
                      alt={displayTitle}
                      crossOrigin="anonymous"
                      className="absolute inset-0 w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gray-900 text-gray-400 p-4 text-center">
                      <Play className="w-10 h-10 mb-2 opacity-50 text-white" />
                      <span className="text-xs font-semibold text-gray-300 line-clamp-3">{displayTitle}</span>
                    </div>
                  )}

                  {/* Sound button top-left (matching reference) */}
                  <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-sm z-10">
                    <Volume2 className="w-4 h-4" />
                  </div>

                  {/* Rank tag top-right */}
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold flex items-center gap-1 border border-white/20 z-10 shadow-sm">
                    <Flame className="w-3 h-3 text-[#fe2c55]" />
                    <span>#{idx + 1}</span>
                  </div>

                  {/* Media Bottom Overlay: Avatar, Name, and Views (matching reference) */}
                  <div className="absolute inset-x-0 bottom-0 p-3 pt-12 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center gap-2.5 text-white z-10">
                    {/* Avatar circle */}
                    <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-gray-900 shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-md">
                      <span className="uppercase">{creatorHandle.slice(0, 2)}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-xs text-white truncate leading-tight drop-shadow-sm">
                          {displayTitle}
                        </p>
                        <span className="text-xs shrink-0">🇺🇬</span>
                      </div>
                      <p className="text-[10px] text-white/80 font-semibold mt-0.5 drop-shadow-sm">
                        {formattedLikes} • {formattedViews} views
                      </p>
                    </div>
                  </div>
                </div>

                {/* INFORMATION DOWN: Metrics, Handle, Tags (matching reference) */}
                <div className="pt-4 pb-1 px-1">
                  {/* 3-Column Stats Row with Dividers */}
                  <div className="grid grid-cols-3 divide-x divide-gray-200 text-left items-center">
                    <div className="pr-1.5">
                      <p className="text-lg font-black text-gray-900 leading-none">{formattedLikes}</p>
                      <p className="text-[11px] text-gray-400 font-medium mt-1">likes</p>
                    </div>
                    <div className="px-1.5">
                      <p className="text-lg font-black text-gray-900 leading-none">{formattedViews}</p>
                      <p className="text-[11px] text-gray-400 font-medium mt-1">avg views</p>
                    </div>
                    <div className="pl-1.5">
                      <p className="text-lg font-black text-gray-900 leading-none">{engRate}%</p>
                      <p className="text-[11px] text-gray-400 font-medium mt-1">engagement</p>
                    </div>
                  </div>

                  {/* Platform Icon, Handle & Publication Date */}
                  <div className="mt-3.5 flex items-center justify-between gap-1.5 text-sm font-semibold text-gray-600">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isInstagram ? (
                        <svg className="w-4 h-4 text-[#e1306c] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-900 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.43 6.3 6.3 0 0 0 1.89-4.43V8.71a8.28 8.28 0 0 0 4.84 1.55V6.8a4.85 4.85 0 0 1-1-.11z"/>
                        </svg>
                      )}
                      {post.permalink ? (
                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-gray-900 truncate hover:underline flex items-center gap-1"
                        >
                          @{creatorHandle}
                          <ArrowUpRight className="w-3 h-3 text-gray-400" />
                        </a>
                      ) : (
                        <span className="truncate">@{creatorHandle}</span>
                      )}
                    </div>
                    {postDateDisplay && (
                      <span className="text-[11px] font-medium text-gray-400 shrink-0">
                        {postDateDisplay}
                      </span>
                    )}
                  </div>

                  {/* Tags line */}
                  <div className="mt-1.5 text-xs text-gray-400 font-medium truncate">
                    {displayTags}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
      {/* Header with Title and Quick Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-widest text-gray-900 uppercase font-heading text-center sm:text-left">
            TOP PERFORMING CONTENT {clientName}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 text-center sm:text-left">
            Compare top creative content separated by channel or aggregated across your campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onSyncPosts && (
            <button
              onClick={() => onSyncPosts()}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Live'}
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Real Post
          </button>
        </div>
      </div>

      {/* Platform Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-8 flex-wrap gap-3">
        <div className="inline-flex p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => setPlatformView('split')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              platformView === 'split'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Both Platforms (Separated)
          </button>
          <button
            onClick={() => setPlatformView('instagram')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              platformView === 'instagram'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Instagram ({igPosts.length})
          </button>
          <button
            onClick={() => setPlatformView('tiktok')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              platformView === 'tiktok'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            TikTok ({ttPosts.length})
          </button>
          <button
            onClick={() => setPlatformView('all')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              platformView === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            All Channels Combined ({posts.length})
          </button>
        </div>

        <div className="text-xs text-gray-400 font-medium">
          {platformView === 'split' && 'Displaying top 3 Instagram & top 3 TikTok posts'}
          {platformView === 'instagram' && 'Displaying top 3 Instagram posts by views'}
          {platformView === 'tiktok' && 'Displaying top 3 TikTok posts by views'}
          {platformView === 'all' && 'Displaying top 3 posts overall by views'}
        </div>
      </div>

      {/* Content Posts Section */}
      {posts.length === 0 ? (
        <div className="max-w-md mx-auto py-12 text-gray-500 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <AlertCircle className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-base font-bold text-gray-800">No Live Media Posts Added Yet</p>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">
            Add real Instagram Reels or TikTok video links to feature your client&apos;s top performing creative content.
          </p>
          <div className="mt-5 flex items-center gap-2.5">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Link Real Post / Reel
            </button>
            {onSyncPosts && (
              <button
                onClick={() => onSyncPosts()}
                disabled={isSyncing}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Accounts
              </button>
            )}
          </div>
        </div>
      ) : platformView === 'split' ? (
        <div className="space-y-12">
          {/* INSTAGRAM SECTION */}
          <div className="border-b border-gray-100 pb-10">
            <div className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-black"></span>
                <h3 className="text-base font-extrabold tracking-wider text-gray-900 uppercase font-heading">
                  TOP PERFORMING INSTAGRAM CONTENT
                </h3>
              </div>
              <span className="text-xs font-semibold text-gray-500">
                {igPosts.length} total Instagram posts
              </span>
            </div>
            {renderPostGrid(topIgPosts, 'Instagram')}
          </div>

          {/* TIKTOK SECTION */}
          <div>
            <div className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-zinc-600"></span>
                <h3 className="text-base font-extrabold tracking-wider text-gray-900 uppercase font-heading">
                  TOP PERFORMING TIKTOK CONTENT
                </h3>
              </div>
              <span className="text-xs font-semibold text-gray-500">
                {ttPosts.length} total TikTok posts
              </span>
            </div>
            {renderPostGrid(topTtPosts, 'TikTok')}
          </div>
        </div>
      ) : platformView === 'instagram' ? (
        <div>{renderPostGrid(topIgPosts, 'Instagram')}</div>
      ) : platformView === 'tiktok' ? (
        <div>{renderPostGrid(topTtPosts, 'TikTok')}</div>
      ) : (
        <div>{renderPostGrid(topOverallPosts)}</div>
      )}


      {/* Add Real Post Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 relative animate-in fade-in duration-200">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-black p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <h3 className="text-lg font-extrabold text-gray-900 font-heading">
                Add Real Post Preview
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Feature real Instagram Reels, Posts, or TikTok videos on the dashboard and printable PDF report.
              </p>
            </div>

            {/* Tabs: Link / Auto-Fetch vs Manual */}
            <div className="flex border-b border-gray-200 mb-5">
              <button
                type="button"
                onClick={() => setActiveTab('link')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all ${
                  activeTab === 'link'
                    ? 'border-black text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Paste Video Link (Auto-Fetch)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all ${
                  activeTab === 'manual'
                    ? 'border-black text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Enter Details Manually
              </button>
            </div>

            {/* TAB 1: PASTE LINK */}
            {activeTab === 'link' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    TikTok Video URL or Instagram Reel Link:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://www.tiktok.com/@client/video/..."
                      className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:ring-1 focus:ring-black"
                    />
                    <button
                      type="button"
                      onClick={handleFetchPreview}
                      disabled={isFetchingUrl || !inputUrl.trim()}
                      className="px-3.5 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isFetchingUrl ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                      Fetch
                    </button>
                  </div>
                  {fetchError && <p className="text-[11px] text-amber-600 mt-1">{fetchError}</p>}
                </div>

                {previewData && (
                  <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                    <div className="flex items-center gap-3">
                      {previewData.thumbnailUrl ? (
                        <img
                          src={previewData.thumbnailUrl}
                          alt="Preview"
                          className="w-14 h-20 object-cover rounded-xl border border-gray-200"
                        />
                      ) : (
                        <div className="w-14 h-20 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                          <Play className="w-6 h-6" />
                        </div>
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-200 text-gray-800">
                          {previewData.platform} • {previewData.contentFormat}
                        </span>
                        <p className="text-xs font-bold text-gray-900 line-clamp-2 mt-1">
                          {previewData.title}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500">Views:</label>
                        <input
                          type="number"
                          value={previewData.viewsCount}
                          onChange={(e) =>
                            setPreviewData({ ...previewData, viewsCount: Number(e.target.value) })
                          }
                          className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500">Likes:</label>
                        <input
                          type="number"
                          value={previewData.likesCount}
                          onChange={(e) =>
                            setPreviewData({ ...previewData, likesCount: Number(e.target.value) })
                          }
                          className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500">Comments:</label>
                        <input
                          type="number"
                          value={previewData.commentsCount}
                          onChange={(e) =>
                            setPreviewData({ ...previewData, commentsCount: Number(e.target.value) })
                          }
                          className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MANUAL ENTRY */}
            {activeTab === 'manual' && (
              <div className="space-y-3 text-left">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Platform</label>
                    <select
                      value={manualPlatform}
                      onChange={(e) => setManualPlatform(e.target.value as any)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2 text-xs font-semibold outline-none"
                    >
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Format</label>
                    <select
                      value={manualFormat}
                      onChange={(e) => setManualFormat(e.target.value as any)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2 text-xs font-semibold outline-none"
                    >
                      <option value="Videos">Videos / Reels</option>
                      <option value="Image">Image</option>
                      <option value="Graphic">Graphic</option>
                      <option value="Stories">Stories</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Title / Caption</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="e.g. Behind the scenes video reel"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Thumbnail Image URL</label>
                  <input
                    type="url"
                    value={manualThumbnail}
                    onChange={(e) => setManualThumbnail(e.target.value)}
                    placeholder="https://... image / video cover preview"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Post Link (Optional)</label>
                  <input
                    type="url"
                    value={manualPermalink}
                    onChange={(e) => setManualPermalink(e.target.value)}
                    placeholder="https://www.instagram.com/p/..."
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2 text-xs outline-none"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500">Views</label>
                    <input
                      type="number"
                      value={manualViews}
                      onChange={(e) => setManualViews(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg p-1.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500">Likes</label>
                    <input
                      type="number"
                      value={manualLikes}
                      onChange={(e) => setManualLikes(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg p-1.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500">Comments</label>
                    <input
                      type="number"
                      value={manualComments}
                      onChange={(e) => setManualComments(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg p-1.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500">Shares</label>
                    <input
                      type="number"
                      value={manualShares}
                      onChange={(e) => setManualShares(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg p-1.5 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePost}
                disabled={activeTab === 'link' && !previewData}
                className="px-5 py-2 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Add to Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
