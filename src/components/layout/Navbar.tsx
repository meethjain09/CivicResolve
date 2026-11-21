'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';
import { Building2, LogOut, Shield, User, Loader2 } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';

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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            Chief Admin
          </span>
        );
      case 'resolver':
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border"
              style={{
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent)',
                borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
              }}
            >
              <Building2 className="w-3 h-3" />
              Resolver
            </span>
            {profile.department && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {profile.department}
              </span>
            )}
          </div>
        );
      case 'citizen':
      default:
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border"
            style={{
              backgroundColor: 'var(--accent-soft)',
              color: 'var(--accent)',
              borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
            }}
          >
            <User className="w-3 h-3" />
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
    <header
      className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-200"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-card) 92%, transparent)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <Link
              href={getDashboardHref()}
              className="flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-90 transition-opacity"
              style={{ color: 'var(--text-primary)' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs transition-transform hover:scale-105"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                <Building2 className="w-5 h-5" />
              </div>
              <span className="font-semibold tracking-tight">CivicResolve</span>
            </Link>

            <span className="hidden sm:inline-block opacity-40" style={{ color: 'var(--border-strong)' }}>
              /
            </span>
            <span
              className="hidden sm:inline-block text-xs uppercase tracking-wider font-mono font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              {profile.role === 'head'
                ? 'Admin Headquarters'
                : profile.role === 'resolver'
                ? 'Department Operations'
                : 'Citizen Services'}
            </span>
          </div>

          {/* User profile, ThemeSwitcher & Logout */}
          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeSwitcher />

            <div className="h-5 w-px hidden sm:block" style={{ backgroundColor: 'var(--border-subtle)' }} />

            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <div
                  className="text-sm font-semibold leading-tight tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {profile.full_name}
                </div>
                <div
                  className="text-xs font-mono"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {profile.email}
                </div>
              </div>

              {getRoleBadge()}
            </div>

            <div className="h-5 w-px hidden sm:block" style={{ backgroundColor: 'var(--border-subtle)' }} />

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer disabled:opacity-50 hover:border-rose-400 hover:text-rose-500 hover:bg-rose-500/10"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                borderColor: 'var(--border-subtle)',
              }}
              title="Sign Out"
            >
              {loggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
