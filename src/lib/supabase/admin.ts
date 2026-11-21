/**
 * @file admin.ts
 * Privileged Supabase Admin client factory using service-role secrets.
 * Must only be invoked from secure server-side environments (Route Handlers, background workers).
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Creates a privileged Supabase Admin client configured with the service role key.
 * Bypasses Row Level Security (RLS) for server-side operations such as AI triage updates,
 * admin user management, and secure complaints insertion.
 *
 * @returns Configured Supabase Admin client.
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL are missing.
 */
export function createAdminClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawKey || !rawKey.trim()) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  if (!rawUrl || !rawUrl.trim()) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  }

  const supabaseUrl = rawUrl.trim().replace(/\/+$/, '');
  const serviceRoleKey = rawKey.trim();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
