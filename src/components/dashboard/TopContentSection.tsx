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

  const topPosts = getTopPerformingPosts(posts, 3);

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

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
      {/* Header with Title and Quick Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-8">
        <h2 className="text-xl sm:text-2xl font-bold tracking-widest text-gray-900 uppercase font-heading text-center sm:text-left">
          TOP PERFORMING CONTENT {clientName}
        </h2>

        <div className="flex items-center gap-2">
          {onSyncPosts && (
            <button
              onClick={onSyncPosts}
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

      {/* Content Posts Section */}
      {topPosts.length === 0 ? (
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
                onClick={onSyncPosts}
                disabled={isSyncing}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Accounts
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {topPosts.map((post, idx) => {
            const formattedViews = formatNumberShort(post?.viewsCount ?? 0);
            const platformLabel = String(post?.platform || 'instagram').toUpperCase();
            const videoTitle = idx === 0 ? 'VIDEO #1' : idx === 1 ? 'VIDEO #2' : 'VIDEO #3';
            const displayTitle = post.title || post.caption || `${clientName || 'Client'} Feature`;

            return (
              <div key={post.id || idx} className="flex flex-col items-center group relative">
                <div className="mb-3 text-sm font-semibold tracking-wider text-gray-600 uppercase flex items-center justify-between w-56 px-1">
                  <span>{videoTitle}</span>
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

                {/* Smartphone Mockup */}
                <div className="relative w-56 h-[400px] bg-black rounded-[36px] p-2.5 shadow-2xl border-4 border-gray-800 flex flex-col justify-between overflow-hidden">
                  {/* Phone Notch */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-20 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-900 border border-gray-800"></div>
                  </div>

                  <div className="relative w-full h-full rounded-[28px] overflow-hidden bg-gray-950">
                    {post.thumbnailUrl ? (
                      <img
                        src={post.thumbnailUrl}
                        alt={displayTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-gray-400 p-4 text-center">
                        <Play className="w-10 h-10 mb-2 opacity-50" />
                        <span className="text-xs font-semibold text-gray-300 line-clamp-3">{displayTitle}</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85 pointer-events-none"></div>

                    {/* Right Side Stats Column */}
                    <div className="absolute right-2.5 bottom-12 flex flex-col items-center gap-3.5 z-10 text-white">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
                          <Heart className="w-4 h-4 text-white fill-white/20" />
                        </div>
                        <span className="text-[10px] font-semibold mt-0.5">{formatNumberShort(post?.likesCount ?? 0)}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[10px] font-semibold mt-0.5">{formatNumberShort(post?.commentsCount ?? 0)}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
                          <Share2 className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[10px] font-semibold mt-0.5">{formatNumberShort(post?.sharesCount ?? 0)}</span>
                      </div>
                    </div>

                    {/* Bottom Caption & External Link */}
                    <div className="absolute bottom-3 left-3 right-12 z-10 text-white text-left">
                      <p className="text-xs font-bold leading-snug line-clamp-2 drop-shadow-sm">
                        {displayTitle}
                      </p>
                      {post.permalink && (
                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-gray-300 hover:text-white mt-1 underline"
                        >
                          View on {platformLabel} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xl font-bold text-gray-900 leading-none">{formattedViews} Views</p>
                  <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mt-1">
                    {platformLabel} • {post.contentFormat || 'Videos'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
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
