import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEPARTMENTS, TicketStatus, Department } from '@/types/database';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing complaint ID' }, { status: 400 });
    }

    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    // 2. Verify resolver profile & department assignment
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'resolver' || !profile.department) {
      return NextResponse.json(
        { error: 'Forbidden: Valid resolver profile with assigned department required' },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    // 3. Fetch complaint and verify department boundary
    const { data: complaint, error: fetchError } = await admin
      .from('complaints')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !complaint) {
      return NextResponse.json({ error: 'Complaint ticket not found' }, { status: 404 });
    }

    if (complaint.department !== profile.department) {
      return NextResponse.json(
        { error: `Forbidden: Ticket is assigned to "${complaint.department}", not your department ("${profile.department}")` },
        { status: 403 }
      );
    }

    // 4. Parse action payload
    const body = await req.json();
    const { action } = body as { action?: 'update_status' | 'request_reassignment' };

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (action === 'update_status') {
      const { status, resolution_note } = body as {
        status?: TicketStatus;
        resolution_note?: string | null;
      };

      const validStatuses: TicketStatus[] = ['Reported', 'In Progress', 'Resolved'];
      if (!status || !validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }

      updatePayload.status = status;
      updatePayload.resolution_note = resolution_note ? resolution_note.trim() : null;
    } else if (action === 'request_reassignment') {
      const { requested_department, reassignment_reason } = body as {
        requested_department?: Department;
        reassignment_reason?: string;
      };

      if (!requested_department || !DEPARTMENTS.includes(requested_department)) {
        return NextResponse.json(
          { error: `Target department must be one of: ${DEPARTMENTS.join(', ')}` },
          { status: 400 }
        );
      }

      if (requested_department === profile.department) {
        return NextResponse.json(
          { error: 'Cannot request reassignment to your own department' },
          { status: 400 }
        );
      }

      if (!reassignment_reason || !reassignment_reason.trim()) {
        return NextResponse.json(
          { error: 'A detailed reason for department reassignment is required' },
          { status: 400 }
        );
      }

      updatePayload.reassignment_requested = true;
      updatePayload.requested_department = requested_department;
      updatePayload.reassignment_reason = reassignment_reason.trim();
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Expected update_status or request_reassignment' },
        { status: 400 }
      );
    }

    // 5. Update complaint
    const { data: updatedComplaint, error: updateError } = await admin
      .from('complaints')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updatedComplaint) {
      console.error('Error updating complaint by resolver:', updateError);
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update complaint' },
        { status: 500 }
      );
    }

    return NextResponse.json({ complaint: updatedComplaint });
  } catch (error: any) {
    console.error('Error in PATCH /api/resolver/complaints/[id]:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
