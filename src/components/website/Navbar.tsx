'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight, BarChart3, Sparkles, ChevronRight } from 'lucide-react';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Work', href: '#work' },
    { name: 'Services', href: '#services' },
    { name: 'Methodology', href: '#methodology' },
    { name: 'Packages', href: '#packages' },
    { name: 'About', href: '#about' },
    { name: 'Careers', href: '#careers', badge: 'Hiring' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#151216]/90 backdrop-blur-md border-b border-red-950/50 shadow-xl shadow-black/40 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo: Official KOKO Digital Studio Wordmark & Avatar */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <img
              src="/images/koko-avatar.png"
              alt="Koko Digital Studio"
              className="w-9 h-9 rounded-full shadow-md shadow-black/40 border border-white/10 group-hover:scale-105 transition-transform shrink-0"
            />
            {/* Active studio indicator dot */}
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-[#151216]"></span>
            </span>
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <img
                src="/images/koko-logo-white.png"
                alt="KOKO"
                className="h-5 w-auto object-contain transition-opacity group-hover:opacity-90"
              />
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                Kampala • Nairobi
              </span>
            </div>
            <span className="text-[8.5px] uppercase font-bold tracking-[0.28em] text-zinc-400 mt-0.5 font-sans">
              Digital Studios
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-[#131317]/80 backdrop-blur-md p-1.5 rounded-full border border-zinc-800 shadow-inner">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-xs font-semibold text-zinc-300 hover:text-white px-3.5 py-1.5 rounded-full transition-colors hover:bg-zinc-800/60 inline-flex items-center gap-1.5"
            >
              <span>{link.name}</span>
              {link.badge && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-[9px] font-black text-white uppercase tracking-wider">
                  {link.badge}
                </span>
              )}
            </a>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Client Portal Link to /dashboard */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-[#141418] hover:bg-zinc-800/90 border border-zinc-800 hover:border-red-900/60 transition-all group"
            title="Open Client Social Analytics & Reporting"
          >
            <BarChart3 className="w-3.5 h-3.5 text-red-500 group-hover:scale-110 transition-transform" />
            <span>Client Portal</span>
          </Link>

          {/* Book Discovery Call CTA */}
          <a
            href="#contact"
            className="relative group overflow-hidden flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-md shadow-red-700/30 hover:shadow-red-600/50 transition-all active:scale-95"
          >
            <span>Book a Shoot</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg bg-[#141418] text-zinc-300 border border-zinc-800 text-xs flex items-center gap-1"
          >
            <BarChart3 className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[10px] font-bold">Portal</span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-[#141418] text-zinc-300 hover:text-white border border-zinc-800 focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-red-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#151216]/98 border-b border-red-950/60 px-6 py-6 space-y-4 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-zinc-300 hover:text-red-400 py-2 border-b border-zinc-900 flex items-center justify-between"
              >
                <span>{link.name}</span>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </a>
            ))}
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 rounded-xl text-center text-xs font-semibold text-zinc-200 bg-[#16161b] border border-zinc-800 flex items-center justify-center gap-2"
            >
              <BarChart3 className="w-4 h-4 text-red-500" />
              <span>Access Client Analytics Portal</span>
            </Link>

            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 rounded-xl text-center text-xs font-bold text-white bg-gradient-to-r from-red-600 to-red-700 shadow-lg shadow-red-700/40 flex items-center justify-center gap-2"
            >
              <span>Book a Discovery Shoot</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
