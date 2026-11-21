export type UserRole = 'citizen' | 'resolver' | 'head';

export type TicketStatus = 'Reported' | 'In Progress' | 'Resolved';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type AiStatus = 'completed' | 'review_pending' | 'manual_override';

export const DEPARTMENTS = [
  'Roads & Infrastructure',
  'Sanitation & Waste',
  'Water & Drainage',
  'Electrical & Streetlights',
  'Parks & Public Safety',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string | null;
  is_protected: boolean;
  created_at: string;
}

export interface Complaint {
  id: string;
  ticket_code: string;
  citizen_id: string;
  title: string;
  description: string;
  address: string;
  pincode: string;
  citizen_category: string | null;
  image_url: string | null;
  ai_status: AiStatus;
  ai_model_used: string | null;
  category: string;
  priority: TicketPriority;
  urgency_reason: string | null;
  ai_summary: string | null;
  image_verified: boolean | null;
  department: string;
  status: TicketStatus;
  resolution_note: string | null;
  reassignment_requested: boolean;
  requested_department: string | null;
  reassignment_reason: string | null;
  created_at: string;
  updated_at: string;
  // Optional join fields for queries
  citizen?: Profile;
}
