'use client';

import React from 'react';
import Link from 'next/link';
import { Layers, Key, ArrowLeft, ExternalLink } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f6] text-gray-900">
      {/* Analytics Dashboard Header - Themed with Koko Red & Instagram Logo */}
      <header className="no-print bg-[#0a0a0c] text-white py-3.5 px-6 shadow-md border-b border-red-950/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Back to Agency Website */}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Agency Site</span>
            </Link>

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <img
                src="/images/koko-avatar.png"
                alt="Koko Digital Studio"
                className="w-8 h-8 rounded-full shadow-md shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold tracking-tight font-heading text-white">
                    Koko Digital <span className="text-red-500">Insights</span>
                  </h1>
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-800/40">
                    Portal
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium tracking-wide">
                  Social Analytics & PDF Reporting Engine
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-sm shadow-red-700/30 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-red-400" />
              <span>OAuth Settings</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-gray-200 py-6 px-6 text-center text-xs text-gray-500 bg-white">
        <p>© {new Date().getFullYear()} Koko Digital Studio Insights. All rights reserved.</p>
      </footer>
    </div>
  );
}
