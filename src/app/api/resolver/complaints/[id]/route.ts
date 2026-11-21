/**
 * @file route.ts
 * API route handler for Department Resolver actions (PATCH /api/resolver/complaints/[id]).
 * Allows resolvers to transition ticket status, add resolution notes, or request department reassignment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEPARTMENTS, TicketStatus, Department, Complaint } from '@/types/database';
import { FIELD_LIMITS, sanitizeTextInput } from '@/lib/validation/complaints';
import { COMPLAINT_COLUMNS, PROFILE_COLUMNS } from '@/lib/supabase/queries';

const PRIVATE_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
};

interface ResolverUpdatePayload {
  updated_at: string;
  status?: TicketStatus;
  resolution_note?: string | null;
  reassignment_requested?: boolean;
  requested_department?: Department | null;
  reassignment_reason?: string | null;
}

/**
 * PATCH /api/resolver/complaints/[id]
 * Updates status and notes for a ticket assigned to the resolver's department,
 * or submits a reassignment request for Chief Admin review.
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

    // 1. Authenticate user
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

    // 2. Verify resolver profile & department assignment
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'resolver' || !profile.department) {
      return NextResponse.json(
        { error: 'Forbidden: Valid resolver profile with assigned department required' },
        { status: 403, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const admin = createAdminClient();

    // 3. Fetch complaint and verify department boundary
    const { data: complaint, error: fetchError } = await admin
      .from('complaints')
      .select<string, Complaint>(COMPLAINT_COLUMNS)
      .eq('id', id)
      .single();

    if (fetchError || !complaint) {
      return NextResponse.json(
        { error: 'Complaint ticket not found' },
        { status: 404, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    if (complaint.department !== profile.department) {
      return NextResponse.json(
        {
          error: `Forbidden: Ticket is assigned to "${complaint.department}", not your department ("${profile.department}")`,
        },
        { status: 403, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    // 4. Parse action payload
    const body = await req.json();
    const { action } = body as { action?: 'update_status' | 'request_reassignment' };

    const updatePayload: ResolverUpdatePayload = {
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
          { status: 400, headers: PRIVATE_CACHE_HEADERS }
        );
      }

      if (resolution_note && resolution_note.trim().length > FIELD_LIMITS.RESOLUTION_NOTE_MAX) {
        return NextResponse.json(
          { error: `Resolution note cannot exceed ${FIELD_LIMITS.RESOLUTION_NOTE_MAX} characters` },
          { status: 400, headers: PRIVATE_CACHE_HEADERS }
        );
      }

      updatePayload.status = status;
      updatePayload.resolution_note = resolution_note
        ? sanitizeTextInput(resolution_note, FIELD_LIMITS.RESOLUTION_NOTE_MAX)
        : null;
    } else if (action === 'request_reassignment') {
      const { requested_department, reassignment_reason } = body as {
        requested_department?: Department;
        reassignment_reason?: string;
      };

      if (!requested_department || !DEPARTMENTS.includes(requested_department)) {
        return NextResponse.json(
          { error: `Target department must be one of: ${DEPARTMENTS.join(', ')}` },
          { status: 400, headers: PRIVATE_CACHE_HEADERS }
        );
      }

      if (requested_department === profile.department) {
        return NextResponse.json(
          { error: 'Cannot request reassignment to your own department' },
          { status: 400, headers: PRIVATE_CACHE_HEADERS }
        );
      }

      if (!reassignment_reason || !reassignment_reason.trim()) {
        return NextResponse.json(
          { error: 'A detailed reason for department reassignment is required' },
          { status: 400, headers: PRIVATE_CACHE_HEADERS }
        );
      }

      const trimmedReason = sanitizeTextInput(
        reassignment_reason,
        FIELD_LIMITS.REASSIGNMENT_REASON_MAX
      );
      if (trimmedReason.length > FIELD_LIMITS.REASSIGNMENT_REASON_MAX) {
        return NextResponse.json(
          { error: `Reassignment reason cannot exceed ${FIELD_LIMITS.REASSIGNMENT_REASON_MAX} characters` },
          { status: 400, headers: PRIVATE_CACHE_HEADERS }
        );
      }

      updatePayload.reassignment_requested = true;
      updatePayload.requested_department = requested_department;
      updatePayload.reassignment_reason = trimmedReason;
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Expected update_status or request_reassignment' },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    // 5. Update complaint
    const { data: updatedComplaint, error: updateError } = await admin
      .from('complaints')
      .update(updatePayload)
      .eq('id', id)
      .select<string, Complaint>(COMPLAINT_COLUMNS)
      .single();

    if (updateError || !updatedComplaint) {
      console.error('Error updating complaint by resolver:', updateError);
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
    console.error('Error in PATCH /api/resolver/complaints/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }
}
