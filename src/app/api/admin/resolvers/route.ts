import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEPARTMENTS, Department } from '@/types/database';

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

// GET: Fetch all staff accounts (head & resolver)
export async function GET() {
  try {
    const authCheck = await verifyHeadAdmin();
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const admin = createAdminClient();
    const { data: staff, error: fetchError } = await admin
      .from('profiles')
      .select('*')
      .in('role', ['head', 'resolver'])
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching staff profiles:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch staff accounts' }, { status: 500 });
    }

    return NextResponse.json({ staff: staff || [] });
  } catch (error: any) {
    console.error('Error in GET /api/admin/resolvers:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new department resolver
export async function POST(req: NextRequest) {
  try {
    const authCheck = await verifyHeadAdmin();
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json();
    const { full_name, email, password, department } = body as {
      full_name?: string;
      email?: string;
      password?: string;
      department?: Department;
    };

    // Validation
    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    if (!department || !DEPARTMENTS.includes(department)) {
      return NextResponse.json(
        { error: `Department must be one of: ${DEPARTMENTS.join(', ')}` },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Create user in Supabase Auth
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        role: 'resolver',
        department,
        is_protected: false,
      },
    });

    if (createError || !createData?.user) {
      return NextResponse.json(
        { error: createError?.message || 'Failed to create resolver in authentication system' },
        { status: 400 }
      );
    }

    const newUserId = createData.user.id;

    // Upsert into public.profiles
    const { data: resolver, error: profileError } = await admin
      .from('profiles')
      .upsert(
        {
          id: newUserId,
          full_name: full_name.trim(),
          email: email.trim().toLowerCase(),
          role: 'resolver',
          department,
          is_protected: false,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    if (profileError) {
      console.error('Error upserting profile for new resolver:', profileError);
      // Rollback auth user
      await admin.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: `Failed to create resolver profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ resolver }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/admin/resolvers:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove a resolver account
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await verifyHeadAdmin();
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    // Read userId from URL param or body
    let userId = req.nextUrl.searchParams.get('id');

    if (!userId) {
      try {
        const body = await req.json();
        userId = body?.userId;
      } catch {
        // body might be empty
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check target profile
    const { data: targetProfile, error: fetchError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !targetProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Protection check: Head and is_protected accounts CANNOT be deleted
    if (targetProfile.is_protected === true || targetProfile.role === 'head') {
      return NextResponse.json(
        { error: 'The default Head account is protected and cannot be deleted.' },
        { status: 403 }
      );
    }

    // Delete user from Supabase Auth (cascades to profiles)
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Error deleting user from Auth:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Ensure profile row is removed
    await admin.from('profiles').delete().eq('id', userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/resolvers:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
