'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface SectionDividerProps {
  label?: string;
  className?: string;
}

export function SectionDivider({ label, className = '' }: SectionDividerProps) {
  return (
    <div className={`relative w-full py-10 flex items-center justify-center overflow-hidden ${className}`}>
      {/* Background Gradient Line */}
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-red-600/50 to-transparent" />
      
      {/* Ambient Red Blur behind center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-8 bg-red-600/15 blur-xl pointer-events-none rounded-full" />

      {/* Center Badge or Diamond Motif */}
      {label ? (
        <div className="relative z-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#18141a] border border-red-800/50 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-red-400 shadow-xl shadow-red-950/50 group hover:border-red-500 hover:text-red-300 transition-all duration-300">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span>{label}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        </div>
      ) : (
        <div className="relative z-10 w-7 h-7 rounded-lg bg-[#18141a] border border-red-800/60 rotate-45 flex items-center justify-center shadow-lg shadow-red-950/40 group hover:border-red-500 transition-all duration-300">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-600 group-hover:scale-110 transition-transform" />
        </div>
      )}
    </div>
  );
}
