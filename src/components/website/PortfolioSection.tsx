'use client';

import React, { useState } from 'react';
import { Sparkles, Eye, TrendingUp, ArrowUpRight, CheckCircle2, Play, Flame, X } from 'lucide-react';

interface CaseStudy {
  id: string;
  title: string;
  client: string;
  category: 'hospitality' | 'retail' | 'streetfood' | 'community';
  categoryLabel: string;
  tagline: string;
  views: string;
  growth: string;
  accentGradient: string;
  challenge: string;
  solution: string;
  results: string[];
  quote: string;
  quoteAuthor: string;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'nevo',
    title: 'Aesthetic Cafe Storytelling & Foot-Traffic Surge',
    client: 'Névo Café (Kampala)',
    category: 'hospitality',
    categoryLabel: 'Hospitality & Dining',
    tagline: 'Transforming coffee moments into an irresistible daily destination.',
    views: '850K+ Organic Views',
    growth: '+380% Weekend Foot-Traffic',
    accentGradient: 'from-amber-600/30 via-red-600/20 to-zinc-900',
    challenge:
      'Névo was serving exceptional coffee and food in Kampala, but their online presence was static photos that blended into every other cafe feed.',
    solution:
      'Koko Digital instituted a 9:16 aesthetic phone videography system. We highlighted golden-hour latte art pours, the texture of artisan bakes, and the serene cafe ambience that viewers could practically taste and feel.',
    results: [
      '850,000+ organic views across Instagram Reels & TikTok without paid ad spend',
      'Weekend customer queues tripled within 45 days of campaign launch',
      'Over 2,400 user saves and DM shares directly asking for location pins',
    ],
    quote: '“Koko Digital captured our cafe vibe so authentically that people walk in holding their phones showing our reels to order exactly what they saw.”',
    quoteAuthor: 'Névo Brand Team',
  },
  {
    id: 'signature',
    title: 'High-Ticket Kitchenware Conversion Campaign',
    client: 'Signature Homes & Toy Jungle',
    category: 'retail',
    categoryLabel: 'Luxury Retail & Home',
    tagline: 'Turning home appliances into aspirational lifestyle desires.',
    views: '1.2M+ Views',
    growth: 'Sold Out Product Drops',
    accentGradient: 'from-red-600/30 via-rose-700/20 to-zinc-900',
    challenge:
      'High-end kitchenware (Nespresso setups, Dorsch cookware) and Toy Jungle family items required high trust and clear product demonstration before purchase.',
    solution:
      'We designed interactive story frameworks ("Pick Your Fighter: Stand Mixer A vs B", "Is It Worth It?"), paired with sensory video reels showing appliances in real morning kitchen routines.',
    results: [
      '1.2M+ cumulative reel impressions across targeted Ugandan homeowners',
      '640+ direct WhatsApp purchase inquiries generated from story stickers and reels',
      'Two consecutive import containers completely sold out ahead of holiday seasons',
    ],
    quote: '“Their interactive story strategy took our social channels from passive lookers to direct buyers ready to pay.”',
    quoteAuthor: 'Management, Signature Homes',
  },
  {
    id: 'meatnbunz',
    title: 'Kampala Chronicles: Street Food Docu-Series',
    client: 'Meat N Bunz',
    category: 'streetfood',
    categoryLabel: 'Street Food & Culture',
    tagline: 'Capturing raw food passion, sizzling grills, and Kampala street energy.',
    views: '2.1M+ Reach',
    growth: 'Viral Cult Following',
    accentGradient: 'from-orange-600/30 via-red-600/20 to-zinc-900',
    challenge:
      'Breaking out of traditional fast-food marketing in a competitive urban landscape where food photos all look the same.',
    solution:
      'Produced "Kampala Chronicles", a gritty, cinema-grade street food docu-series spotlighting flame searing, melted cheese cascades, and raw behind-the-grill founder grit.',
    results: [
      '2.1 Million organic impressions across TikTok and Instagram',
      'Food truck sold out within 2.5 hours on Friday pop-up launch days',
      'Ranked as one of the most talked-about street culinary destinations in Kampala',
    ],
    quote: '“They don’t just shoot burgers. They shoot hunger, energy, and pure Kampala culture.”',
    quoteAuthor: 'Founder, Meat N Bunz',
  },
  {
    id: 'safibay',
    title: 'Waterfront Development & Construction BTS',
    client: 'Safi Bay',
    category: 'retail',
    categoryLabel: 'Real Estate & Architecture',
    tagline: 'Documenting architectural evolution from foundation to luxury skyline.',
    views: '520K+ Views',
    growth: 'High-Net-Worth Inquiries',
    accentGradient: 'from-cyan-900/30 via-red-900/20 to-zinc-900',
    challenge:
      'Pre-construction real estate typically suffers from slow public interest and dry rendering presentations.',
    solution:
      'Captured high-fidelity drone timelapses and behind-the-scenes engineering progress reels, building curiosity and luxury investment credibility.',
    results: [
      'Over 520,000 targeted views among East African diaspora and local investors',
      'Massive surge in credibility that shortened sales consultation cycles',
      'Established a living visual archive for the developer’s future portfolio',
    ],
    quote: '“The timelapse storytelling transformed complex construction into high-prestige content that attracted serious investors.”',
    quoteAuthor: 'Project Director, Safi Bay',
  },
  {
    id: 'running',
    title: 'Grassroots Wellness Movement Growth',
    client: 'Kampala Running Community',
    category: 'community',
    categoryLabel: 'Community Movements',
    tagline: 'From 3 runners at dawn to a massive citywide cultural movement.',
    views: '940K+ Views',
    growth: '10,000+ Total Runners',
    accentGradient: 'from-rose-600/30 via-red-800/20 to-zinc-900',
    challenge:
      'Igniting a fitness movement from scratch without any formal marketing budget or paid athlete endorsements.',
    solution:
      'Pioneered human-centric storytelling focusing on the vulnerability of starting, sunrise hype reels, and the infectious energy of collective movement in Kampala.',
    results: [
      'Grew the community from 3 early starters to over 400 weekly morning runners',
      'Over 940,000 views on movement-building reels and viral founder insights',
      'Secured national media coverage and regional athletic brand sponsorships',
    ],
    quote: '“Koko understood that community building is about people first. They turned our quiet passion into a citywide celebration.”',
    quoteAuthor: 'Community Organizer',
  },
  {
    id: 'rolex',
    title: 'The New Rolex Datejust: Macro Precision & Timeless Horology',
    client: 'Rolex Datejust Showcase',
    category: 'retail',
    categoryLabel: 'Luxury Horology & Timepieces',
    tagline: 'The new Rolex Datejust transforms everyday elegance into timeless prestige.',
    views: '1.8M+ Organic Views',
    growth: '+420% Boutique Inquiries',
    accentGradient: 'from-amber-700/40 via-red-900/30 to-[#0f0b09]',
    challenge:
      'Capturing the microscopic craftsmanship, fluted bezel light refraction, and jubilee bracelet articulation of an iconic luxury watch without losing the human emotional allure.',
    solution:
      'Engineered an ultra-macro 4K vertical visual narrative focusing on tactile mechanical sound design, golden-ratio reflection tracking, and wrist presence that radiates quiet luxury.',
    results: [
      '1.8M+ organic impressions across high-net-worth East African timepiece collectors',
      'Over 3,100 reel saves and collector shares in luxury horology circles',
      'Direct client inquiries surged for boutique appointment viewings in Kampala and Nairobi',
    ],
    quote: '“The new Rolex Datejust transforms everyday elegance into timeless prestige. Koko captured every sweep of the second hand with sheer perfection.”',
    quoteAuthor: 'Private Client & Horology Curator',
  },
];

