import React from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { Civic3DVisual } from '@/components/ui/Civic3DVisual';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { Building2, ShieldCheck, Sparkles, Workflow, Clock } from 'lucide-react';
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
    <div
      className="min-h-screen relative flex flex-col justify-between transition-colors duration-200"
      style={{
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Top Bar with Brand Badge & Theme Switcher */}
      <header
        className="w-full border-b px-4 sm:px-8 py-3.5 flex items-center justify-between backdrop-blur-md sticky top-0 z-50"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-card) 90%, transparent)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-xs"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
            }}
          >
            <Building2 className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
            CivicResolve
          </span>
          <span className="hidden sm:inline-block opacity-40" style={{ color: 'var(--border-strong)' }}>
            /
          </span>
          <span
            className="hidden sm:inline-block text-[11px] font-mono uppercase tracking-wider font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            Unified Grievance System
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeSwitcher />
        </div>
      </header>

      {/* Main Split-Screen Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[calc(100vh-160px)]">
          {/* Left Column (lg:col-span-7): Architectural Showcase & 3D Visual */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-8">
            <div>
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border mb-4"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Autonomous Municipal Operations</span>
              </div>
              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15]"
                style={{ color: 'var(--text-primary)' }}
              >
                Next-generation civic issues, resolved with precision.
              </h1>
              <p
                className="mt-3 text-sm sm:text-base leading-relaxed max-w-xl"
                style={{ color: 'var(--text-secondary)' }}
              >
                CivicResolve combines multi-model vision AI triage, strict departmental role routing,
                and administrative governance into an auditable public municipal infrastructure.
              </p>
            </div>

            {/* Interactive 3D Isometric Civic Stack */}
            <div className="w-full">
              <Civic3DVisual />
            </div>

            {/* 3 Concise Feature Metrics */}
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div
                className="p-3.5 rounded-xl border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                    Vision AI Triage
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Multi-model fallback chain analyzes photo evidence & descriptions in &lt; 1s.
                </p>
              </div>

              <div
                className="p-3.5 rounded-xl border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Workflow className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                    Role Separation
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Citizens, Department Officers, and Chief Admin operate on distinct RLS boundaries.
                </p>
              </div>

              <div
                className="p-3.5 rounded-xl border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                    Auditable States
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Full lifecycle tracking from ingestion to field dispatch with reassignment protection.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column (lg:col-span-5): Centered Authentication Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <AuthForm />
          </div>
        </div>
      </main>

      {/* Global Footer */}
      <footer
        className="w-full border-t py-4 px-4 sm:px-8 text-center text-xs flex flex-col sm:flex-row items-center justify-between gap-2"
        style={{
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          <span>Enterprise Role-Based Access Control &bull; Supabase RLS Protected</span>
        </div>
        <div className="font-mono text-[10px]">
          CIVICRESOLVE CORE v2.5 &bull; ARCHITECTURAL STACK
        </div>
      </footer>
    </div>
  );
}
