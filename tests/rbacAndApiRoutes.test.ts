import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Hoisted mock state
const mockGetUser = vi.fn();
const mockProfileSelect = vi.fn();
const mockComplaintSelect = vi.fn();
const mockComplaintInsert = vi.fn();
const mockComplaintUpdate = vi.fn();
const mockStorageUpload = vi.fn();
const mockAfter = vi.fn();

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return {
    ...actual,
    after: (fn: () => void | Promise<void>) => mockAfter(fn),
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: mockProfileSelect,
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    },
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockImplementation(() => ({
    storage: {
      listBuckets: vi.fn().mockResolvedValue({ data: [{ name: 'complaint-images' }] }),
      from: vi.fn().mockReturnValue({
        upload: mockStorageUpload.mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/complaint-images/test.jpg' } }),
      }),
    },
    from: (table: string) => {
      if (table === 'complaints') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: mockComplaintSelect,
          insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => ({
            select: vi.fn().mockReturnValue({
              single: () => mockComplaintInsert(payload),
            }),
          })),
          update: vi.fn().mockImplementation((payload: Record<string, unknown>) => ({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: () => mockComplaintUpdate(payload),
              }),
            }),
          })),
        };
      }
      return {};
    },
  })),
}));

// Mock Gemini triage module so background after() doesn't call real API
vi.mock('@/lib/gemini/triage', () => ({
  analyzeComplaintWithGemini: vi.fn().mockResolvedValue({
    ai_status: 'completed',
    category: 'Road Damage',
    department: 'Roads & Infrastructure',
    priority: 'High',
    urgency_reason: 'Major road hazard.',
    ai_summary: 'Asphalt patching needed.',
    image_verified: true,
  }),
}));

import { POST as postComplaint } from '@/app/api/complaints/route';
import { PATCH as patchResolverComplaint } from '@/app/api/resolver/complaints/[id]/route';
import { PATCH as patchAdminComplaint } from '@/app/api/admin/complaints/[id]/route';

