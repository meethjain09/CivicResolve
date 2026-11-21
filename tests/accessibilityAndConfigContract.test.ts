import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { GET as getHealth } from '@/app/api/health/route';

describe('Accessibility (WCAG 2.1 AA) and Configuration Contracts', () => {
  it('verifies root layout provides an accessible skip link targeting #main-content', () => {
    const layoutPath = path.resolve(__dirname, '../src/app/layout.tsx');
    const content = fs.readFileSync(layoutPath, 'utf-8');

    expect(content).toMatch(/href="#main-content"/i);
    expect(content).toContain('Skip to main content');
  });

  it('verifies all dashboard and core application pages implement the <main id="main-content"> landmark', () => {
    const targetPages = [
      '../src/app/login/page.tsx',
      '../src/app/citizen/page.tsx',
      '../src/app/resolver/page.tsx',
      '../src/app/admin/page.tsx',
      '../src/app/error.tsx',
      '../src/app/not-found.tsx',
      '../src/app/loading.tsx',
    ];

    for (const pageRel of targetPages) {
      const pagePath = path.resolve(__dirname, pageRel);
      const content = fs.readFileSync(pagePath, 'utf-8');
      expect(content, `Missing main-content landmark in ${pageRel}`).toMatch(/id="main-content"/);
    }
  });

  it('verifies globals.css includes prefers-reduced-motion and focus-visible accessibility rules', () => {
    const cssPath = path.resolve(__dirname, '../src/app/globals.css');
    const content = fs.readFileSync(cssPath, 'utf-8');

    expect(content).toContain('prefers-reduced-motion: reduce');
    expect(content).toContain(':focus-visible');
    expect(content).toContain('outline: 2px solid var(--accent)');
  });

  it('verifies modal components implement ARIA dialog semantics and Escape key listener', () => {
    const modalPath = path.resolve(__dirname, '../src/components/resolver/ReassignModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf-8');

    expect(content).toContain('role="dialog"');
    expect(content).toContain('aria-modal="true"');
    expect(content).toContain("e.key === 'Escape'");
  });

  it('asserts zero unprojected select(*) queries exist under src/app/ to prevent payload overfetching', () => {
    function getFilesRecursively(dir: string, extensions: string[]): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results = results.concat(getFilesRecursively(fullPath, extensions));
        } else if (extensions.some((ext) => fullPath.endsWith(ext))) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const appFiles = getFilesRecursively(path.resolve(__dirname, '../src/app'), ['.ts', '.tsx']);
    for (const file of appFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content, `Unprojected select(*) found in ${file}`).not.toMatch(/\.select\(['"]\*['"]\)/);
    }
  });

  it('verifies .env.example exists and contains no leaked private secrets', () => {
    const envExamplePath = path.resolve(__dirname, '../.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);

    const content = fs.readFileSync(envExamplePath, 'utf-8');
    expect(content).toContain('NEXT_PUBLIC_SUPABASE_URL=');
    expect(content).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY=');
    expect(content).toContain('SUPABASE_SERVICE_ROLE_KEY=');
    expect(content).toContain('GEMINI_API_KEY=');

    // Ensure dummy placeholders are used
    expect(content).toContain('your-supabase-project-url');
    expect(content).toContain('your-gemini-api-key');
    expect(content).not.toMatch(/eyJhbGciOi/); // No JWT tokens
  });

  it('verifies GET /api/health returns 200 OK with expected JSON structure and private cache headers', async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.service).toBe('CivicResolve');
    expect(json.timestamp).toBeDefined();

    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });
});
