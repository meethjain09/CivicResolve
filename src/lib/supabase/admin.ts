import { createClient } from '@supabase/supabase-js';

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
