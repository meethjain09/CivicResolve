import React from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { ShieldCheck, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Profile } from '@/types/database';

export const metadata = {
  title: 'Sign In | CivicResolve',
  description: 'AI-Powered Citizen Grievance Management and Resolution Platform',
};

export default async function LoginPage() {
  const supabase = await createClient();

  // If already logged in, redirect directly to user's dashboard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      const userProfile = profile as Profile;
      if (userProfile.role === 'citizen') redirect('/citizen');
      if (userProfile.role === 'resolver') redirect('/resolver');
      if (userProfile.role === 'head') redirect('/admin');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 mb-4 ring-4 ring-emerald-500/20">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">CivicResolve</h1>
        <p className="mt-2 text-sm text-slate-300 max-w-sm mx-auto">
          AI-Powered Citizen Grievance Management & Public Service Resolution
        </p>
      </div>

      {/* Main Auth Form Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <AuthForm />
      </div>

      {/* Trust & Security Footer */}
      <div className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>Enterprise Role-Based Access Control &middot; Supabase RLS Protected</span>
      </div>
    </div>
  );
}
