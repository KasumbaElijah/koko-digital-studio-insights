'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Layers,
  Activity,
  Trophy,
  Key,
  LogOut,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { SessionUser } from '@/lib/teamAuth';

export const HeaderNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    axios
      .get('/api/auth/session')
      .then((res) => {
        if (res.data?.authenticated && res.data?.user) {
          setUser(res.data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await axios.delete('/api/auth/session');
    } catch {}
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  if (pathname?.startsWith('/login')) {
    return (
      <div className="text-xs font-semibold text-gray-400">
        Authorized Team Access Only
      </div>
    );
  }

  const isAdmin = !user || user.role === 'ADMIN';

  return (
    <div className="flex items-center flex-wrap gap-2">
      <nav className="flex items-center flex-wrap gap-2">
        <Link
          href="/"
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            pathname === '/'
              ? 'bg-white text-black font-bold'
              : 'bg-gray-900 hover:bg-gray-800 text-gray-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Dashboard
        </Link>

        <Link
          href="/performance-tracker"
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-200 border border-blue-800/60 transition-colors"
        >
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          Performance Tracker
        </Link>

        <Link
          href="/bonus-tracker"
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700/60 transition-colors"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          Bonus Tracker
        </Link>

        {isAdmin && (
          <Link
            href="/settings"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              pathname?.startsWith('/settings')
                ? 'bg-emerald-500 text-black font-bold'
                : 'bg-gray-900 hover:bg-gray-800 text-gray-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            OAuth & Team Admin
          </Link>
        )}
      </nav>

      {user && (
        <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
              user.role === 'ADMIN'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            }`}
            title={
              user.role === 'ADMIN'
                ? 'Management (Admin): Full system access'
                : `Account Manager: ${user.assignedClientIds.length} assigned channels`
            }
          >
            {user.role === 'ADMIN' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="max-w-[130px] truncate">{user.name.split('(')[0].trim()}</span>
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/50">
              {user.role === 'ADMIN' ? 'Admin' : 'AM'}
            </span>
          </span>

          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-rose-950 text-gray-300 hover:text-rose-300 border border-gray-800 hover:border-rose-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};
