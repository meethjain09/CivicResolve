import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'head') {
      return NextResponse.json(
        { error: 'Forbidden: Chief Administrator privileges required' },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const { data: complaints, error } = await admin
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin complaints:', error);
      return NextResponse.json({ error: 'Failed to fetch complaints' }, { status: 500 });
    }

    return NextResponse.json({ complaints: complaints || [] });
  } catch (error: any) {
    console.error('Error in GET /api/admin/complaints:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
