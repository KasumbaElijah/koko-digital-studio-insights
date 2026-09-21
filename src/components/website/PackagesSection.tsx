'use client';

import React, { useState } from 'react';
import { Check, Sparkles, Zap, Shield, ArrowRight } from 'lucide-react';

interface PricingTier {
  id: string;
  name: string;
  tagline: string;
  badge?: string;
  priceNote: string;
  isPopular?: boolean;
  features: string[];
  cta: string;
}

const TIERS: PricingTier[] = [
  {
    id: 'sprint',
    name: 'Content Sprint',
    tagline: 'Rapid burst of viral short-form assets for product drops and campaigns.',
    priceNote: 'Flexible Project Package',
    features: [
      '8 High-Impact 9:16 Reels & TikToks',
      '1 Half-Day On-Location Studio Shoot',
      'Hook Scripting & Concept Storyboarding',
      'Cinema Grading, Dynamic Captions & SFX',
      'Ready-to-Post Final Assets in 7–10 Days',
      'Basic Social Distribution Blueprint',
    ],
    cta: 'Book a Content Sprint',
  },
  {
    id: 'growth',
    name: 'The Growth Engine',
    tagline: 'Full-service social media management & constant video momentum.',
    badge: 'Most Popular',
    isPopular: true,
    priceNote: 'Monthly Agency Retainer',
    features: [
      '16–20 High-Retention Reels & TikToks per Month',
      '2 Dedicated On-Location Shoot Days per Month',
      'Full-Stack Social Management (Daily Posting & Scheduling)',
      'Interactive Daily Stories & Direct DM Conversion Funnels',
      'Dedicated Creative Director, Videographer & Editor',
      '24/7 Client Portal Access with Real-Time KPI Analytics',
      'Monthly Executive Performance Review & Strategy War-Room',
    ],
    cta: 'Scale With Growth Engine',
  },
  {
    id: 'enterprise',
    name: 'Studio Custom',
    tagline: 'Multi-market coverage (Kampala & Nairobi) for scaling enterprises.',
    priceNote: 'Bespoke Enterprise Retainer',
    features: [
      '30+ Multi-Platform Video Assets per Month',
      'Multi-City Production (Kampala & Nairobi Coverage)',
      'High-Concept Docu-Series Production (Kampala Chronicles Scale)',
      'Phone Videography Masterclasses for In-House Teams',
      'Influencer & Creator Collaboration Coordination',
      'Proprietary Custom Analytics Dashboard Integration',
      'Dedicated Priority Account Manager & 24/7 Support',
    ],
    cta: 'Discuss Enterprise Retainer',
  },
];

export function PackagesSection() {
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const addonsList = [
    { id: 'masterclass', name: 'Creator Masterclass Workshop', note: 'Hands-on team training' },
    { id: 'drone', name: '4K Drone Aerial Cinematography', note: 'Real estate & outdoor events' },
    { id: 'multicity', name: 'Nairobi / Cross-Border Shoot Day', note: 'Regional expansion' },
  ];

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section id="packages" className="py-24 bg-[#151216] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/40 text-red-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Investment & Partnerships</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-serif tracking-tight">
            TRANSPARENT PACKAGES.{' '}
            <span className="text-red-500 italic font-medium">
              EXPLOSIVE ROI.
            </span>
          </h2>
          <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
            Choose the pace at which you want your brand to scale. We partner with serious businesses ready to turn attention into market leadership.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-500 ease-out ${
                tier.isPopular
                  ? 'bg-gradient-to-b from-red-950/60 via-[#26202b] to-[#1c1822] border-2 border-red-500 shadow-2xl shadow-red-950/50 scale-100 lg:-translate-y-2 hover:border-red-400 hover:shadow-red-950/70 hover:-translate-y-3'
                  : 'bg-[#221d25] border border-[#362d3a] hover:border-red-600/50 hover:bg-[#2a2430] hover:-translate-y-2 shadow-lg hover:shadow-2xl hover:shadow-red-950/30'
              }`}
            >
              {/* Most Popular Badge */}
              {tier.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white text-[11px] font-extrabold uppercase tracking-wider shadow-lg shadow-red-700/50">
                  {tier.badge}
                </div>
              )}

              <div>
                {/* Header */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white font-serif">
                    {tier.name}
                  </h3>
                  <p className="text-xs text-zinc-300 mt-1 min-h-[32px] leading-relaxed">
                    {tier.tagline}
                  </p>
                  <div className="mt-4 pt-4 border-t border-zinc-800/80">
                    <p className="text-sm font-bold text-red-400">
                      {tier.priceNote}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Tailored to your monthly campaign scope
                    </p>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-3 pt-4 border-t border-zinc-800/60">
                  <p className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Package Features:
                  </p>
                  {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-zinc-200">
                      <div className="w-4 h-4 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom CTA Button */}
              <div className="mt-8 pt-6 border-t border-zinc-800/80">
                <a
                  href="#contact"
                  className={`w-full py-3.5 px-4 rounded-xl text-xs font-extrabold text-center flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:scale-[1.02] active:scale-95 ${
                    tier.isPopular
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-700/40 hover:shadow-red-600/60'
                      : 'bg-[#2a2430] hover:bg-zinc-700 text-zinc-200 hover:text-white border border-[#3d3344]'
                  }`}
                >
                  <span>{tier.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Add-On Customizer */}
        <div className="mt-16 p-8 rounded-3xl bg-[#1f1a23] border border-[#362d3a] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <h4 className="text-lg font-bold text-white font-serif">
                Customize With Studio Add-Ons
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                Select additional capabilities to bundle with your package for maximum campaign impact.
              </p>
            </div>
            {selectedAddons.length > 0 && (
              <span className="text-xs font-bold text-red-400 bg-red-950/60 px-3 py-1.5 rounded-full border border-red-800/40">
                {selectedAddons.length} Custom Add-on{selectedAddons.length > 1 ? 's' : ''} Selected
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {addonsList.map((addon) => {
              const isSelected = selectedAddons.includes(addon.id);
              return (
                <button
                  key={addon.id}
                  onClick={() => toggleAddon(addon.id)}
                  className={`p-4 rounded-2xl text-left border transition-all ${
                    isSelected
                      ? 'bg-red-950/40 border-red-600/70 shadow-md shadow-red-950/30'
                      : 'bg-[#241f28] border-[#362d3a] hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">{addon.name}</span>
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                        isSelected
                          ? 'bg-red-600 border-red-500 text-white'
                          : 'border-zinc-600'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400">{addon.note}</p>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
