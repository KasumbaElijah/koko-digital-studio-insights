'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import {
  Lock,
  ShieldCheck,
  Users,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  KeyRound,
} from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your team email/username and password.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/session', {
        identifier: identifier.trim(),
        password,
      });

      if (res.data?.success && res.data?.authenticated) {
        router.push(nextPath);
        router.refresh();
      } else {
        setError(res.data?.error || 'Login failed.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          'Invalid email/username or password. Public sign-ups are disabled.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickFillCredentials = (roleType: 'admin' | 'am_sarah' | 'am_david') => {
    setError('');
    if (roleType === 'admin') {
      setIdentifier('elijah@kokodigitalstudio.com');
      setPassword('KokoAdmin2026!');
    } else if (roleType === 'am_sarah') {
      setIdentifier('sarah@kokodigitalstudio.com');
      setPassword('KokoTeam2026!');
    } else {
      setIdentifier('david@kokodigitalstudio.com');
      setPassword('KokoTeam2026!');
    }
  };

  return (
    <div className="min-h-[78vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full bg-black text-white rounded-3xl border border-neutral-800 p-7 sm:p-9 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-purple-500" />

        <div className="text-center space-y-2 mb-7">
          <div className="w-12 h-12 bg-white text-black font-black text-sm flex items-center justify-center rounded-2xl mx-auto shadow-md tracking-tighter">
            KOKO
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
            <Lock className="w-3 h-3" /> Invite-Only Team Portal
          </div>
          <h1 className="text-2xl font-black tracking-tight font-heading">
            Koko Digital Studio Insights
          </h1>
          <p className="text-xs text-neutral-400">
            Sign in with your Management or Account Manager credentials. Public registration is disabled.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Team Email or Username
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. elijah@kokodigitalstudio.com"
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs font-semibold text-white placeholder-neutral-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your team password"
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-3 pr-10 text-xs font-semibold text-white placeholder-neutral-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In to Workspace'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Role Access Selector for Team Testing */}
        <div className="mt-7 pt-5 border-t border-neutral-800/90 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              Team Role Quick Fill
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">30-Day Persistent Session</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => quickFillCredentials('admin')}
              className="w-full p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-extrabold text-white">
                    Management (Admin) — Full Access
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    elijah@kokodigitalstudio.com • All accounts, APIs & team assignments
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Fill
              </span>
            </button>

            <button
              type="button"
              onClick={() => quickFillCredentials('am_sarah')}
              className="w-full p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-extrabold text-white">
                    Sarah (Account Manager) — Assigned Only
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    sarah@kokodigitalstudio.com • Total Tools & Wadad Spa only
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Fill
              </span>
            </button>

            <button
              type="button"
              onClick={() => quickFillCredentials('am_david')}
              className="w-full p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="text-xs font-extrabold text-white">
                    David (Account Manager) — Assigned Only
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    david@kokodigitalstudio.com • King Rhymes & Koko Studio only
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Fill
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-gray-500">Loading login...</div>}>
      <LoginContent />
    </Suspense>
  );
}
