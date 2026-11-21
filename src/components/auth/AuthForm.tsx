'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserRole, Profile } from '@/types/database';
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
} from 'lucide-react';

export function AuthForm() {
  const router = useRouter();
  const supabase = createClient();

  const [portalMode, setPortalMode] = useState<'citizen' | 'resolver'>('citizen');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

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
    <div className="w-full max-w-md mx-auto">
      {/* Portal Mode Toggle */}
      <div className="grid grid-cols-2 p-1.5 mb-6 bg-slate-100 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => resetFormState('citizen')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
            portalMode === 'citizen'
              ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4" />
          Citizen Portal
        </button>

        <button
          type="button"
          onClick={() => resetFormState('resolver')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
            portalMode === 'resolver'
              ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Resolver / Admin
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-slate-900">
              {portalMode === 'citizen'
                ? authMode === 'signin'
                  ? 'Citizen Sign In'
                  : 'Create Citizen Account'
                : 'Officer & Admin Sign In'}
            </h2>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                portalMode === 'citizen'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}
            >
              {portalMode === 'citizen' ? 'Public Access' : 'Official Portal'}
            </span>
          </div>

          <p className="text-sm text-slate-500">
            {portalMode === 'citizen'
              ? authMode === 'signin'
                ? 'Report civic problems, monitor progress, and track resolution.'
                : 'Sign up to submit and follow issues in your neighborhood.'
              : 'Authorized department resolvers and Chief Administrator only.'}
          </p>
        </div>

        {/* Verification banner */}
        {verificationNotice && (
          <div className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3 text-sm text-blue-800">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Verification Email Sent</p>
              <p className="mt-0.5">{verificationNotice}</p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {errorMsg && (
          <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-sm text-rose-800">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-900">Authentication Alert</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {portalMode === 'citizen' && authMode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  portalMode === 'citizen' ? 'you@example.com' : 'officer@civicresolve.gov'
                }
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                  portalMode === 'citizen'
                    ? 'focus:ring-emerald-500 focus:border-emerald-500'
                    : 'focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                  portalMode === 'citizen'
                    ? 'focus:ring-emerald-500 focus:border-emerald-500'
                    : 'focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || demoLoading !== null}
            className={`w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
              portalMode === 'citizen'
                ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-200'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <span>
                  {portalMode === 'citizen'
                    ? authMode === 'signin'
                      ? 'Sign In as Citizen'
                      : 'Create Account'
                    : 'Sign In as Officer'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle between Sign In and Sign Up (Citizen mode only) */}
        {portalMode === 'citizen' && (
          <div className="mt-5 pt-4 border-t border-slate-100 text-center text-sm text-slate-600">
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
                  className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
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
                  className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        )}

        {portalMode === 'resolver' && (
          <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Resolver accounts are provisioned exclusively by the Chief Administrator.
          </div>
        )}
      </div>

      {/* Quick Demo Access Section */}
      <div className="mt-8 bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-base text-slate-100">Quick 1-Click Demo Access</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Instantly provision and sign in with pre-configured accounts without manual setup or email confirmation.
        </p>

        <div className="grid grid-cols-1 gap-2.5">
          <button
            type="button"
            onClick={() => handleDemoLogin('citizen')}
            disabled={loading || demoLoading !== null}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-left text-sm transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div>
                <span className="font-semibold text-slate-200">Demo Citizen</span>
                <span className="text-xs text-slate-400 block">Report issues & track status</span>
              </div>
            </div>
            {demoLoading === 'citizen' ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <span className="text-xs bg-emerald-950/80 text-emerald-300 px-2 py-1 rounded border border-emerald-800/60 font-medium">
                Enter &rarr;
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleDemoLogin('resolver')}
            disabled={loading || demoLoading !== null}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-left text-sm transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              <div>
                <span className="font-semibold text-slate-200">Demo Resolver</span>
                <span className="text-xs text-slate-400 block">Roads & Infrastructure Officer</span>
              </div>
            </div>
            {demoLoading === 'resolver' ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            ) : (
              <span className="text-xs bg-indigo-950/80 text-indigo-300 px-2 py-1 rounded border border-indigo-800/60 font-medium">
                Enter &rarr;
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleDemoLogin('head')}
            disabled={loading || demoLoading !== null}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-left text-sm transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div>
                <span className="font-semibold text-slate-200">Demo Head (Admin)</span>
                <span className="text-xs text-slate-400 block">Undeletable Chief Administrator</span>
              </div>
            </div>
            {demoLoading === 'head' ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <span className="text-xs bg-amber-950/80 text-amber-300 px-2 py-1 rounded border border-amber-800/60 font-medium">
                Enter &rarr;
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
