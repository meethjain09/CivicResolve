'use client';

import React, { useState } from 'react';
import { Complaint, Profile } from '@/types/database';
import { AdminKpiCards } from './AdminKpiCards';
import { AdminComplaintCenter } from './AdminComplaintCenter';
import { StaffManager } from './StaffManager';
import { Shield } from 'lucide-react';

interface AdminDashboardClientProps {
  profile: Profile;
  initialStaff: Profile[];
  initialComplaints: Complaint[];
}

export function AdminDashboardClient({
  profile,
  initialStaff,
  initialComplaints,
}: AdminDashboardClientProps) {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints);
  const [staff, setStaff] = useState<Profile[]>(initialStaff);

  const totalComplaints = complaints.length;
  const pendingAiReview = complaints.filter((c) => c.ai_status === 'review_pending').length;
  const reassignmentRequests = complaints.filter((c) => c.reassignment_requested).length;
  const activeResolvers = staff.filter((s) => s.role === 'resolver').length;

  return (
    <div className="space-y-8">
      {/* Welcome Executive Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-3">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              Executive Civic Administration
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {profile.full_name}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              Oversee department officers, manage civic resolution workflows, and adjudicate AI classification queues across all municipal sectors.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Top KPI Summary Cards */}
      <AdminKpiCards
        totalComplaints={totalComplaints}
        pendingAiReview={pendingAiReview}
        reassignmentRequests={reassignmentRequests}
        activeResolvers={activeResolvers}
      />

      {/* Complaint Triage & Reassignment Queue Center */}
      <AdminComplaintCenter
        complaints={complaints}
        onComplaintsUpdated={setComplaints}
      />

      {/* Staff & Department Resolver Management */}
      <StaffManager
        initialStaff={initialStaff}
        onStaffUpdated={setStaff}
      />
    </div>
  );
}
