import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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

describe('Static Architecture & Contracts Test', () => {
  it('ensures zero stray ward property or column references exist anywhere in src/', () => {
    const srcFiles = getFilesRecursively(path.resolve(__dirname, '../src'), ['.ts', '.tsx']);
    expect(srcFiles.length).toBeGreaterThan(15);

    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      // Look for stray .ward or ward: or "ward" in database queries
      expect(content).not.toMatch(/\.ward\b/);
      expect(content).not.toMatch(/['"]ward['"]\s*:/);
      expect(content).not.toMatch(/select\([^)]*\bward\b/);
    }
  });

  it('verifies citizen, resolver, and admin pages export dynamic = "force-dynamic"', () => {
    const citizenPage = fs.readFileSync(path.resolve(__dirname, '../src/app/citizen/page.tsx'), 'utf-8');
    const resolverPage = fs.readFileSync(path.resolve(__dirname, '../src/app/resolver/page.tsx'), 'utf-8');
    const adminPage = fs.readFileSync(path.resolve(__dirname, '../src/app/admin/page.tsx'), 'utf-8');

    expect(citizenPage).toContain("export const dynamic = 'force-dynamic';");
    expect(resolverPage).toContain("export const dynamic = 'force-dynamic';");
    expect(adminPage).toContain("export const dynamic = 'force-dynamic';");
  });

  it('verifies citizen, resolver, and admin pages export valid metadata titles', () => {
    const citizenPage = fs.readFileSync(path.resolve(__dirname, '../src/app/citizen/page.tsx'), 'utf-8');
    const resolverPage = fs.readFileSync(path.resolve(__dirname, '../src/app/resolver/page.tsx'), 'utf-8');
    const adminPage = fs.readFileSync(path.resolve(__dirname, '../src/app/admin/page.tsx'), 'utf-8');

    expect(citizenPage).toContain('title:');
    expect(citizenPage).toContain('Citizen Portal | CivicResolve');

    expect(resolverPage).toContain('title:');
    expect(resolverPage).toContain('Department Operations | CivicResolve');

    expect(adminPage).toContain('title:');
    expect(adminPage).toContain('Chief Admin Command | CivicResolve');
  });

  it('verifies Complaint interface in database.ts requires pincode and has no ward', () => {
    const dtypes = fs.readFileSync(path.resolve(__dirname, '../src/types/database.ts'), 'utf-8');
    expect(dtypes).toContain('pincode: string;');
    expect(dtypes).not.toContain('ward:');
  });

  it('verifies Profile interface in database.ts includes is_protected and role: UserRole', () => {
    const dtypes = fs.readFileSync(path.resolve(__dirname, '../src/types/database.ts'), 'utf-8');
    expect(dtypes).toContain('is_protected: boolean;');
    expect(dtypes).toContain('role: UserRole;');
  });

  it('executes TypeScript typecheck (tsc --noEmit) and asserts clean exit code 0', () => {
    const output = execSync('npx tsc --noEmit', {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
    });
    expect(output).toBe('');
  }, 25000);
});
