'use client';

import React from 'react';
import { Target, Zap, Volume2, Users, ArrowRight } from 'lucide-react';

const METHOD_STEPS = [
  {
    step: '01',
    icon: Target,
    title: 'Value-First DNA Extraction',
    subtitle: 'We find what makes your brand impossible to ignore.',
    description:
      'Most brand videos get skipped because they talk about themselves. We dissect your business through your customer’s eyes, finding the sensory triggers, pain points, and aspirational moments that make viewers immediately care.',
    rule: 'The Rule: No vanity filler. If it doesn’t add value or evoke a visceral emotion, it doesn’t make the cut.',
  },
  {
    step: '02',
    icon: Zap,
    title: 'The 3-Second Retention Hook',
    subtitle: 'Stopping the thumb dead in its scroll.',
    description:
      'The battle on TikTok and Instagram is won or lost in the first 3 seconds. We deploy visual pattern interrupts, unexpected audio cues, and curiosity-driven hooks that force viewers to pause and lean in.',
    rule: 'The Rule: Never start with a generic logo intro. Start with high-impact conflict, beauty, or intrigue.',
  },
  {
    step: '03',
    icon: Volume2,
    title: 'Sensory Pacing & Sonic Architecture',
    subtitle: 'Holding attention through the final frame.',
    description:
      'Viral retention requires rhythm. We choreograph rapid visual cuts every 1.5–2.5 seconds, sync motion to trending East African and global audio, and layer bespoke sound effects (foley, sizzles, whooshes) that trigger dopamine.',
    rule: 'The Rule: People watch with their eyes, but they feel with their ears. Sound design is 50% of the video.',
  },
  {
    step: '04',
    icon: Users,
    title: 'Cult-Action Conversion Funnel',
    subtitle: 'Turning passive viewers into paying customers.',
    description:
      'Views without commercial impact are useless. We engineer strategic calls-to-action (interactive story polls, DM comment triggers, bookmarkable guides) that drive followers directly into your WhatsApp, DM inbox, or storefront.',
    rule: 'The Rule: Don’t just ask for a generic follow. Give them a compelling reason to engage right now.',
  },
];

export function MethodologySection() {
  return (
    <section id="methodology" className="py-24 bg-[#18141a] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/40 text-red-400 text-xs font-bold uppercase tracking-wider">
            <span>The Science of Attention</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-serif tracking-tight">
            THE KOKO ENGINE:{' '}
            <span className="text-red-500 italic font-medium">
              WHY OUR CONTENT CONVERTS.
            </span>
          </h2>
          <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
            Virality isn’t luck—it’s an engineered formula. Here is the exact 4-step framework we use to turn quiet brands into cultural staples in East Africa.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {METHOD_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="relative rounded-3xl p-8 bg-[#221d25] border border-[#362d3a] hover:border-red-600/50 hover:bg-[#2a2430] hover:-translate-y-1 transition-all duration-300 shadow-xl hover:shadow-red-950/30 flex flex-col justify-between group"
              >
                {/* Step Number Top Pill */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black font-serif text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700">
                      {step.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-red-600/15 border border-red-500/20 text-red-400 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-zinc-300 bg-[#2a2430] px-3 py-1 rounded-full border border-[#3d3344]">
                    Phase {step.step}
                  </span>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white font-serif">
                    {step.title}
                  </h3>
                  <p className="text-xs font-semibold text-red-400">
                    {step.subtitle}
                  </p>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pt-1">
                    {step.description}
                  </p>
                </div>

                {/* The Rule Box */}
                <div className="mt-6 p-3.5 rounded-2xl bg-[#191922] border-l-4 border-red-600 text-xs text-zinc-300 font-medium">
                  {step.rule}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-14 p-8 rounded-3xl bg-gradient-to-r from-red-950/60 via-[#16161f] to-[#121216] border border-red-800/40 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-lg sm:text-xl font-black text-white font-heading">
              Ready to apply this framework to your brand?
            </h4>
            <p className="text-xs sm:text-sm text-zinc-400">
              We audit your current social channels and build a tailored short-form video roadmap on day one.
            </p>
          </div>
          <a
            href="#contact"
            className="px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-700/40 hover:shadow-red-600/60 transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
          >
            <span>Claim Your Free Channel Audit</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

      </div>
    </section>
  );
}
