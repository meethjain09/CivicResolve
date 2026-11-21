import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <main
      id="main-content"
      role="status"
      aria-live="polite"
      className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-200"
      style={{
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: 'var(--accent)' }}
          aria-hidden="true"
        />
        <p className="text-xs font-mono uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>
          Loading CivicResolve...
        </p>
      </div>
      <span className="sr-only">Loading page content, please wait...</span>
    </main>
  );
}
