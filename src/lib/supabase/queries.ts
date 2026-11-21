/**
 * @file queries.ts
 * Explicit column projection constants for Supabase queries.
 * Eliminates SELECT * to ensure minimal network overhead and bounded payload sizes.
 */

/**
 * Comma-separated list of all columns in the public.profiles table.
 */
export const PROFILE_COLUMNS =
  'id, full_name, email, role, department, is_protected, created_at' as const;

/**
 * Comma-separated list of all persistent columns in the public.complaints table.
 */
export const COMPLAINT_COLUMNS =
  'id, ticket_code, citizen_id, title, description, address, pincode, citizen_category, image_url, ai_status, ai_model_used, category, priority, urgency_reason, ai_summary, image_verified, department, status, resolution_note, reassignment_requested, requested_department, reassignment_reason, created_at, updated_at' as const;

/**
 * Comma-separated list of complaint columns joined with citizen profile metadata.
 */
export const COMPLAINT_WITH_CITIZEN_COLUMNS =
  'id, ticket_code, citizen_id, title, description, address, pincode, citizen_category, image_url, ai_status, ai_model_used, category, priority, urgency_reason, ai_summary, image_verified, department, status, resolution_note, reassignment_requested, requested_department, reassignment_reason, created_at, updated_at, citizen:profiles!citizen_id(id, full_name, email, role, department, is_protected, created_at)' as const;
