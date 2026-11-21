import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Supabase SQL Schema & RLS Contract Tests', () => {
  const schemaPath = path.resolve(__dirname, '../supabase/schema.sql');
  const triggerPath = path.resolve(__dirname, '../supabase/auth_trigger.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  const triggerSql = fs.readFileSync(triggerPath, 'utf-8');

  it('asserts pincode column exists in complaints and ward column is completely removed', () => {
    expect(schemaSql).toMatch(/pincode\s+TEXT\s+NOT\s+NULL/i);
    expect(schemaSql).not.toMatch(/\bward\b/i);
    expect(triggerSql).not.toMatch(/\bward\b/i);
  });

  it('asserts profiles table schema constraints (role, department, is_protected)', () => {
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS public.profiles');
    expect(schemaSql).toMatch(/role\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(role\s+IN\s*\('citizen',\s*'resolver',\s*'head'\)\)/i);
    expect(schemaSql).toMatch(/is_protected\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+FALSE/i);
  });

  it('asserts complaints table constraints (priority, status, ai_status)', () => {
    expect(schemaSql).toContain('CREATE TABLE IF NOT EXISTS public.complaints');
    expect(schemaSql).toMatch(/priority\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'Medium'\s+CHECK\s*\(priority\s+IN\s*\('Low',\s*'Medium',\s*'High',\s*'Critical'\)\)/i);
    expect(schemaSql).toMatch(/status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'Reported'\s+CHECK\s*\(status\s+IN\s*\('Reported',\s*'In Progress',\s*'Resolved'\)\)/i);
    expect(schemaSql).toMatch(/ai_status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'review_pending'\s+CHECK\s*\(ai_status\s+IN\s*\('completed',\s*'review_pending',\s*'manual_override'\)\)/i);
  });

  it('asserts Row Level Security is explicitly enabled on profiles and complaints', () => {
    expect(schemaSql).toMatch(/ALTER\s+TABLE\s+public\.profiles\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY;/i);
    expect(schemaSql).toMatch(/ALTER\s+TABLE\s+public\.complaints\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY;/i);
  });

  it('asserts prevent_protected_profile_delete trigger guards permanent admin accounts', () => {
    expect(schemaSql).toContain('CREATE OR REPLACE FUNCTION public.prevent_protected_profile_delete()');
    expect(schemaSql).toContain('OLD.is_protected = TRUE');
    expect(schemaSql).toContain('RAISE EXCEPTION');
    expect(schemaSql).toMatch(/CREATE\s+TRIGGER\s+trigger_prevent_protected_profile_delete/i);
    expect(schemaSql).toMatch(/BEFORE\s+DELETE\s+ON\s+public\.profiles/i);
  });

  it('asserts security definer helper functions exist to prevent infinite RLS recursion', () => {
    expect(schemaSql).toContain('CREATE OR REPLACE FUNCTION public.current_user_role()');
    expect(schemaSql).toContain('CREATE OR REPLACE FUNCTION public.current_user_department()');
    expect(schemaSql).toContain('SECURITY DEFINER');
  });

  it('asserts automated updated_at timestamp trigger exists on complaints', () => {
    expect(schemaSql).toContain('CREATE OR REPLACE FUNCTION public.handle_updated_at()');
    expect(schemaSql).toMatch(/CREATE\s+TRIGGER\s+set_complaints_updated_at/i);
    expect(schemaSql).toMatch(/BEFORE\s+UPDATE\s+ON\s+public\.complaints/i);
  });

  it('asserts all required role-based RLS policies exist on complaints', () => {
    expect(schemaSql).toContain('CREATE POLICY "Citizens can insert complaints"');
    expect(schemaSql).toContain('CREATE POLICY "Citizens can read own complaints"');
    expect(schemaSql).toContain('CREATE POLICY "Resolvers can read department complaints"');
    expect(schemaSql).toContain('CREATE POLICY "Resolvers can update department complaints"');
    expect(schemaSql).toContain('CREATE POLICY "Head can read all complaints"');
    expect(schemaSql).toContain('CREATE POLICY "Head can update all complaints"');
  });

  it('asserts auth trigger syncs new users to public.profiles safely', () => {
    expect(triggerSql).toContain('CREATE OR REPLACE FUNCTION public.handle_new_auth_user()');
    expect(triggerSql).toContain('INSERT INTO public.profiles');
    expect(triggerSql).toMatch(/CREATE\s+TRIGGER\s+on_auth_user_created/i);
    expect(triggerSql).toMatch(/AFTER\s+INSERT\s+ON\s+auth\.users/i);
  });
});
