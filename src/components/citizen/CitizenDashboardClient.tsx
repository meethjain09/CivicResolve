'use client';

import React, { useState } from 'react';
import { Complaint, Profile } from '@/types/database';
import { ComplaintForm } from './ComplaintForm';
import { CitizenTicketList } from './CitizenTicketList';
import { TiltCard } from '@/components/ui/TiltCard';
import { Layers, AlertTriangle, Clock, CheckCircle2, Sparkles } from 'lucide-react';

interface CitizenDashboardClientProps {
  profile: Profile;
  initialComplaints: Complaint[];
}

export function CitizenDashboardClient({
  profile,
  initialComplaints,
}: CitizenDashboardClientProps) {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints);

  const handleComplaintCreated = (newComplaint: Complaint) => {
    setComplaints((prev) => [newComplaint, ...prev]);
  };

  const total = complaints.length;
  const reported = complaints.filter((c) => c.status === 'Reported').length;
  const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border mb-3"
              style={{
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent)',
                borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Public Civic Grievance Services</span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Welcome back, {profile.full_name}
            </h1>
            <p
              className="text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Report civic infrastructure hazards directly to municipal authorities. Every submission is
              triaged via multimodal Gemini AI, assigned to dedicated field departments, and tracked in real time.
            </p>
          </div>
        </div>
      </div>

      {/* 4 3D Tilt KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Filed */}
        <TiltCard className="p-5 flex items-center justify-between">
          <div>
            <div
              className="text-2xl sm:text-3xl font-extrabold font-mono"
              style={{ color: 'var(--text-primary)' }}
            >
              {total}
            </div>
            <div
              className="text-[11px] font-mono font-semibold uppercase tracking-wider mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Total Filed
            </div>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <Layers className="w-5 h-5" />
          </div>
        </TiltCard>

        {/* Reported */}
        <TiltCard className="p-5 flex items-center justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-500">
              {reported}
            </div>
            <div
              className="text-[11px] font-mono font-semibold uppercase tracking-wider mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Reported
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-amber-500/10 text-amber-500 border-amber-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </TiltCard>

        {/* In Progress */}
        <TiltCard className="p-5 flex items-center justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-500">
              {inProgress}
            </div>
            <div
              className="text-[11px] font-mono font-semibold uppercase tracking-wider mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              In Progress
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-blue-500/10 text-blue-500 border-blue-500/30">
            <Clock className="w-5 h-5" />
          </div>
        </TiltCard>

        {/* Resolved */}
        <TiltCard className="p-5 flex items-center justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-500">
              {resolved}
            </div>
            <div
              className="text-[11px] font-mono font-semibold uppercase tracking-wider mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Resolved
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </TiltCard>
      </div>

      {/* Main 2-Column Grievance Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Elevated Complaint Form (5 cols) */}
        <div className="lg:col-span-5 sticky top-24">
          <ComplaintForm onComplaintCreated={handleComplaintCreated} />
        </div>

        {/* Right Column: Grievance Tracker (7 cols) */}
        <div className="lg:col-span-7">
          <CitizenTicketList complaints={complaints} />
        </div>
      </div>
    </div>
  );
}