describe('RBAC and API Route Handler Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/complaints (Citizen Submission)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'No session' } });

      const formData = new FormData();
      formData.append('title', 'Pothole on Main St');

      const req = new NextRequest('http://localhost:3000/api/complaints', {
        method: 'POST',
        body: formData,
      });

      const res = await postComplaint(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('Unauthorized');
    });

    it('rejects missing required fields with 400', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'citizen-123' } }, error: null });

      const formData = new FormData();
      formData.append('title', ''); // Empty title

      const req = new NextRequest('http://localhost:3000/api/complaints', {
        method: 'POST',
        body: formData,
      });

      const res = await postComplaint(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('title is required');
    });

    it('rejects invalid 6-digit pincode with 400', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'citizen-123' } }, error: null });

      const formData = new FormData();
      formData.append('title', 'Water leak');
      formData.append('description', 'Pipe broke');
      formData.append('address', '100 River St');
      formData.append('pincode', '56001'); // 5 digits instead of 6

      const req = new NextRequest('http://localhost:3000/api/complaints', {
        method: 'POST',
        body: formData,
      });

      const res = await postComplaint(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Invalid pincode format');
    });

    it('rejects oversized title (>150 chars) with 400', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'citizen-123' } }, error: null });

      const formData = new FormData();
      formData.append('title', 'T'.repeat(151));
      formData.append('description', 'Valid description');
      formData.append('address', 'Valid street address');
      formData.append('pincode', '560001');

      const req = new NextRequest('http://localhost:3000/api/complaints', {
        method: 'POST',
        body: formData,
      });

      const res = await postComplaint(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('title cannot exceed 150 characters');
    });

    it('accepts valid complaint, saves with review_pending, and schedules background triage', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'citizen-123' } }, error: null });

      mockComplaintInsert.mockImplementationOnce((payload: Record<string, unknown>) => ({
        data: {
          id: 'complaint-abc',
          ticket_code: payload.ticket_code,
          citizen_id: 'citizen-123',
          title: payload.title,
          status: 'Reported',
          ai_status: 'review_pending',
        },
        error: null,
      }));

      const formData = new FormData();
      formData.append('title', 'Large crater on 5th Ave');
      formData.append('description', 'Vehicles are getting stuck.');
      formData.append('address', '5th Avenue Corner');
      formData.append('pincode', '560001');

      const req = new NextRequest('http://localhost:3000/api/complaints', {
        method: 'POST',
        body: formData,
      });

      const res = await postComplaint(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.complaint).toBeDefined();
      expect(json.complaint.ticket_code).toMatch(/^CR-[A-Z0-9]{6}$/);
      expect(json.complaint.ai_status).toBe('review_pending');
      expect(mockAfter).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /api/resolver/complaints/[id] (Resolver Workflow)', () => {
    it('blocks unauthenticated resolver requests with 401', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Missing' } });

      const req = new NextRequest('http://localhost:3000/api/resolver/complaints/c-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'update_status', status: 'In Progress' }),
      });

      const res = await patchResolverComplaint(req, { params: Promise.resolve({ id: 'c-1' }) });
      expect(res.status).toBe(401);
    });

    it('blocks non-resolver profiles with 403', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-citizen' } }, error: null });
      mockProfileSelect.mockResolvedValueOnce({
        data: { id: 'u-citizen', role: 'citizen', department: null },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/api/resolver/complaints/c-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'update_status', status: 'In Progress' }),
      });

      const res = await patchResolverComplaint(req, { params: Promise.resolve({ id: 'c-1' }) });
      expect(res.status).toBe(403);
    });

    it('blocks cross-department resolver updating tickets outside their jurisdiction with 403', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-roads' } }, error: null });
      mockProfileSelect.mockResolvedValueOnce({
        data: { id: 'u-roads', role: 'resolver', department: 'Roads & Infrastructure' },
        error: null,
      });
      // Ticket belongs to Sanitation, not Roads
      mockComplaintSelect.mockResolvedValueOnce({
        data: { id: 'c-1', department: 'Sanitation & Waste' },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/api/resolver/complaints/c-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'update_status', status: 'In Progress' }),
      });

      const res = await patchResolverComplaint(req, { params: Promise.resolve({ id: 'c-1' }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('not your department');
    });

    it('allows same-department resolver to advance status with resolution note', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-roads' } }, error: null });
      mockProfileSelect.mockResolvedValueOnce({
        data: { id: 'u-roads', role: 'resolver', department: 'Roads & Infrastructure' },
        error: null,
      });
      mockComplaintSelect.mockResolvedValueOnce({
        data: { id: 'c-1', department: 'Roads & Infrastructure', status: 'Reported' },
        error: null,
      });
      mockComplaintUpdate.mockImplementationOnce((payload: Record<string, unknown>) => ({
        data: { id: 'c-1', status: payload.status, resolution_note: payload.resolution_note },
        error: null,
      }));

      const req = new NextRequest('http://localhost:3000/api/resolver/complaints/c-1', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'update_status',
          status: 'Resolved',
          resolution_note: 'Asphalt patched and steamrolled.',
        }),
      });

      const res = await patchResolverComplaint(req, { params: Promise.resolve({ id: 'c-1' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.complaint.status).toBe('Resolved');
      expect(json.complaint.resolution_note).toBe('Asphalt patched and steamrolled.');
    });

    it('allows resolver to request department reassignment', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-roads' } }, error: null });
      mockProfileSelect.mockResolvedValueOnce({
        data: { id: 'u-roads', role: 'resolver', department: 'Roads & Infrastructure' },
        error: null,
      });
      mockComplaintSelect.mockResolvedValueOnce({
        data: { id: 'c-1', department: 'Roads & Infrastructure' },
        error: null,
      });
      mockComplaintUpdate.mockImplementationOnce((payload: Record<string, unknown>) => ({
        data: {
          id: 'c-1',
          reassignment_requested: payload.reassignment_requested,
          requested_department: payload.requested_department,
          reassignment_reason: payload.reassignment_reason,
        },
        error: null,
      }));

      const req = new NextRequest('http://localhost:3000/api/resolver/complaints/c-1', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'request_reassignment',
          requested_department: 'Water & Drainage',
          reassignment_reason: 'Underlying cause is an underground ruptured pipe.',
        }),
      });

      const res = await patchResolverComplaint(req, { params: Promise.resolve({ id: 'c-1' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.complaint.reassignment_requested).toBe(true);
      expect(json.complaint.requested_department).toBe('Water & Drainage');
    });
  });

  describe('PATCH /api/admin/complaints/[id] (Chief Admin Adjudication)', () => {
    it('blocks non-head users with 403', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-resolver' } }, error: null });
      mockProfileSelect.mockResolvedValueOnce({
        data: { id: 'u-resolver', role: 'resolver' },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/api/admin/complaints/c-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'manual_triage', department: 'Roads & Infrastructure', priority: 'High' }),
      });

      const res = await patchAdminComplaint(req, { params: Promise.resolve({ id: 'c-1' }) });
      expect(res.status).toBe(403);
    });

    it('approves reassignment in-place updating department and clearing appeal flags', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-head' } }, error: null });
      mockProfileSelect.mockResolvedValueOnce({ data: { id: 'u-head', role: 'head' }, error: null });
      mockComplaintSelect.mockResolvedValueOnce({
        data: {
          id: 'c-1',
          department: 'Roads & Infrastructure',
          requested_department: 'Water & Drainage',
          reassignment_requested: true,
        },
        error: null,
      });
      mockComplaintUpdate.mockImplementationOnce((payload: Record<string, unknown>) => ({
        data: {
          id: 'c-1',
          department: payload.department,
          reassignment_requested: payload.reassignment_requested,
        },
        error: null,
      }));

      const req = new NextRequest('http://localhost:3000/api/admin/complaints/c-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'resolve_reassignment', decision: 'approve' }),
      });

      const res = await patchAdminComplaint(req, { params: Promise.resolve({ id: 'c-1' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.complaint.department).toBe('Water & Drainage');
      expect(json.complaint.reassignment_requested).toBe(false);
    });

    it('rejects reassignment cleanly maintaining current department and clearing appeal flags', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u-head' } }, error: null });
      mockProfileSelect.mockResolvedValueOnce({ data: { id: 'u-head', role: 'head' }, error: null });
      mockComplaintSelect.mockResolvedValueOnce({
        data: {
          id: 'c-1',
          department: 'Roads & Infrastructure',
          requested_department: 'Water & Drainage',
          reassignment_requested: true,
        },
        error: null,
      });
      mockComplaintUpdate.mockImplementationOnce((payload: Record<string, unknown>) => ({
        data: {
          id: 'c-1',
          department: 'Roads & Infrastructure',
          reassignment_requested: payload.reassignment_requested,
          requested_department: payload.requested_department,
        },
        error: null,
      }));

      const req = new NextRequest('http://localhost:3000/api/admin/complaints/c-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'resolve_reassignment', decision: 'reject' }),
      });

      const res = await patchAdminComplaint(req, { params: Promise.resolve({ id: 'c-1' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.complaint.department).toBe('Roads & Infrastructure');
      expect(json.complaint.reassignment_requested).toBe(false);
    });
  });
});
