'use client';

import React from 'react';
import { ContentPostData } from '@/lib/types';
import { formatNumberShort, getTopPerformingPosts } from '@/lib/analytics';
import { Heart, MessageCircle, Share2, Play } from 'lucide-react';

interface TopContentSectionProps {
  clientName: string;
  posts: ContentPostData[];
}

export const TopContentSection: React.FC<TopContentSectionProps> = ({ clientName, posts }) => {
  const topPosts = getTopPerformingPosts(posts, 3);

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
      <h2 className="text-xl sm:text-2xl font-bold tracking-widest text-gray-900 uppercase mb-8 text-center font-heading">
        TOP PERFORMING CONTENT {clientName}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-4xl mx-auto">
        {topPosts.map((post, idx) => {
          const formattedViews = formatNumberShort(post.viewsCount);
          const platformLabel = post.platform.toUpperCase();
          const videoTitle = idx === 0 ? 'VIDEO #1' : idx === 1 ? 'VIDEO #2' : 'VIDEO #3';

          return (
            <div key={post.id || idx} className="flex flex-col items-center">
              {/* Top Video Tag Badge */}
              <div className="mb-3 text-sm font-semibold tracking-wider text-gray-600 uppercase">
                {videoTitle}
              </div>

              {/* Smartphone Frame Container */}
              <div className="relative w-56 h-[400px] bg-black rounded-[36px] p-2.5 shadow-2xl border-4 border-gray-800 flex flex-col justify-between overflow-hidden group">
                {/* Dynamic Camera Notch */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-20 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-900 border border-gray-800"></div>
                </div>

                {/* Smartphone Display Content */}
                <div className="relative w-full h-full rounded-[28px] overflow-hidden bg-gray-900">
                  {post.thumbnailUrl ? (
                    <img
                      src={post.thumbnailUrl}
                      alt={`Top post ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-gray-400">
                      <Play className="w-10 h-10 mb-2 opacity-60" />
                      <span className="text-xs">No Preview</span>
                    </div>
                  )}

                  {/* UI Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80"></div>

                  {/* Right Side Social Overlay Buttons */}
                  <div className="absolute right-2.5 bottom-12 flex flex-col items-center gap-3.5 z-10 text-white">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                        <Heart className="w-4 h-4 text-white fill-white/20" />
                      </div>
                      <span className="text-[10px] font-semibold mt-0.5">{formatNumberShort(post.likesCount)}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[10px] font-semibold mt-0.5">{post.commentsCount}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                        <Share2 className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[10px] font-semibold mt-0.5">{post.sharesCount}</span>
                    </div>
                  </div>

                  {/* Bottom Captions Overlay */}
                  <div className="absolute bottom-3 left-3 right-12 z-10 text-white text-left">
                    <p className="text-xs font-bold leading-snug line-clamp-2 drop-shadow-sm">
                      {clientName} • #{post.contentFormat.toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>

              {/* View Count & Platform Label below Smartphone */}
              <div className="mt-4 text-center">
                <p className="text-xl font-bold text-gray-900 leading-none">{formattedViews}</p>
                <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mt-1">
                  {platformLabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