export function PortfolioSection() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedCaseStudy, setSelectedCaseStudy] = useState<CaseStudy | null>(null);

  const filteredStudies =
    activeTab === 'all'
      ? CASE_STUDIES
      : CASE_STUDIES.filter((item) => item.category === activeTab);

  return (
    <section id="work" className="py-24 bg-[#18141a] relative">
      {/* Decorative Red Accent Lines */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-900/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/40 text-red-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Proven Results</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-serif tracking-tight">
              WORK THAT STOPS THE SCROLL &{' '}
              <span className="text-red-500 italic font-medium">
                DRIVES REVENUE.
              </span>
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base max-w-xl leading-relaxed">
              Explore how we engineer short-form video campaigns, build authentic communities, and accelerate commercial growth across East Africa.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {[
              { id: 'all', label: 'All Work' },
              { id: 'hospitality', label: 'Cafes & Dining' },
              { id: 'retail', label: 'Luxury & Retail' },
              { id: 'streetfood', label: 'Street Food' },
              { id: 'community', label: 'Community' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ease-out active:scale-95 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white shadow-lg shadow-red-700/40'
                    : 'bg-[#221d25] text-zinc-300 hover:text-white hover:bg-[#2b2430] border border-[#362d3a]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Case Studies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudies.map((study) => (
            <div
              key={study.id}
              className="group relative rounded-3xl bg-[#221d25] border border-[#362d3a] hover:border-red-500/60 transition-all duration-500 ease-out overflow-hidden flex flex-col justify-between shadow-xl hover:shadow-2xl hover:shadow-red-950/40 hover:-translate-y-2 cursor-pointer"
              onClick={() => setSelectedCaseStudy(study)}
            >
              {/* Card Banner with Ambient Red Glow */}
              <div className={`h-48 w-full bg-gradient-to-br ${study.accentGradient} p-6 flex flex-col justify-between relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
                
                {/* Category & Badge */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-bold text-red-300">
                    {study.categoryLabel}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white group-hover:bg-red-600 group-hover:text-white transition-all duration-300 group-hover:rotate-45">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Client Name & Quick Tag */}
                <div className="relative z-10">
                  <p className="text-xs font-semibold text-zinc-300">{study.client}</p>
                  <h3 className="text-xl font-bold text-white font-serif leading-tight mt-0.5 group-hover:text-red-200 transition-colors">
                    {study.title}
                  </h3>
                </div>
              </div>

              {/* Card Content & Metrics */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                  {study.tagline}
                </p>

                {/* Stat Badges */}
                <div className="pt-2 grid grid-cols-2 gap-2 border-t border-zinc-800/80">
                  <div className="p-2.5 rounded-xl bg-[#2a2430] border border-[#3d3344] group-hover:border-zinc-700 transition-colors">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Reach</p>
                    <p className="text-xs font-black text-white">{study.views}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#2a2430] border border-[#3d3344] group-hover:border-red-900/50 transition-colors">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Impact</p>
                    <p className="text-xs font-black text-red-400">{study.growth}</p>
                  </div>
                </div>

                {/* Action Link */}
                <div className="pt-1 flex items-center justify-between text-xs font-bold text-red-400 group-hover:text-red-300">
                  <span>View Case Study Breakdown</span>
                  <span className="text-lg leading-none">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Deep Dive Case Study Modal */}
        {selectedCaseStudy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-[#1f1a23] border border-red-800/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-950/60 max-h-[90vh] overflow-y-auto">
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedCaseStudy(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                aria-label="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="space-y-2 mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950 text-red-400 text-xs font-bold border border-red-800/40">
                  <span>{selectedCaseStudy.client}</span>
                  <span>•</span>
                  <span>{selectedCaseStudy.categoryLabel}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white font-serif">
                  {selectedCaseStudy.title}
                </h3>
                <p className="text-sm text-zinc-300">
                  {selectedCaseStudy.tagline}
                </p>
              </div>

              {/* Metrics Pill Row */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3.5 rounded-2xl bg-[#2a2430] border border-[#3d3344]">
                  <p className="text-xs text-zinc-400 font-medium">Audience Scale</p>
                  <p className="text-lg font-black text-white">{selectedCaseStudy.views}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#2a2430] border border-red-900/40">
                  <p className="text-xs text-zinc-400 font-medium">Commercial Conversion</p>
                  <p className="text-lg font-black text-red-400">{selectedCaseStudy.growth}</p>
                </div>
              </div>

              {/* The Breakdown */}
              <div className="space-y-5 text-sm">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">
                    The Challenge
                  </h4>
                  <p className="text-zinc-300 leading-relaxed">
                    {selectedCaseStudy.challenge}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">
                    The Koko Creative Approach
                  </h4>
                  <p className="text-zinc-300 leading-relaxed">
                    {selectedCaseStudy.solution}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2">
                    Verified Results & Deliverables
                  </h4>
                  <ul className="space-y-2">
                    {selectedCaseStudy.results.map((r, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Client Quote */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 to-transparent border-l-4 border-red-600 italic text-zinc-200 text-xs sm:text-sm">
                  {selectedCaseStudy.quote}
                  <p className="mt-2 text-right not-italic font-bold text-red-400 text-xs">
                    — {selectedCaseStudy.quoteAuthor}
                  </p>
                </div>
              </div>

              {/* Modal CTA */}
              <div className="mt-8 pt-4 border-t border-zinc-800 flex items-center justify-between">
                <button
                  onClick={() => setSelectedCaseStudy(null)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Close
                </button>
                <a
                  href="#contact"
                  onClick={() => setSelectedCaseStudy(null)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold shadow-lg shadow-red-700/40 hover:from-red-500 hover:to-red-600"
                >
                  Get Similar Results For Your Brand →
                </a>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
}
