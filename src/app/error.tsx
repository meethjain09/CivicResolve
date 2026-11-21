'use client';

import React, { useEffect } from 'react';
import { RippleButton } from '@/components/ui/RippleButton';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log unexpected errors internally for diagnostic monitoring
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 transition-colors duration-200"
      style={{
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
      }}
    >
      <main
        id="main-content"
        className="w-full max-w-md p-6 sm:p-8 rounded-2xl border shadow-xl text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div
          className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-rose-500/10 text-rose-500 border border-rose-500/20"
          aria-hidden="true"
        >
          <AlertCircle className="w-7 h-7" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
          Something went wrong
        </h1>

        <p className="text-xs sm:text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          An unexpected issue interrupted your operation. Our system has safely recorded the incident. You can retry the action or return to the portal.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <RippleButton
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </RippleButton>

          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            <Home className="w-4 h-4" />
            <span>Return to Login</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
