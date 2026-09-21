'use client';

import React, { useState } from 'react';
import { Play, Pause, Volume2, Sparkles, TrendingUp, Heart, MessageCircle, Share2, Flame, ArrowRight, CheckCircle2 } from 'lucide-react';

interface MockReel {
  id: string;
  client: string;
  handle: string;
  tagline: string;
  views: string;
  likes: string;
  comments: string;
  format: string;
  bgGradient: string;
  hookText: string;
  soundTrack: string;
}

const REELS_DATA: MockReel[] = [
  {
    id: 'nevo',
    client: 'Névo Café',
    handle: '@nevo_cafe',
    tagline: 'Aesthetic Golden Hour Coffee Pour',
    views: '842.6K',
    likes: '48.2K',
    comments: '1,240',
    format: 'Hospitality • Phone Videography',
    bgGradient: 'from-amber-950/90 via-red-950/80 to-zinc-950',
    hookText: '“The secret to Kampala’s smoothest Spanish Latte isn’t on the menu…”',
    soundTrack: 'Original Sound — Névo Ambient Beats',
  },
  {
    id: 'signature',
    client: 'Signature Homes',
    handle: '@signaturehomes_ug',
    tagline: 'Interactive Kitchenware Upgrade Challenge',
    views: '1.2M',
    likes: '63.9K',
    comments: '1,890',
    format: 'Luxury Retail • Conversion Story',
    bgGradient: 'from-red-950 via-zinc-900 to-black',
    hookText: '“Would you replace your entire kitchen for this Nespresso setup? Vote below!”',
    soundTrack: 'Trending Audio — Luxury Morning Aesthetic',
  },
  {
    id: 'meatnbunz',
    client: 'Meat N Bunz',
    handle: '@meatnbunz_kla',
    tagline: 'Kampala Chronicles Street Food Sizzle',
    views: '2.1M',
    likes: '112.4K',
    comments: '3,410',
    format: 'Street Food • Viral Storytelling',
    bgGradient: 'from-orange-950 via-red-900 to-black',
    hookText: '“We put 3 patties on a flame grill until the cheese cascaded…”',
    soundTrack: 'Original Audio — Kampala Foodie Beats',
  },
  {
    id: 'running',
    client: 'Kampala Running Movement',
    handle: '@kla_runners',
    tagline: 'Grassroots Community Sunrise Movement',
    views: '940.3K',
    likes: '56.1K',
    comments: '1,560',
    format: 'Culture & Community Growth',
    bgGradient: 'from-red-900 via-rose-950 to-zinc-950',
    hookText: '“From 3 lonely runners at 6 AM to 400+ weekly movers in Kampala…”',
    soundTrack: 'Hype Run Anthem — Afrobeats Cardio Mix',
  },
  {
    id: 'rolex',
    client: 'Rolex Datejust Campaign',
    handle: '@rolex_datejust',
    tagline: 'High-Horology Macro Precision & Prestige',
    views: '1.8M',
    likes: '89.4K',
    comments: '2,830',
    format: 'Luxury Horology • Cinematic Macro',
    bgGradient: 'from-amber-950/80 via-red-950 to-[#181313]',
    hookText: '“The new Rolex Datejust transforms everyday elegance into timeless prestige…”',
    soundTrack: 'Cinematic Symphony — Pure Horology',
  },
];

