'use client';

import React, { useState } from 'react';
import { Complaint, Profile } from '@/types/database';
import { AdminKpiCards } from './AdminKpiCards';
import { AdminComplaintCenter } from './AdminComplaintCenter';
import { StaffManager } from './StaffManager';
import { Shield, ShieldAlert, Users, Layers } from 'lucide-react';

interface AdminDashboardClientProps {
  profile: Profile;
  initialStaff: Profile[];
  initialComplaints: Complaint[];
}

type WorkspaceView = 'triage' | 'staff';

export function AdminDashboardClient({
  profile,
  initialStaff,
  initialComplaints,
}: AdminDashboardClientProps) {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints);
  const [staff, setStaff] = useState<Profile[]>(initialStaff);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('triage');

  const handleComplaintsUpdated = (nextComplaints: Complaint[]) => {
    // Deduplicate by ID to guarantee tickets can never appear multiple times
    const seen = new Set<string>();
    const deduplicated = nextComplaints.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    setComplaints(deduplicated);
  };

  const totalComplaints = complaints.length;
  const pendingAiReview = complaints.filter((c) => c.ai_status === 'review_pending').length;
  const reassignmentRequests = complaints.filter((c) => c.reassignment_requested).length;
  const activeResolvers = staff.filter((s) => s.role === 'resolver').length;

  return (
    <div className="space-y-8">
      {/* Executive Command Header */}
      <div
        className="rounded-3xl p-6 sm:p-8 border shadow-sm relative overflow-hidden transition-colors"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border mb-3 shadow-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
            >
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              <span>Citywide Administrative Command</span>
            </div>

            <h1
              className="text-2xl sm:text-3xl font-extrabold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Executive Command: {profile.full_name}
            </h1>

            <p
              className="text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Citywide civic grievance administration, automated AI triage supervision, department routing adjudication,
              and personnel provisioning authority across all municipal wards.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Root Authority Enforced</span>
            </span>
          </div>
        </div>
      </div>

      {/* 4 3D Tilt KPI Summary Cards */}
      <AdminKpiCards
        totalComplaints={totalComplaints}
        pendingAiReview={pendingAiReview}
        reassignmentRequests={reassignmentRequests}
        activeResolvers={activeResolvers}
      />

      {/* Workspace Navigation Bar */}
      <div
        className="flex items-center justify-between p-1.5 rounded-2xl border shadow-xs"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setWorkspaceView('triage')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              workspaceView === 'triage' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: workspaceView === 'triage' ? 'var(--bg-card)' : 'transparent',
              color: workspaceView === 'triage' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: workspaceView === 'triage' ? '1px solid var(--border-subtle)' : '1px solid transparent',
            }}
          >
            <ShieldAlert className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span>Grievance Triage & Routing</span>
            {(pendingAiReview > 0 || reassignmentRequests > 0) && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                {pendingAiReview + reassignmentRequests}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setWorkspaceView('staff')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              workspaceView === 'staff' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: workspaceView === 'staff' ? 'var(--bg-card)' : 'transparent',
              color: workspaceView === 'staff' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: workspaceView === 'staff' ? '1px solid var(--border-subtle)' : '1px solid transparent',
            }}
          >
            <Users className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span>Department Staff Directory</span>
            <span
              className="px-1.5 py-0.2 rounded-full text-[10px] font-mono"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
              }}
            >
              {staff.length}
            </span>
          </button>
        </div>
      </div>

      {/* Workspace View Container */}
      {workspaceView === 'triage' ? (
        <AdminComplaintCenter
          complaints={complaints}
          onComplaintsUpdated={handleComplaintsUpdated}
        />
      ) : (
        <StaffManager
          initialStaff={staff}
          onStaffUpdated={setStaff}
        />
      )}
    </div>
  );
}
