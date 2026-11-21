import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEPARTMENTS, TicketPriority, Department } from '@/types/database';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing complaint ID' }, { status: 400 });
    }

    // 1. Authenticate user & verify Head role
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

    // 2. Fetch existing complaint
    const { data: complaint, error: fetchError } = await admin
      .from('complaints')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !complaint) {
      return NextResponse.json({ error: 'Complaint ticket not found' }, { status: 404 });
    }

    // 3. Parse and execute action
    const body = await req.json();
    const { action } = body as {
      action?: 'manual_triage' | 'resolve_reassignment' | 'reassign';
    };

    if (body?.resolution_note && typeof body.resolution_note === 'string' && body.resolution_note.trim().length > 1500) {
      return NextResponse.json(
        { error: 'Resolution note cannot exceed 1500 characters' },
        { status: 400 }
      );
    }

    if (body?.reassignment_reason && typeof body.reassignment_reason === 'string' && body.reassignment_reason.trim().length > 1000) {
      return NextResponse.json(
        { error: 'Reassignment reason cannot exceed 1000 characters' },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    const validPriorities: TicketPriority[] = ['Low', 'Medium', 'High', 'Critical'];

    if (action === 'manual_triage') {
      const { department, priority, category } = body as {
        department?: Department;
        priority?: TicketPriority;
        category?: string;
      };

      if (!department || !DEPARTMENTS.includes(department)) {
        return NextResponse.json(
          { error: `Department must be one of: ${DEPARTMENTS.join(', ')}` },
          { status: 400 }
        );
      }

      if (!priority || !validPriorities.includes(priority)) {
        return NextResponse.json(
          { error: `Priority must be one of: ${validPriorities.join(', ')}` },
          { status: 400 }
        );
      }

      if (category && category.trim().length > 100) {
        return NextResponse.json(
          { error: 'Category cannot exceed 100 characters' },
          { status: 400 }
        );
      }

      updatePayload.department = department;
      updatePayload.priority = priority;
      if (category && category.trim()) {
        updatePayload.category = category.trim();
      }
      updatePayload.ai_status = 'manual_override';
      updatePayload.reassignment_requested = false;
    } else if (action === 'resolve_reassignment') {
      const { decision, target_department } = body as {
        decision?: 'approve' | 'reject';
        target_department?: Department;
      };

      if (decision !== 'approve' && decision !== 'reject') {
        return NextResponse.json(
          { error: 'Invalid decision. Expected approve or reject' },
          { status: 400 }
        );
      }

      if (decision === 'approve') {
        const nextDepartment = target_department || complaint.requested_department;
        if (!nextDepartment || !DEPARTMENTS.includes(nextDepartment as Department)) {
          return NextResponse.json(
            { error: `Valid destination department is required for approval. Must be one of: ${DEPARTMENTS.join(', ')}` },
            { status: 400 }
          );
        }
        updatePayload.department = nextDepartment;
      }

      // Clear reassignment request flags on both approve and reject
      updatePayload.reassignment_requested = false;
      updatePayload.requested_department = null;
      updatePayload.reassignment_reason = null;
    } else if (action === 'reassign') {
      const { department, priority } = body as {
        department?: Department;
        priority?: TicketPriority;
      };

      if (!department || !DEPARTMENTS.includes(department)) {
        return NextResponse.json(
          { error: `Department must be one of: ${DEPARTMENTS.join(', ')}` },
          { status: 400 }
        );
      }

      updatePayload.department = department;
      if (priority && validPriorities.includes(priority)) {
        updatePayload.priority = priority;
      }
      // Clear any pending reassignments
      updatePayload.reassignment_requested = false;
      updatePayload.requested_department = null;
      updatePayload.reassignment_reason = null;
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Expected manual_triage, resolve_reassignment, or reassign' },
        { status: 400 }
      );
    }

    // 4. Perform update
    const { data: updatedComplaint, error: updateError } = await admin
      .from('complaints')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updatedComplaint) {
      console.error('Error updating complaint by admin:', updateError);
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update complaint' },
        { status: 500 }
      );
    }

    return NextResponse.json({ complaint: updatedComplaint });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/complaints/[id]:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