export function HeroSection() {
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const activeReel = REELS_DATA[activeReelIndex];

  return (
    <section className="relative min-h-screen pt-28 pb-20 overflow-hidden flex flex-col justify-center bg-[#151216]">
      {/* Cinematic Red Ambient Glow & Grid Backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Deep Crimson Radial Center Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[550px] bg-gradient-to-b from-red-600/18 via-red-800/10 to-transparent blur-[140px] rounded-full" />
        {/* Secondary Rose/Scarlet accent on the side */}
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-red-700/10 blur-[130px] rounded-full" />
        <div className="absolute -bottom-20 -left-40 w-[500px] h-[500px] bg-red-950/25 blur-[130px] rounded-full" />
        {/* Subtle dot matrix overlay */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `radial-gradient(#dc2626 1px, transparent 1px)`,
            backgroundSize: '36px 36px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Provocative Headline & Agency Pitch */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            
            {/* Top Badge: Styled matching the "WE'RE HIRING" badge from Instagram */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#dc2626] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-700/40">
              <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
              <span>EAST AFRICA’S #1 SHORT-FORM STUDIO</span>
            </div>

            {/* Main Headline: Styled with high-contrast editorial serif */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl xl:text-8xl font-black tracking-tight text-white font-serif leading-[1.06]">
              WE MAKE BRANDS <br />
              <span className="text-red-500 italic font-medium">IMPOSSIBLE</span> <br />
              <span className="relative inline-block text-white">
                TO IGNORE.
                {/* Red Underline Accent */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-red-600/70"
                  viewBox="0 0 200 8"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path d="M0 5C50 1 150 1 200 5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-zinc-200 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
              We craft scroll-stopping 9:16 TikToks & Reels, high-converting social campaigns, and community movements for modern businesses in <span className="text-white font-semibold">Kampala</span> & <span className="text-white font-semibold">Nairobi</span>. No boring corporate filler. Only content that generates real revenue.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <a
                href="#contact"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-xl shadow-red-700/35 hover:shadow-red-600/60 hover:-translate-y-0.5 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2.5 group active:scale-95"
              >
                <span>Book a Discovery Shoot</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
              </a>

              <a
                href="#work"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl text-sm font-bold text-zinc-200 hover:text-white bg-[#221d25] hover:bg-[#2b2430] border border-[#362d3a] hover:border-red-700/60 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 shadow-md"
              >
                <span>Explore Client Work</span>
              </a>
            </div>

            {/* Value Highlights */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 bg-[#1f1a23]/90 p-3 rounded-xl border border-[#362d3a] hover:border-red-900/50 hover:bg-[#26202c] transition-all duration-200 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
                <span>9:16 Video Mastery</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 bg-[#1f1a23]/90 p-3 rounded-xl border border-[#362d3a] hover:border-red-900/50 hover:bg-[#26202c] transition-all duration-200 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
                <span>Full SMM Management</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 bg-[#1f1a23]/90 p-3 rounded-xl border border-[#362d3a] hover:border-red-900/50 hover:bg-[#26202c] transition-all duration-200 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
                <span>Proprietary Analytics</span>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive 9:16 Mobile Phone Simulator */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            
            {/* Reel Category Switcher Pills */}
            <div className="flex items-center gap-1.5 p-1.5 bg-[#1f1a23] border border-[#362d3a] rounded-full mb-4 max-w-full overflow-x-auto no-scrollbar shadow-lg">
              {REELS_DATA.map((reel, idx) => (
                <button
                  key={reel.id}
                  onClick={() => setActiveReelIndex(idx)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all whitespace-nowrap ${
                    activeReelIndex === idx
                      ? 'bg-red-600 text-white shadow-md shadow-red-700/40'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  {reel.client.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Phone Chassis Mockup */}
            <div className="relative w-[300px] sm:w-[330px] h-[580px] sm:h-[620px] rounded-[44px] bg-[#241f28] p-3 shadow-2xl shadow-red-950/40 border-4 border-[#3a303f] ring-1 ring-red-500/20 group">
              
              {/* Dynamic Island / Top Speaker */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-red-900/50" />
              </div>

              {/* Phone Screen Container */}
              <div className={`relative w-full h-full rounded-[34px] overflow-hidden bg-gradient-to-b ${activeReel.bgGradient} flex flex-col justify-between p-5 border border-white/5`}>
                
                {/* Background Ambient Imagery Simulation */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

                {/* Animated Equalizer Wave Overlay (simulating video playback) */}
                <div className="absolute top-16 right-4 z-20 flex items-end gap-1 h-5">
                  {[40, 80, 60, 100, 50, 90, 70].map((h, i) => (
                    <div
                      key={i}
                      className={`w-1 bg-red-500 rounded-full transition-all ${
                        isPlaying ? 'animate-pulse' : 'h-1'
                      }`}
                      style={{
                        height: isPlaying ? `${h}%` : '20%',
                        animationDelay: `${i * 120}ms`,
                      }}
                    />
                  ))}
                </div>

                {/* Top Status & Platform */}
                <div className="relative z-20 flex items-center justify-between pt-5">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    <span>VIRAL REEL</span>
                  </div>
                  
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-red-400" />}
                  </button>
                </div>

                {/* Center Visual Mock */}
                <div className="relative z-20 my-auto text-center px-2">
                  <div className="inline-block p-4 rounded-3xl bg-black/50 backdrop-blur-lg border border-red-500/20 shadow-xl mb-3">
                    <Flame className="w-8 h-8 text-red-500 mx-auto animate-bounce" />
                    <p className="text-xs font-bold text-white mt-1.5 font-heading">
                      {activeReel.tagline}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {activeReel.format}
                    </p>
                  </div>

                  <p className="text-xs font-medium text-white/95 italic bg-black/60 backdrop-blur-sm p-3 rounded-xl border border-white/5">
                    {activeReel.hookText}
                  </p>
                </div>

                {/* Bottom Overlay Info & Metrics */}
                <div className="relative z-20 space-y-3 pb-3">
                  {/* Account Info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">{activeReel.client}</span>
                        <span className="text-[10px] text-red-400 font-semibold">{activeReel.handle}</span>
                      </div>
                      <p className="text-[10px] text-zinc-300 truncate max-w-[180px]">
                        🎵 {activeReel.soundTrack}
                      </p>
                    </div>

                    <a
                      href="#contact"
                      className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold shadow-md shadow-red-600/40"
                    >
                      Follow
                    </a>
                  </div>

                  {/* Real Metric Counters */}
                  <div className="grid grid-cols-3 gap-2 bg-black/70 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 text-center">
                    <div>
                      <p className="text-[10px] text-zinc-400">Views</p>
                      <p className="text-xs font-extrabold text-white">{activeReel.views}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400">Likes</p>
                      <p className="text-xs font-extrabold text-red-400 flex items-center justify-center gap-0.5">
                        <Heart className="w-2.5 h-2.5 fill-red-400" />
                        {activeReel.likes}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400">Comments</p>
                      <p className="text-xs font-extrabold text-white">{activeReel.comments}</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Floating Social Proof Pill */}
              <div className="absolute -bottom-5 -right-4 bg-[#141418] border border-red-800/60 shadow-xl shadow-red-950/50 p-3.5 rounded-2xl flex items-center gap-3 backdrop-blur-md animate-float">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">+420% Client Reach</p>
                  <p className="text-[10px] text-zinc-300">Grown organically in 30 days</p>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Global Impact Statistics Bar */}
        <div className="mt-20 pt-10 border-t border-zinc-800/80">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            
            <div className="p-5 rounded-2xl bg-[#221d25]/90 border border-[#362d3a] hover:border-red-600/50 hover:bg-[#2b2430] hover:-translate-y-1 transition-all duration-300 shadow-md group">
              <p className="text-3xl sm:text-4xl font-black text-white font-serif group-hover:scale-105 transition-transform">
                15M<span className="text-red-500">+</span>
              </p>
              <p className="text-xs font-bold text-zinc-300 mt-1 uppercase tracking-wider">
                Organic Video Views
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#221d25]/90 border border-[#362d3a] hover:border-red-600/50 hover:bg-[#2b2430] hover:-translate-y-1 transition-all duration-300 shadow-md group">
              <p className="text-3xl sm:text-4xl font-black text-white font-serif group-hover:scale-105 transition-transform">
                85<span className="text-red-500">+</span>
              </p>
              <p className="text-xs font-bold text-zinc-300 mt-1 uppercase tracking-wider">
                Viral Campaigns Shot
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#221d25]/90 border border-[#362d3a] hover:border-red-600/50 hover:bg-[#2b2430] hover:-translate-y-1 transition-all duration-300 shadow-md group">
              <p className="text-3xl sm:text-4xl font-black text-white font-serif group-hover:scale-105 transition-transform">
                4.8<span className="text-red-500">x</span>
              </p>
              <p className="text-xs font-bold text-zinc-300 mt-1 uppercase tracking-wider">
                Avg Follower Lift
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#221d25]/90 border border-[#362d3a] hover:border-red-600/50 hover:bg-[#2b2430] hover:-translate-y-1 transition-all duration-300 shadow-md group">
              <p className="text-3xl sm:text-4xl font-black text-white font-serif group-hover:scale-105 transition-transform">
                100<span className="text-red-500">%</span>
              </p>
              <p className="text-xs font-bold text-zinc-300 mt-1 uppercase tracking-wider">
                Value-First Content
              </p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
