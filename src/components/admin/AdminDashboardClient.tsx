'use client';

import React, { useState } from 'react';
import { Complaint, Profile, DEPARTMENTS } from '@/types/database';
import { AdminKpiCards } from './AdminKpiCards';
import { AdminComplaintCenter } from './AdminComplaintCenter';
import { StaffManager } from './StaffManager';
import {
  Shield,
  ShieldAlert,
  Users,
  Layers,
  Building2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Filter,
  X,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface AdminDashboardClientProps {
  profile: Profile;
  initialStaff: Profile[];
  initialComplaints: Complaint[];
}

export type AdminUnifiedTab = 'pending' | 'reassignments' | 'all' | 'staff';

export function AdminDashboardClient({
  profile,
  initialStaff,
  initialComplaints,
}: AdminDashboardClientProps) {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints);
  const [staff, setStaff] = useState<Profile[]>(initialStaff);
  const [unifiedTab, setUnifiedTab] = useState<AdminUnifiedTab>('pending');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

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

  // Department Workload Breakdown
  const departmentWorkload = DEPARTMENTS.map((dept) => {
    const deptTickets = complaints.filter((c) => c.department === dept);
    const activeCount = deptTickets.filter(
      (c) => c.status === 'Reported' || c.status === 'In Progress'
    ).length;
    const resolvedCount = deptTickets.filter((c) => c.status === 'Resolved').length;
    const reassignCount = deptTickets.filter((c) => c.reassignment_requested).length;
    return {
      department: dept,
      total: deptTickets.length,
      active: activeCount,
      resolved: resolvedCount,
      reassign: reassignCount,
    };
  });

  const handleDepartmentCardClick = (dept: string) => {
    if (selectedDepartment === dept && unifiedTab === 'all') {
      setSelectedDepartment(null);
    } else {
      setSelectedDepartment(dept);
      setUnifiedTab('all');
    }
  };

  return (
    <div className="space-y-8">
      {/* Executive Command Header */}
      <div
        className="rounded-3xl p-6 sm:p-8 border shadow-xs relative overflow-hidden transition-colors"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border mb-3 shadow-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
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
              and personnel provisioning authority across all municipal postal jurisdictions.
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

      {/* Interactive Department Workload Breakdown Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Department Workload Breakdown (Click to Filter Queue)
            </h2>
          </div>
          {selectedDepartment && (
            <button
              type="button"
              onClick={() => setSelectedDepartment(null)}
              className="text-xs font-mono font-semibold flex items-center gap-1 text-[var(--accent)] hover:underline cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter ({selectedDepartment})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {departmentWorkload.map((dept) => {
            const isSelected = selectedDepartment === dept.department;
            const percentage = totalComplaints > 0 ? Math.round((dept.total / totalComplaints) * 100) : 0;

            return (
              <button
                key={dept.department}
                type="button"
                onClick={() => handleDepartmentCardClick(dept.department)}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1 hover:shadow-md ${
                  isSelected ? 'ring-2 shadow-sm' : ''
                }`}
                style={{
                  backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--bg-card)',
                  borderColor: isSelected ? 'var(--accent)' : 'var(--border-subtle)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-mono font-bold line-clamp-1" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-secondary)' }}>
                      {dept.department}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--bg-elevated)]" style={{ color: 'var(--text-muted)' }}>
                      {percentage}%
                    </span>
                  </div>

                  <div className="text-2xl font-extrabold font-mono" style={{ color: 'var(--text-primary)' }}>
                    {dept.total}
                  </div>
                </div>

                <div className="pt-3 border-t mt-3 flex items-center justify-between text-[11px] font-mono" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                    <Clock className="w-3 h-3" />
                    {dept.active} active
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    {dept.resolved} done
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Unified 4-Tab Navigation Bar */}
      <div
        className="flex items-center p-1.5 rounded-2xl border shadow-xs overflow-x-auto transition-colors"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-1.5 w-full">
          {/* Tab 1: Pending AI Review */}
          <button
            type="button"
            onClick={() => setUnifiedTab('pending')}
            className={`flex-1 min-w-[170px] inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
              unifiedTab === 'pending' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: unifiedTab === 'pending' ? 'var(--bg-card)' : 'transparent',
              color: unifiedTab === 'pending' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: unifiedTab === 'pending' ? '1px solid var(--border-subtle)' : '1px solid transparent',
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Pending AI Review</span>
            {pendingAiReview > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                {pendingAiReview}
              </span>
            )}
          </button>

          {/* Tab 2: Reassignment Requests */}
          <button
            type="button"
            onClick={() => setUnifiedTab('reassignments')}
            className={`flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
              unifiedTab === 'reassignments' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: unifiedTab === 'reassignments' ? 'var(--bg-card)' : 'transparent',
              color: unifiedTab === 'reassignments' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: unifiedTab === 'reassignments' ? '1px solid var(--border-subtle)' : '1px solid transparent',
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
            <span>Reassignment Appeals</span>
            {reassignmentRequests > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold">
                {reassignmentRequests}
              </span>
            )}
          </button>

          {/* Tab 3: All Grievances */}
          <button
            type="button"
            onClick={() => setUnifiedTab('all')}
            className={`flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
              unifiedTab === 'all' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: unifiedTab === 'all' ? 'var(--bg-card)' : 'transparent',
              color: unifiedTab === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: unifiedTab === 'all' ? '1px solid var(--border-subtle)' : '1px solid transparent',
            }}
          >
            <Layers className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <span>All Grievances</span>
            <span
              className="px-1.5 py-0.2 rounded-full text-[10px] font-mono"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
              }}
            >
              {selectedDepartment
                ? complaints.filter((c) => c.department === selectedDepartment).length
                : totalComplaints}
            </span>
          </button>

          {/* Tab 4: Staff Directory */}
          <button
            type="button"
            onClick={() => setUnifiedTab('staff')}
            className={`flex-1 min-w-[170px] inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
              unifiedTab === 'staff' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: unifiedTab === 'staff' ? 'var(--bg-card)' : 'transparent',
              color: unifiedTab === 'staff' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: unifiedTab === 'staff' ? '1px solid var(--border-subtle)' : '1px solid transparent',
            }}
          >
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <span>Staff Directory</span>
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

      {/* Main Workspace Render */}
      {unifiedTab === 'staff' ? (
        <StaffManager initialStaff={staff} onStaffUpdated={setStaff} />
      ) : (
        <AdminComplaintCenter
          complaints={complaints}
          onComplaintsUpdated={handleComplaintsUpdated}
          activeTab={unifiedTab}
          onTabChange={(tab) => setUnifiedTab(tab)}
          departmentFilter={selectedDepartment}
          onClearDepartmentFilter={() => setSelectedDepartment(null)}
        />
      )}
    </div>
  );
}
