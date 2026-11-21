/**
 * @file client.ts
 * Supabase client factory for Client Components using @supabase/ssr.
 */

import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a browser-compatible Supabase client configured with public environment variables.
 * Automatically synchronizes auth state across client components.
 *
 * @returns Configured Supabase browser client.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
