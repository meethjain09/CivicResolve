import React from 'react';
import Link from 'next/link';
import { Building2, Home } from 'lucide-react';

export const metadata = {
  title: 'Page Not Found | CivicResolve',
  description: 'The requested page could not be located on the CivicResolve portal.',
};

export default function NotFound() {
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
          className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center border shadow-xs"
          style={{
            backgroundColor: 'var(--accent-soft)',
            borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
            color: 'var(--accent)',
          }}
          aria-hidden="true"
        >
          <Building2 className="w-7 h-7" />
        </div>

        <span
          className="text-xs font-mono font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border mb-3 inline-block"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-muted)',
          }}
        >
          404 Error
        </span>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
          Page Not Found
        </h1>

        <p className="text-xs sm:text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          The municipal portal route or grievance record you requested could not be located.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-fg)',
          }}
        >
          <Home className="w-4 h-4" />
          <span>Return to Portal</span>
        </Link>
      </main>
    </div>
  );
}
