'use client';

import React from 'react';
import { MapPin, Award, Flame, Heart, Compass, ShieldCheck, Sparkles } from 'lucide-react';

export function AboutSection() {
  const teamValues = [
    {
      icon: Flame,
      title: 'Value-First Over Vanity',
      description:
        'We refuse to shoot empty trend dances that get views but leave zero brand recall. Every frame must communicate why your business is extraordinary.',
    },
    {
      icon: Compass,
      title: 'Obsession With Craft',
      description:
        'From micro-sound design to lighting phone cameras for cinematic depth, we obsess over every visual detail so your brand stands leagues above competitors.',
    },
    {
      icon: Heart,
      title: 'Community-First Mindset',
      description:
        'We don’t just build accounts; we cultivate communities. When people feel part of a movement (like the Kampala Running Movement), loyalty becomes permanent.',
    },
    {
      icon: ShieldCheck,
      title: 'Radical Transparency',
      description:
        'No vague marketing speak. Through our proprietary Koko Analytics platform, clients see their exact real-time numbers, format ROI, and monthly results.',
    },
  ];

  return (
    <section id="about" className="py-24 bg-[#18141a] relative overflow-hidden">
      {/* Background Red Ambient Glow */}
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-red-800/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-0 w-[400px] h-[400px] bg-red-950/20 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/40 text-red-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>The Koko Digital Story</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-serif tracking-tight leading-tight">
              BORN IN KAMPALA.{' '}
              <span className="text-red-500 italic font-medium">
                SCALING EAST AFRICA’S
              </span>{' '}
              BOLDEST BRANDS.
            </h2>

            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
              Koko Digital was founded on a simple, rebellious premise: <strong className="text-white">corporate marketing is boring, and African businesses deserve world-class storytelling.</strong>
            </p>

            <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
              We started by transforming local favorites like Névo Café and Meat N Bunz into viral cultural landmarks using nothing more than cutting-edge phone videography, sharp human psychology, and relentless creative consistency. Today, with operations bridging <span className="text-white font-semibold">Kampala, Uganda</span> and <span className="text-white font-semibold">Nairobi, Kenya</span>, we operate as the go-to creative growth engine for brands that refuse to be ignored.
            </p>

            {/* Regional Badges */}
            <div className="pt-2 flex flex-wrap gap-4">
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#221d25] border border-[#362d3a] text-xs font-semibold text-white shadow-md">
                <MapPin className="w-4 h-4 text-red-500" />
                <span>Kampala Headquarters (Uganda)</span>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#221d25] border border-[#362d3a] text-xs font-semibold text-white shadow-md">
                <MapPin className="w-4 h-4 text-red-500" />
                <span>Nairobi Regional Hub (Kenya)</span>
              </div>
            </div>
          </div>

          {/* Right Card: Studio Manifesto */}
          <div className="lg:col-span-5">
            <div className="p-8 rounded-3xl bg-gradient-to-b from-red-950/40 via-[#221d25] to-[#1c1720] border-2 border-red-800/40 shadow-2xl relative">
              <div className="mb-6 flex items-center gap-3">
                <img
                  src="/images/koko-avatar.png"
                  alt="Koko Digital Studio"
                  className="w-12 h-12 rounded-2xl shadow-lg shadow-red-700/30 border border-white/10"
                />
                <img
                  src="/images/koko-logo-white.png"
                  alt="KOKO"
                  className="h-6 w-auto object-contain"
                />
              </div>
              
              <h3 className="text-xl font-bold text-white font-serif mb-3">
                Our Creative Manifesto
              </h3>
              
              <blockquote className="text-xs sm:text-sm text-zinc-300 italic leading-relaxed space-y-3">
                <p>
                  “Every brand has a heartbeat. Too many agencies drown that heartbeat under generic corporate templates, stiff voiceovers, and lifeless graphics.”
                </p>
                <p>
                  “We extract the raw, unfiltered energy of what you build. We shoot with kinetic rhythm, design with taste, and demand that the audience stops scrolling.”
                </p>
              </blockquote>

              <div className="mt-6 pt-6 border-t border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">Archie & Koko</p>
                  <p className="text-zinc-500 text-[11px]">Creative Directors & Founders</p>
                </div>
                <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider bg-red-950/80 px-2.5 py-1 rounded-full border border-red-800/50">
                  Kampala • Nairobi
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Core Pillars of Studio Culture */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {teamValues.map((val, idx) => {
            const Icon = val.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-[#221d25] border border-[#362d3a] hover:border-red-700/50 transition-all duration-300 shadow-lg group hover:-translate-y-1 hover:bg-[#2a2430]"
              >
                <div className="w-10 h-10 rounded-2xl bg-red-600/15 border border-red-500/20 text-red-500 flex items-center justify-center mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white font-serif mb-2">
                  {val.title}
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {val.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Official Studio Hiring Spotlight — Directly from the Studio Poster */}
        <div id="careers" className="rounded-3xl bg-gradient-to-br from-[#2f1c18] via-[#241c21] to-[#1c161a] border-2 border-red-900/60 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          {/* Ambient Lighting Accents */}
          <div className="absolute top-0 right-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-10 w-64 h-64 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            {/* Top Bar: WE'RE HIRING + KOKO DIGITAL STUDIOS */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="inline-block px-3.5 py-1.5 bg-[#E60039] text-white text-xs font-black uppercase tracking-wider rounded-sm shadow-lg shadow-red-950/60">
                WE’RE HIRING
              </div>
              <div className="flex flex-col items-end">
                <img
                  src="/images/koko-logo-white.png"
                  alt="KOKO"
                  className="h-5 w-auto object-contain mb-1"
                />
                <span className="block font-sans text-[9px] text-zinc-400 tracking-[0.25em] uppercase font-semibold">
                  DIGITAL STUDIOS
                </span>
              </div>
            </div>

            {/* Headline */}
            <h3 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-black text-white tracking-tight leading-[1.1] mt-6">
              <span className="text-[#FF1E56]">ACCOUNT</span> MANAGER<br />
              WANTED
            </h3>

            {/* Sub-headline */}
            <p className="text-xs sm:text-sm text-zinc-400 uppercase tracking-widest font-sans font-semibold mt-3">
              FULL-TIME • KAMPALA • IMMEDIATE START
            </p>

            {/* Salary Package */}
            <div className="mt-6 flex flex-wrap items-baseline gap-3">
              <span className="text-4xl sm:text-6xl font-sans font-black text-[#FF1E56] tracking-tight">
                500k-1m
              </span>
              <span className="text-2xl sm:text-3xl font-sans font-bold text-white">
                UGX/mo
              </span>
              <span className="text-xs text-zinc-400 w-full font-medium">
                Base salary + Performance Bonuses
              </span>
            </div>

            {/* Key Responsibilities Card */}
            <div className="mt-8 p-6 sm:p-7 rounded-2xl bg-[#261b1e]/95 border-l-4 border-[#FF1E56] border-y border-r border-[#3d2b30] shadow-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
                KEY RESPONSIBILITIES
              </h4>
              <ul className="space-y-3 text-xs sm:text-sm text-zinc-200">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#FF1E56] shrink-0 mt-1.5" />
                  <span>Oversee the planning and execution of client campaigns.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#FF1E56] shrink-0 mt-1.5" />
                  <span>Manage day to day communication with assigned clients.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#FF1E56] shrink-0 mt-1.5" />
                  <span>Maintain strong, long-term client relationships and ensure client satisfaction.</span>
                </li>
              </ul>
            </div>

            {/* Ready to Apply Action Box */}
            <a
              href="mailto:kokodigitalstudios@gmail.com?subject=Application%20for%20Account%20Manager%20Role%20-%20Koko%20Digital&body=Hi%20Koko%20Digital%20Team,%0A%0AI'd%20love%20to%20apply%20for%20the%20Account%20Manager%20role%20in%20Kampala.%20Please%20find%20my%20CV%20and%20portfolio%20links%20attached."
              className="mt-6 block p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#dc2626] to-[#e11d48] hover:from-[#b91c1c] hover:to-[#be123c] text-white transition-all shadow-xl shadow-red-950/60 group active:scale-98"
            >
              <p className="text-[11px] uppercase font-extrabold tracking-widest text-red-200">
                READY TO APPLY?
              </p>
              <div className="text-base sm:text-xl font-bold text-white mt-1 flex items-center justify-between gap-4">
                <span>Send your CV to kokodigitalstudios@gmail.com</span>
                <span className="px-3 py-1 rounded-xl bg-white/20 text-xs font-bold uppercase tracking-wider shrink-0 group-hover:translate-x-1 transition-transform">
                  Apply Now →
                </span>
              </div>
              <p className="text-xs text-red-100/90 mt-1">
                Takes few minutes • Include a link to your previous work.
              </p>
            </a>

            {/* Official Footer Links */}
            <div className="mt-6 pt-5 border-t border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-zinc-400 gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span>Follow our socials: </span>
                <a
                  href="https://www.instagram.com/koko_digital_studio/?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-white hover:text-red-400 transition-colors underline"
                >
                  Instagram
                </a>
                <span>•</span>
                <a
                  href="https://www.tiktok.com/@koko_digital_studios"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-white hover:text-red-400 transition-colors underline"
                >
                  TikTok
                </a>
                <span>•</span>
                <a
                  href="https://www.linkedin.com/company/koko-digital-studios/home/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-white hover:text-red-400 transition-colors underline"
                >
                  LinkedIn
                </a>
              </div>
              <div>
                <span>Email us at: </span>
                <a
                  href="mailto:kokodigitalstudios@gmail.com"
                  className="font-bold text-red-400 hover:underline"
                >
                  kokodigitalstudios@gmail.com
                </a>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
