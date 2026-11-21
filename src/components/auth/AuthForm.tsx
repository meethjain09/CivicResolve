'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserRole, Profile } from '@/types/database';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { TypingIndicatorWrapper } from '@/components/ui/TypingIndicatorWrapper';
import {
  Shield,
  User,
  Building2,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';

export function AuthForm() {
  const router = useRouter();
  const supabase = createClient();

  const [portalMode, setPortalMode] = useState<'citizen' | 'resolver'>('citizen');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<UserRole | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);

  const resetFormState = (newPortalMode: 'citizen' | 'resolver') => {
    setPortalMode(newPortalMode);
    setAuthMode('signin');
    setErrorMsg(null);
    setVerificationNotice(null);
  };

  const handleRoleRedirect = (role: UserRole) => {
    if (role === 'citizen') {
      router.push('/citizen');
    } else if (role === 'resolver') {
      router.push('/resolver');
    } else if (role === 'head') {
      router.push('/admin');
    } else {
      router.push('/');
    }
    router.refresh();
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setVerificationNotice(null);
    setLoading(true);

    try {
      if (portalMode === 'citizen' && authMode === 'signup') {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name.');
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: 'citizen',
            },
          },
        });

        if (error) throw error;

        if (!data.session) {
          setVerificationNotice(
            'Registration successful! Please check your email inbox to verify your email address before logging in.'
          );
          setAuthMode('signin');
          return;
        }

        // If session exists immediately
        handleRoleRedirect('citizen');
        return;
      }

      // Sign In Flow (both Citizen and Resolver tabs)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Authentication succeeded but user profile was not found.');
      }

      // Fetch user profile to verify role compatibility
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('Profile record could not be loaded. Please contact an administrator.');
      }

      const userRole = (profile as Profile).role;

      // Role compatibility checks
      if (portalMode === 'citizen' && userRole !== 'citizen') {
        await supabase.auth.signOut();
        throw new Error(
          `This account has the role "${userRole.toUpperCase()}". Please switch to the "Resolver / Admin Login" tab above to sign in.`
        );
      }

      if (portalMode === 'resolver' && userRole === 'citizen') {
        await supabase.auth.signOut();
        throw new Error(
          'This account is registered as a Citizen. Please switch to the "Citizen Login" tab to sign in.'
        );
      }

      // Redirect authorized user
      handleRoleRedirect(userRole);
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err?.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (accountType: UserRole) => {
    setErrorMsg(null);
    setVerificationNotice(null);
    setDemoLoading(accountType);

    try {
      // 1. Ensure demo account exists via backend API
      const res = await fetch('/api/auth/demo-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountType }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to prepare demo credentials');
      }

      // 2. Sign in directly
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: json.email,
        password: json.password,
      });

      if (signInError) throw signInError;

      // 3. Route to corresponding portal
      handleRoleRedirect(json.role || accountType);
    } catch (err: any) {
      console.error('Demo login error:', err);
      setErrorMsg(err?.message || 'Failed to complete demo login.');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="w-full">
      {/* Portal Mode Segmented Toggle Pill */}
      <div
        className="grid grid-cols-2 p-1.5 mb-6 rounded-xl border shadow-xs"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <button
          type="button"
          onClick={() => resetFormState('citizen')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            portalMode === 'citizen'
              ? 'shadow-xs'
              : 'hover:opacity-80'
          }`}
          style={{
            backgroundColor: portalMode === 'citizen' ? 'var(--bg-card)' : 'transparent',
            color: portalMode === 'citizen' ? 'var(--text-primary)' : 'var(--text-muted)',
            border: portalMode === 'citizen' ? '1px solid var(--border-subtle)' : '1px solid transparent',
          }}
        >
          <User className="w-3.5 h-3.5" style={{ color: portalMode === 'citizen' ? 'var(--accent)' : 'inherit' }} />
          <span>Citizen Login</span>
        </button>

        <button
          type="button"
          onClick={() => resetFormState('resolver')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            portalMode === 'resolver'
              ? 'shadow-xs'
              : 'hover:opacity-80'
          }`}
          style={{
            backgroundColor: portalMode === 'resolver' ? 'var(--bg-card)' : 'transparent',
            color: portalMode === 'resolver' ? 'var(--text-primary)' : 'var(--text-muted)',
            border: portalMode === 'resolver' ? '1px solid var(--border-subtle)' : '1px solid transparent',
          }}
        >
          <Building2 className="w-3.5 h-3.5" style={{ color: portalMode === 'resolver' ? 'var(--accent)' : 'inherit' }} />
          <span>Resolver Login</span>
        </button>
      </div>

      {/* Main Authentication Card */}
      <SpotlightCard shine className="p-6 sm:p-7 shadow-xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {portalMode === 'citizen'
                ? authMode === 'signin'
                  ? 'Citizen Sign In'
                  : 'Create Citizen Account'
                : 'Officer & Admin Sign In'}
            </h2>
            <span
              className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full border"
              style={{
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent)',
                borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
              }}
            >
              {portalMode === 'citizen' ? 'Public Portal' : 'Official Portal'}
            </span>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {portalMode === 'citizen'
              ? authMode === 'signin'
                ? 'Report civic problems, track live resolution status, and view telemetry.'
                : 'Register an account to report issues and follow neighborhood municipal actions.'
              : 'Authorized department resolvers and undeletable Chief Administrator portal.'}
          </p>
        </div>

        {/* Verification banner */}
        {verificationNotice && (
          <div
            className="mb-5 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs"
            style={{
              backgroundColor: 'var(--accent-soft)',
              borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)',
              color: 'var(--text-primary)',
            }}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <div>
              <p className="font-semibold" style={{ color: 'var(--accent)' }}>Verification Email Sent</p>
              <p className="mt-0.5 opacity-90 leading-relaxed">{verificationNotice}</p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1">
              <p className="font-semibold text-rose-600 dark:text-rose-400">Authentication Alert</p>
              <p className="mt-0.5 opacity-90 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {portalMode === 'citizen' && authMode === 'signup' && (
            <div>
              <label
                className="block text-[11px] font-mono font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Full Name
              </label>
              <TypingIndicatorWrapper value={fullName}>
                <div className="relative">
                  <User
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10"
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg text-xs sm:text-sm focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-strong)',
                    }}
                  />
                </div>
              </TypingIndicatorWrapper>
            </div>
          )}

          <div>
            <label
              className="block text-[11px] font-mono font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Email Address
            </label>
            <TypingIndicatorWrapper value={email}>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    portalMode === 'citizen' ? 'citizen@example.com' : 'officer@civicresolve.gov'
                  }
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-xs sm:text-sm focus:outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-strong)',
                  }}
                />
              </div>
            </TypingIndicatorWrapper>
          </div>

          <div>
            <label
              className="block text-[11px] font-mono font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Password
            </label>
            <TypingIndicatorWrapper value={password} showDot={false}>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg text-xs sm:text-sm focus:outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-strong)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-opacity cursor-pointer opacity-60 hover:opacity-100 z-10"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </TypingIndicatorWrapper>
          </div>

          <button
            type="submit"
            disabled={loading || demoLoading !== null}
            className="btn-shimmer w-full mt-2 py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95 active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>
                  {portalMode === 'citizen'
                    ? authMode === 'signin'
                      ? 'Sign In as Citizen'
                      : 'Create Citizen Account'
                    : 'Sign In as Officer'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle between Sign In and Sign Up (Citizen mode only) */}
        {portalMode === 'citizen' && (
          <div
            className="mt-5 pt-4 border-t text-center text-xs"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            {authMode === 'signin' ? (
              <p>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMsg(null);
                    setVerificationNotice(null);
                  }}
                  className="font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                  style={{ color: 'var(--accent)' }}
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMsg(null);
                    setVerificationNotice(null);
                  }}
                  className="font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                  style={{ color: 'var(--accent)' }}
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        )}

        {portalMode === 'resolver' && (
          <div
            className="mt-5 pt-4 border-t text-center text-xs"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            Resolver and Admin accounts are provisioned exclusively by the Chief Administrator.
          </div>
        )}
      </SpotlightCard>

      {/* Quick Demo Access Section */}
      <SpotlightCard className="mt-6 p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h3 className="font-semibold text-xs sm:text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Quick 1-Click Demo Access
          </h3>
        </div>
        <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Instantly provision and test pre-configured accounts with full permission roles without manual setup.
        </p>

        <div className="grid grid-cols-1 gap-2">
          {/* Demo Citizen */}
          <button
            type="button"
            onClick={() => handleDemoLogin('citizen')}
            disabled={loading || demoLoading !== null}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--accent)] active:scale-[0.99]"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
              <div>
                <span className="font-semibold text-xs block leading-tight" style={{ color: 'var(--text-primary)' }}>
                  Demo Citizen
                </span>
                <span className="text-[11px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Report issues & track status
                </span>
              </div>
            </div>
            {demoLoading === 'citizen' ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)' }} />
            ) : (
              <span
                className="text-[10px] font-mono font-medium px-2 py-0.5 rounded border"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                }}
              >
                Access &rarr;
              </span>
            )}
          </button>

          {/* Demo Resolver */}
          <button
            type="button"
            onClick={() => handleDemoLogin('resolver')}
            disabled={loading || demoLoading !== null}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--accent)] active:scale-[0.99]"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs" />
              <div>
                <span className="font-semibold text-xs block leading-tight" style={{ color: 'var(--text-primary)' }}>
                  Demo Resolver
                </span>
                <span className="text-[11px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Roads & Traffic Department Officer
                </span>
              </div>
            </div>
            {demoLoading === 'resolver' ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)' }} />
            ) : (
              <span
                className="text-[10px] font-mono font-medium px-2 py-0.5 rounded border"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                }}
              >
                Access &rarr;
              </span>
            )}
          </button>

          {/* Demo Head */}
          <button
            type="button"
            onClick={() => handleDemoLogin('head')}
            disabled={loading || demoLoading !== null}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--accent)] active:scale-[0.99]"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
              <div>
                <span className="font-semibold text-xs block leading-tight" style={{ color: 'var(--text-primary)' }}>
                  Demo Head (Admin)
                </span>
                <span className="text-[11px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Undeletable Chief Administrator
                </span>
              </div>
            </div>
            {demoLoading === 'head' ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            ) : (
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded border bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                Access &rarr;
              </span>
            )}
          </button>
        </div>
      </SpotlightCard>
    </div>
  );
}
