'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, Theme } from './ThemeProvider';
import { Check, ChevronDown, Palette } from 'lucide-react';

interface ThemeOption {
  id: Theme;
  name: string;
  subtitle: string;
  swatchAccent: string;
  swatchBg: string;
  swatchBorder: string;
}

const THEMES: ThemeOption[] = [
  {
    id: 'alabaster',
    name: 'Alabaster',
    subtitle: 'Civic Paper Light',
    swatchAccent: '#0D6E5B',
    swatchBg: '#F7F6F2',
    swatchBorder: 'rgba(17, 19, 21, 0.18)',
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    subtitle: 'Swiss Cobalt Light',
    swatchAccent: '#2563EB',
    swatchBg: '#F3F6FB',
    swatchBorder: 'rgba(15, 23, 42, 0.18)',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    subtitle: 'Linear Carbon Dark',
    swatchAccent: '#38BDF8',
    swatchBg: '#06070A',
    swatchBorder: 'rgba(255, 255, 255, 0.16)',
  },
  {
    id: 'pine',
    name: 'Midnight Pine',
    subtitle: 'Nocturne Emerald Dark',
    swatchAccent: '#10B981',
    swatchBg: '#040B09',
    swatchBorder: 'rgba(52, 211, 153, 0.24)',
  },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Toggle theme selection"
        className="group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)] hover:-translate-y-0.5 hover:shadow-xs active:scale-95"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <span
          className="w-3.5 h-3.5 rounded-full flex items-center justify-center border shadow-xs transition-transform group-hover:scale-110"
          style={{
            backgroundColor: currentTheme.swatchBg,
            borderColor: currentTheme.swatchBorder,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: currentTheme.swatchAccent }}
          />
        </span>
        <span className="hidden sm:inline font-medium tracking-tight">
          {currentTheme.name}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 opacity-60 group-hover:opacity-100 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl z-50 p-1.5 focus:outline-none transition-all duration-150 border animate-in fade-in zoom-in-95"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <div
            className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider font-semibold opacity-60 flex items-center gap-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            <Palette className="w-3 h-3" />
            <span>Theme Preset</span>
          </div>

          <div className="space-y-0.5 mt-1">
            {THEMES.map((opt) => {
              const isSelected = opt.id === theme;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer group ${
                    isSelected ? 'font-semibold' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'var(--accent-soft)' : 'transparent',
                    color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center border shadow-xs"
                      style={{
                        backgroundColor: opt.swatchBg,
                        borderColor: opt.swatchBorder,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: opt.swatchAccent }}
                      />
                    </span>
                    <div>
                      <div className="leading-snug">{opt.name}</div>
                      <div
                        className="text-[10px] opacity-70"
                        style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }}
                      >
                        {opt.subtitle}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: 'var(--accent)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
