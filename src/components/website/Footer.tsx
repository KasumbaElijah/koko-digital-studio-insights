'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUp, Instagram, Facebook, Linkedin, BarChart3 } from 'lucide-react';

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#110e13] border-t border-red-950/80 pt-16 pb-12 relative overflow-hidden">
      {/* Red accent glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-red-800/10 blur-[90px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-zinc-900">
          
          {/* Col 1 & 2: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3.5 group">
              <img
                src="/images/koko-avatar.png"
                alt="Koko Digital Studio"
                className="w-10 h-10 rounded-full shadow-md shadow-black/40 border border-white/10 group-hover:scale-105 transition-transform shrink-0"
              />
              <div>
                <img
                  src="/images/koko-logo-white.png"
                  alt="KOKO"
                  className="h-6 w-auto object-contain mb-1"
                />
                <p className="text-[10px] text-zinc-400 font-sans tracking-widest uppercase font-semibold">
                  Digital Studios • Kampala & Nairobi
                </p>
              </div>
            </Link>

            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              We engineer scroll-stopping 9:16 reels, high-converting TikToks, and community-first brand storytelling for bold businesses across East Africa.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://www.instagram.com/koko_digital_studio/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-[#1f1a23] border border-[#362d3a] flex items-center justify-center text-zinc-300 hover:text-red-400 hover:border-red-600/50 transition-all shadow-sm"
                aria-label="Instagram"
                title="Instagram: @koko_digital_studio"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://www.tiktok.com/@koko_digital_studios"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-[#1f1a23] border border-[#362d3a] flex items-center justify-center text-zinc-300 hover:text-red-400 hover:border-red-600/50 transition-all shadow-sm font-bold text-xs"
                aria-label="TikTok"
                title="TikTok: @koko_digital_studios"
              >
                TT
              </a>
              <a
                href="https://www.linkedin.com/company/koko-digital-studios/home/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-[#1f1a23] border border-[#362d3a] flex items-center justify-center text-zinc-300 hover:text-red-400 hover:border-red-600/50 transition-all shadow-sm"
                aria-label="LinkedIn"
                title="LinkedIn: Koko Digital Studios"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 3: Navigation */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider font-serif">
              Agency
            </p>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li><a href="#work" className="hover:text-red-400 transition-colors">Client Portfolio</a></li>
              <li><a href="#services" className="hover:text-red-400 transition-colors">Creative Services</a></li>
              <li><a href="#methodology" className="hover:text-red-400 transition-colors">The Koko Engine</a></li>
              <li><a href="#packages" className="hover:text-red-400 transition-colors">Packages & Pricing</a></li>
              <li><a href="#about" className="hover:text-red-400 transition-colors">Our Story & Team</a></li>
            </ul>
          </div>

          {/* Col 4: Client Hub */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider font-serif">
              Client Portal
            </p>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <Link href="/dashboard" className="flex items-center gap-1.5 hover:text-red-400 text-zinc-300 font-semibold transition-colors">
                  <BarChart3 className="w-3.5 h-3.5 text-red-500" />
                  <span>Social Analytics Portal</span>
                </Link>
              </li>
              <li><Link href="/settings" className="hover:text-red-400 transition-colors">OAuth Integrations</Link></li>
              <li><Link href="/privacy" className="hover:text-red-400 transition-colors">Privacy Policy</Link></li>
              <li><a href="#contact" className="hover:text-red-400 transition-colors">Book a Strategy Shoot</a></li>
            </ul>
          </div>

          {/* Col 5: Studios */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider font-serif">
              Locations
            </p>
            <div className="text-xs text-zinc-400 space-y-2 leading-relaxed">
              <div>
                <p className="font-semibold text-white">Kampala Studio HQ</p>
                <p className="text-zinc-500">Kololo / Greater Kampala, Uganda</p>
              </div>
              <div className="pt-2">
                <p className="font-semibold text-white">Nairobi Creative Hub</p>
                <p className="text-zinc-500">Nairobi, Kenya</p>
              </div>
              <div className="pt-2">
                <p className="font-semibold text-white">Direct Inquiries</p>
                <a href="mailto:kokodigitalstudios@gmail.com" className="text-red-400 hover:underline">
                  kokodigitalstudios@gmail.com
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Copyright & Back to Top */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} Koko Digital Studio. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
              Privacy Policy
            </Link>
            <button
              onClick={scrollToTop}
              className="flex items-center gap-1 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              <span>Back to Top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
