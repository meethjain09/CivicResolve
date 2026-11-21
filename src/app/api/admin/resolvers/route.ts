/**
 * @file route.ts
 * API route handlers for Chief Admin staff management (GET, POST, DELETE /api/admin/resolvers).
 * Enables creating and deleting department resolvers while enforcing undeletable Head account protection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEPARTMENTS, Department } from '@/types/database';
import { PROFILE_COLUMNS } from '@/lib/supabase/queries';
import { sanitizeTextInput } from '@/lib/validation/complaints';

const PRIVATE_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
};

/**
 * Server-side security check: verifies session and confirms
 * the requesting user is a Chief Admin ('head').
 */
async function verifyHeadAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { authorized: false, status: 401, error: 'Unauthorized: Session missing or expired' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'head') {
    return { authorized: false, status: 403, error: 'Forbidden: Chief Administrator privileges required' };
  }

  return { authorized: true, user, profile };
}

/**
 * GET /api/admin/resolvers
 * Fetches all staff accounts (Chief Admin and department resolvers).
 */
export async function GET() {
  try {
    const authCheck = await verifyHeadAdmin();
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const admin = createAdminClient();
    const { data: staff, error: fetchError } = await admin
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .in('role', ['head', 'resolver'])
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching staff profiles:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch staff accounts' },
        { status: 500, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { staff: staff || [] },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/admin/resolvers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/admin/resolvers
 * Provisions a new municipal department resolver account.
 */
export async function POST(req: NextRequest) {
  try {
    const authCheck = await verifyHeadAdmin();
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const rawFullName = typeof body.full_name === 'string' ? body.full_name : '';
    const rawEmail = typeof body.email === 'string' ? body.email : '';
    const rawPassword = typeof body.password === 'string' ? body.password : '';
    const department = body.department as Department | undefined;

    const full_name = sanitizeTextInput(rawFullName, 100);
    const email = rawEmail.trim().toLowerCase();
    const password = rawPassword.trim();

    // Validation
    if (!full_name) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    if (!department || !DEPARTMENTS.includes(department)) {
      return NextResponse.json(
        { error: `Department must be one of: ${DEPARTMENTS.join(', ')}` },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const admin = createAdminClient();

    // Create user in Supabase Auth
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: 'resolver',
        department,
        is_protected: false,
      },
    });

    if (createError || !createData?.user) {
      return NextResponse.json(
        { error: createError?.message || 'Failed to create resolver in authentication system' },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const newUserId = createData.user.id;

    // Upsert into public.profiles
    const { data: resolver, error: profileError } = await admin
      .from('profiles')
      .upsert(
        {
          id: newUserId,
          full_name,
          email,
          role: 'resolver',
          department,
          is_protected: false,
        },
        { onConflict: 'id' }
      )
      .select(PROFILE_COLUMNS)
      .single();

    if (profileError) {
      console.error('Error upserting profile for new resolver:', profileError);
      // Rollback auth user
      await admin.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: 'Failed to create resolver profile' },
        { status: 500, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { resolver },
      { status: 201, headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Error in POST /api/admin/resolvers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }
}

/**
 * DELETE /api/admin/resolvers
 * Removes a resolver account. Rejects deletions of protected Chief Admin accounts.
 */
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await verifyHeadAdmin();
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    let userId = req.nextUrl.searchParams.get('id');

    if (!userId) {
      try {
        const body = (await req.json()) as Record<string, unknown>;
        if (typeof body?.userId === 'string') {
          userId = body.userId;
        }
      } catch {
        // body might be empty
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const admin = createAdminClient();

    // Check target profile
    const { data: targetProfile, error: fetchError } = await admin
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .single();

    if (fetchError || !targetProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    // Protection check: Head and is_protected accounts CANNOT be deleted
    if (targetProfile.is_protected === true || targetProfile.role === 'head') {
      return NextResponse.json(
        { error: 'The default Head account is protected and cannot be deleted.' },
        { status: 403, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    // Delete user from Supabase Auth (cascades to profiles)
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Error deleting user from Auth:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete user account' },
        { status: 500, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    // Ensure profile row is removed
    await admin.from('profiles').delete().eq('id', userId);

    return NextResponse.json(
      { success: true },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Error in DELETE /api/admin/resolvers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }
}
