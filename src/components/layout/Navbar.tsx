'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';
import { Building2, LogOut, Shield, User, Loader2 } from 'lucide-react';

interface NavbarProps {
  profile: Profile;
}

export function Navbar({ profile }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  const getRoleBadge = () => {
    switch (profile.role) {
      case 'head':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            Chief Admin
          </span>
        );
      case 'resolver':
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
              <Building2 className="w-3 h-3 text-indigo-600" />
              Resolver
            </span>
            {profile.department && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {profile.department}
              </span>
            )}
          </div>
        );
      case 'citizen':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <User className="w-3 h-3 text-emerald-600" />
            Citizen
          </span>
        );
    }
  };

  const getDashboardHref = () => {
    if (profile.role === 'citizen') return '/citizen';
    if (profile.role === 'resolver') return '/resolver';
    if (profile.role === 'head') return '/admin';
    return '/';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <Link
              href={getDashboardHref()}
              className="flex items-center gap-2.5 text-slate-900 font-bold text-lg tracking-tight hover:opacity-90 transition-opacity"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <span>CivicResolve</span>
            </Link>

            <span className="hidden sm:inline-block text-slate-300">/</span>
            <span className="hidden sm:inline-block text-xs uppercase tracking-wider font-semibold text-slate-500">
              {profile.role === 'head'
                ? 'Admin Headquarters'
                : profile.role === 'resolver'
                ? 'Department Operations'
                : 'Citizen Services'}
            </span>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-800 leading-tight">
                  {profile.full_name}
                </div>
                <div className="text-xs text-slate-500">{profile.email}</div>
              </div>

              {getRoleBadge()}
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors disabled:opacity-50"
              title="Sign Out"
            >
              {loggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
