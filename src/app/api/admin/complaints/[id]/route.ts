/**
 * @file route.ts
 * API route handler for Chief Administrator ticket operations (PATCH /api/admin/complaints/[id]).
 * Supports manual AI override triage, resolving department reassignment requests, and direct reassignment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEPARTMENTS, TicketPriority, Department } from '@/types/database';
import { FIELD_LIMITS, sanitizeTextInput } from '@/lib/validation/complaints';
import { COMPLAINT_COLUMNS } from '@/lib/supabase/queries';

const PRIVATE_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
};

interface AdminUpdatePayload {
  updated_at: string;
  department?: Department | string;
  priority?: TicketPriority;
  category?: string;
  ai_status?: 'completed' | 'review_pending' | 'manual_override';
  reassignment_requested?: boolean;
  requested_department?: Department | null;
  reassignment_reason?: string | null;
}

/**
 * PATCH /api/admin/complaints/[id]
 * Chief Administrator operations: manual triage override, reassignments, and review approval/rejection.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Missing complaint ID' },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    // 1. Authenticate user & verify Head role
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

    // 2. Fetch existing complaint
    const { data: complaint, error: fetchError } = await admin
      .from('complaints')
      .select(COMPLAINT_COLUMNS)
      .eq('id', id)
      .single();

    if (fetchError || !complaint) {
      return NextResponse.json(
        { error: 'Complaint ticket not found' },
        { status: 404, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    // 3. Parse and execute action
    const body = (await req.json()) as Record<string, unknown>;
    const action = body?.action as 'manual_triage' | 'resolve_reassignment' | 'reassign' | undefined;

    if (
      body?.resolution_note &&
      typeof body.resolution_note === 'string' &&
      body.resolution_note.trim().length > FIELD_LIMITS.RESOLUTION_NOTE_MAX
    ) {
      return NextResponse.json(
        { error: `Resolution note cannot exceed ${FIELD_LIMITS.RESOLUTION_NOTE_MAX} characters` },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    if (
      body?.reassignment_reason &&
      typeof body.reassignment_reason === 'string' &&
      body.reassignment_reason.trim().length > FIELD_LIMITS.REASSIGNMENT_REASON_MAX
    ) {
      return NextResponse.json(
        { error: `Reassignment reason cannot exceed ${FIELD_LIMITS.REASSIGNMENT_REASON_MAX} characters` },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const updatePayload: AdminUpdatePayload = {
      updated_at: new Date().toISOString(),
    };

    const validPriorities: TicketPriority[] = ['Low', 'Medium', 'High', 'Critical'];

    if (action === 'manual_triage') {
      const department = body.department as Department | undefined;
      const priority = body.priority as TicketPriority | undefined;
      const category = typeof body.category === 'string' ? body.category : undefined;

      if (!department || !DEPARTMENTS.includes(department)) {
        return NextResponse.json(
          { error: `Department must be one of: ${DEPARTMENTS.join(', ')}` },
          { status: 400, headers: PRIVATE_CACHE_HEADERS }
        );
      }

      if (!priority || !validPriorities.includes(priority)) {
        return NextResponse.json(
          { error: `Priority must be one of: ${validPriorities.join(', ')}` },
          { status: 400, headers: PRIVATE_CACHE_HEADERS }
        );
      }

      if (category && category.trim().length > FIELD_LIMITS.CATEGORY_MAX) {
        return NextResponse.json(
          { error: `Category cannot exceed ${FIELD_LIMITS.CATEGORY_MAX} characters` },
          { status: 400, headers: PRIVATE_CACHE_HEADERS }
        );
      }

      updatePayload.department = department;
      updatePayload.priority = priority;
      if (category && category.trim()) {
        updatePayload.category = sanitizeTextInput(category, FIELD_LIMITS.CATEGORY_MAX);
      }
      updatePayload.ai_status = 'manual_override';
      updatePayload.reassignment_requested = false;
    } else if (action === 'resolve_reassignment') {
      const decision = body.decision as 'approve' | 'reject' | undefined;
      const targetDepartment = body.target_department as Department | undefined;

      if (decision !== 'approve' && decision !== 'reject') {
        return NextResponse.json(
          { error: 'Invalid decision. Expected approve or reject' },
          { status: 400, headers: PRIVATE_CACHE_HEADERS }
        );
      }

      if (decision === 'approve') {
        const nextDepartment = targetDepartment || complaint.requested_department;
        if (!nextDepartment || !DEPARTMENTS.includes(nextDepartment as Department)) {
          return NextResponse.json(
            {
              error: `Valid destination department is required for approval. Must be one of: ${DEPARTMENTS.join(', ')}`,
            },
            { status: 400, headers: PRIVATE_CACHE_HEADERS }
          );
        }
        updatePayload.department = nextDepartment;
      }

      // Clear reassignment request flags on both approve and reject
      updatePayload.reassignment_requested = false;
      updatePayload.requested_department = null;
      updatePayload.reassignment_reason = null;
    } else if (action === 'reassign') {
      const department = body.department as Department | undefined;
      const priority = body.priority as TicketPriority | undefined;

      if (!department || !DEPARTMENTS.includes(department)) {
        return NextResponse.json(
          { error: `Department must be one of: ${DEPARTMENTS.join(', ')}` },
          { status: 400, headers: PRIVATE_CACHE_HEADERS }
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
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    // 4. Perform update
    const { data: updatedComplaint, error: updateError } = await admin
      .from('complaints')
      .update(updatePayload)
      .eq('id', id)
      .select(COMPLAINT_COLUMNS)
      .single();

    if (updateError || !updatedComplaint) {
      console.error('Error updating complaint by admin:', updateError);
      return NextResponse.json(
        { error: 'Failed to update complaint' },
        { status: 500, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { complaint: updatedComplaint },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Error in PATCH /api/admin/complaints/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }
}
