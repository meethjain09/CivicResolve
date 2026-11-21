import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import nextConfig from '../next.config';

// Helper to recursively collect files with specific extensions
function getFilesRecursively(dir: string, extensions: string[]): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        files.push(...getFilesRecursively(fullPath, extensions));
      }
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('CivicResolve Security Audit Contract', () => {
  describe('Zero Client Secrets Exposure', () => {
    it('ensures zero client-side components reference SUPABASE_SERVICE_ROLE_KEY', () => {
      const srcFiles = getFilesRecursively(path.resolve(__dirname, '../src'), ['.tsx', '.ts']);
      const clientFiles = srcFiles.filter((filePath) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        return content.includes("'use client'") || content.includes('"use client"');
      });

      expect(clientFiles.length).toBeGreaterThan(5);

      for (const file of clientFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      }
    });

    it('ensures zero client-side components reference GEMINI_API_KEY', () => {
      const srcFiles = getFilesRecursively(path.resolve(__dirname, '../src'), ['.tsx', '.ts']);
      const clientFiles = srcFiles.filter((filePath) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        return content.includes("'use client'") || content.includes('"use client"');
      });

      for (const file of clientFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).not.toContain('GEMINI_API_KEY');
      }
    });

    it('ensures zero client-side components reference HEAD_ADMIN_PASSWORD', () => {
      const srcFiles = getFilesRecursively(path.resolve(__dirname, '../src'), ['.tsx', '.ts']);
      for (const file of srcFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).not.toContain('HEAD_ADMIN_PASSWORD');
      }
    });
  });

  describe('HTTP Security Headers Contract (next.config.ts)', () => {
    it('configures security headers for all routes', async () => {
      expect(nextConfig.headers).toBeDefined();
      const headersConfig = await nextConfig.headers!();
      expect(headersConfig).toHaveLength(1);
      expect(headersConfig[0].source).toBe('/:path*');
    });

    it('enforces X-Frame-Options: DENY against clickjacking', async () => {
      const headersConfig = await nextConfig.headers!();
      const header = headersConfig[0].headers.find((h) => h.key === 'X-Frame-Options');
      expect(header).toBeDefined();
      expect(header?.value).toBe('DENY');
    });

    it('enforces X-Content-Type-Options: nosniff against MIME confusion', async () => {
      const headersConfig = await nextConfig.headers!();
      const header = headersConfig[0].headers.find((h) => h.key === 'X-Content-Type-Options');
      expect(header).toBeDefined();
      expect(header?.value).toBe('nosniff');
    });

    it('enforces Referrer-Policy: strict-origin-when-cross-origin', async () => {
      const headersConfig = await nextConfig.headers!();
      const header = headersConfig[0].headers.find((h) => h.key === 'Referrer-Policy');
      expect(header).toBeDefined();
      expect(header?.value).toBe('strict-origin-when-cross-origin');
    });

    it('enforces Strict-Transport-Security (HSTS) with max-age and subdomains', async () => {
      const headersConfig = await nextConfig.headers!();
      const header = headersConfig[0].headers.find((h) => h.key === 'Strict-Transport-Security');
      expect(header).toBeDefined();
      expect(header?.value).toContain('max-age=63072000');
      expect(header?.value).toContain('includeSubDomains');
    });

    it('enforces Permissions-Policy restricting camera and microphone', async () => {
      const headersConfig = await nextConfig.headers!();
      const header = headersConfig[0].headers.find((h) => h.key === 'Permissions-Policy');
      expect(header).toBeDefined();
      expect(header?.value).toContain('camera=()');
      expect(header?.value).toContain('microphone=()');
      expect(header?.value).toContain('geolocation=(self)');
    });
  });

  describe('Server-Side Authentication Security Standards', () => {
    it('verifies that server auth helpers and API routes call getUser() and never trust getSession() alone', () => {
      const apiFiles = getFilesRecursively(path.resolve(__dirname, '../src/app/api'), ['.ts']);
      const authHelper = path.resolve(__dirname, '../src/lib/auth.ts');
      const allServerFiles = [...apiFiles, authHelper];

      expect(allServerFiles.length).toBeGreaterThan(5);

      for (const file of allServerFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('supabase.auth')) {
          expect(content).toContain('.getUser()');
          expect(content).not.toContain('.getSession()');
        }
      }
    });
  });

  describe('SSRF Guard in retry-ai route', () => {
    it('verifies retry-ai enforces strict origin and path boundaries on image URLs', () => {
      const retryAiPath = path.resolve(__dirname, '../src/app/api/admin/retry-ai/route.ts');
      const content = fs.readFileSync(retryAiPath, 'utf-8');

      // SSRF guard checks present in source
      expect(content).toContain("parsedUrl.protocol === 'https:'");
      expect(content).toContain('parsedUrl.origin === expectedOrigin');
      expect(content).toContain('parsedUrl.pathname.startsWith');
      expect(content).toContain('/storage/v1/object/public/complaint-images/');
    });
  });

  describe('Reverse Geocode and Demo Auth Rate Limiting', () => {
    it('verifies reverse geocode route requires auth and enforces 20 req/min rate limit', () => {
      const geocodePath = path.resolve(__dirname, '../src/app/api/geocode/reverse/route.ts');
      const content = fs.readFileSync(geocodePath, 'utf-8');

      expect(content).toContain('supabase.auth.getUser()');
      expect(content).toContain('isUserGeocodeRateLimited');
      expect(content).toContain('status: 429');
    });

    it('verifies demo setup route enforces IP rate limit and uses isolated demo credentials', () => {
      const demoSetupPath = path.resolve(__dirname, '../src/app/api/auth/demo-setup/route.ts');
      const content = fs.readFileSync(demoSetupPath, 'utf-8');

      expect(content).toContain('isIpRateLimited');
      expect(content).toContain('status: 429');
      expect(content).toContain('demo.head@civicresolve.gov');
      expect(content).toContain('demo.resolver@civicresolve.gov');
      expect(content).toContain('demo.citizen@civicresolve.gov');
    });
  });
});
