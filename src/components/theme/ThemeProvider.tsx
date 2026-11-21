'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'alabaster' | 'blueprint' | 'obsidian' | 'pine';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const VALID_THEMES: Theme[] = ['alabaster', 'blueprint', 'obsidian', 'pine'];
const STORAGE_KEY = 'civic-theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('alabaster');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored && VALID_THEMES.includes(stored)) {
        setThemeState(stored);
        document.documentElement.setAttribute('data-theme', stored);
        document.documentElement.dataset.theme = stored;
      } else {
        const current = document.documentElement.getAttribute('data-theme') as Theme | null;
        if (current && VALID_THEMES.includes(current)) {
          setThemeState(current);
        } else {
          document.documentElement.setAttribute('data-theme', 'alabaster');
          document.documentElement.dataset.theme = 'alabaster';
        }
      }
    } catch {
      // Fallback for sandboxed or SSR environments
    }
  }, []);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
      document.documentElement.dataset.theme = nextTheme;
    } catch {
      // Ignore localStorage write failures
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
