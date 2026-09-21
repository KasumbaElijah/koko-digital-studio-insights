'use client';

import React from 'react';
import { Video, Smartphone, Layers, GraduationCap, BarChart3, Sparkles, ArrowRight, Check } from 'lucide-react';

interface ServiceItem {
  id: string;
  icon: React.ElementType;
  title: string;
  badge: string;
  description: string;
  deliverables: string[];
  highlight: string;
}

const SERVICES: ServiceItem[] = [
  {
    id: 'video-production',
    icon: Video,
    title: '9:16 Short-Form Video Production',
    badge: 'Core Superpower',
    description:
      'We shoot and edit high-retention vertical videos optimized specifically for the TikTok, Instagram Reels, and YouTube Shorts algorithms.',
    deliverables: [
      '3-Second Retention Hook Scripting',
      'On-Location Studio & Phone Videography',
      'Cinema Pacing, SFX & Trend Sound Design',
      'High-Impact Typography & Animated Captions',
      'Full Color Grading & Aspect Optimization',
    ],
    highlight: 'Guaranteed to hold viewer attention past 15 seconds.',
  },
  {
    id: 'smm-management',
    icon: Smartphone,
    title: 'Full-Stack Social Media Management',
    badge: 'Growth Engine',
    description:
      'Turn your social channels into an automated customer acquisition machine with end-to-end management, daily posting, and community nurturing.',
    deliverables: [
      'Monthly Content Strategy & Calendar',
      'Daily Multi-Platform Distribution',
      'Interactive Stories & Poll Engagement',
      'DM & Comment Community Nurturing',
      'Hashtag & Sound SEO Optimization',
    ],
    highlight: 'Zero headache for your team. We handle everything from idea to post.',
  },
  {
    id: 'brand-storytelling',
    icon: Layers,
    title: 'Brand Storytelling & Docu-Series',
    badge: 'Cult Equity',
    description:
      'Move beyond shallow trends. We build mini documentary-style series (*Kampala Chronicles* style) that give your brand depth and a devoted following.',
    deliverables: [
      'Founders’ Journey & Origin Docu-Episodes',
      'Behind-The-Scenes Product Creation',
      'Customer & Community Spotlights',
      'High-Concept Product Launch Films',
      'Long-Term Brand Equity Building',
    ],
    highlight: 'Build emotional connection that turns casual viewers into brand evangelists.',
  },
  {
    id: 'creator-masterclasses',
    icon: GraduationCap,
    title: 'Phone Videography & Creator Training',
    badge: 'Skill Transfer',
    description:
      'Empower your internal team or creator squad to shoot and edit viral phone video content with our proprietary masterclass curriculum.',
    deliverables: [
      'The Koko Phone Videography Framework',
      'Lighting & Audio on a Smartphone',
      'CapCut & Premiere Editing Workflows',
      'Pacing & Visual Hook Psychology',
      'Practical On-Location Shoot Workshops',
    ],
    highlight: 'Trained by Koko & Archie for corporate teams and independent creators.',
  },
  {
    id: 'social-intelligence',
    icon: BarChart3,
    title: 'Proprietary Analytics & Executive Reporting',
    badge: 'Real Transparency',
    description:
      'Never wonder if your marketing is working. Access live KPI metrics, engagement ratios, and monthly PDF reports directly through our custom client portal.',
    deliverables: [
      'Live TikTok & Instagram Engagement Tracking',
      'Format Performance Breakdown (Reels vs Images vs Stories)',
      'Top Performer Post Identification',
      'Monthly Executive PDF Reports with Actionable Insights',
      '1-Click Client Portal Access',
    ],
    highlight: 'Backed by our custom-built Koko Analytics platform.',
  },
];

export function ServicesSection() {
  return (
    <section id="services" className="py-24 bg-[#151216] relative overflow-hidden">
      {/* Red ambient background glow */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-red-700/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-950/20 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/40 text-red-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Full-Suite Creative Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-serif tracking-tight">
            EVERYTHING YOU NEED TO{' '}
            <span className="text-red-500 italic font-medium">
              DOMINATE DIGITAL FEEDS.
            </span>
          </h2>
          <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
            From single viral video drops to complete social ecosystem takeovers, we combine cinematic craftsmanship with algorithmic science.
          </p>
        </div>

        {/* Services Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((service, index) => {
            const Icon = service.icon;
            const isFeatured = index === 0;

            return (
              <div
                key={service.id}
                className={`group relative rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 ease-out ${
                  isFeatured
                    ? 'bg-gradient-to-b from-red-950/50 via-[#221d26] to-[#1c1820] border-2 border-red-600/70 shadow-xl shadow-red-950/40 hover:border-red-500 hover:shadow-2xl hover:shadow-red-950/60'
                    : 'bg-[#221d25] border border-[#362d3a] hover:border-red-600/60 hover:bg-[#2a2430] shadow-lg hover:shadow-2xl hover:shadow-red-950/30'
                } hover:-translate-y-2`}
              >
                <div>
                  {/* Top Bar with Icon and Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500 group-hover:bg-red-600 group-hover:text-white transition-all duration-300 shadow-md shadow-red-950/30">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-red-950/80 border border-red-800/50 text-red-400 text-[10px] font-extrabold uppercase tracking-wider">
                      {service.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-bold text-white font-serif mb-3 group-hover:text-red-300 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6">
                    {service.description}
                  </p>

                  {/* Deliverables List */}
                  <div className="space-y-2.5 pt-4 border-t border-zinc-800/80">
                    <p className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                      What’s Included:
                    </p>
                    {service.deliverables.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                        <Check className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Highlight Pill */}
                <div className="mt-6 pt-4 border-t border-zinc-800/60">
                  <p className="text-[11px] font-medium text-red-400 italic">
                    ⚡ {service.highlight}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Quick Custom Retainer Callout Card */}
          <div className="rounded-3xl p-7 bg-gradient-to-br from-red-900/30 via-[#16161c] to-black border border-red-700/40 flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="/images/koko-avatar.png"
                  alt="Koko Digital Studio"
                  className="w-12 h-12 rounded-2xl shadow-lg shadow-red-700/30 border border-white/10"
                />
                <img
                  src="/images/koko-logo-white.png"
                  alt="KOKO"
                  className="h-5 w-auto object-contain"
                />
              </div>
              <h3 className="text-xl font-bold text-white font-heading">
                Need a Custom Multi-City Retainer?
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Operating across both Kampala & Nairobi? We provide dedicated production squads, cross-border content roadmaps, and custom creative direction for scaling East African enterprises.
              </p>
            </div>

            <div className="pt-6">
              <a
                href="#contact"
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
              >
                <span>Request Custom Retainer Proposal</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
