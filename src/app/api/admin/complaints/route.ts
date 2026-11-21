/**
 * @file route.ts
 * API route handler for Chief Admin complaint list (GET /api/admin/complaints).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { COMPLAINT_COLUMNS } from '@/lib/supabase/queries';

const PRIVATE_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
};

/**
 * GET /api/admin/complaints
 * Retrieves all municipal complaints for Chief Administrator triage, oversight, and telemetry.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Session missing' },
        { status: 401, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'head') {
      return NextResponse.json(
        { error: 'Forbidden: Chief Administrator privileges required' },
        { status: 403, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const admin = createAdminClient();
    const { data: complaints, error } = await admin
      .from('complaints')
      .select(COMPLAINT_COLUMNS)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin complaints:', error);
      return NextResponse.json(
        { error: 'Failed to fetch complaints' },
        { status: 500, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { complaints: complaints || [] },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/admin/complaints:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }
}
