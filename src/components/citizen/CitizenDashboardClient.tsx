'use client';

import React, { useState } from 'react';
import { Complaint, Profile } from '@/types/database';
import { ComplaintForm } from './ComplaintForm';
import { CitizenTicketList } from './CitizenTicketList';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { NumberTicker } from '@/components/ui/NumberTicker';
import { RippleButton } from '@/components/ui/RippleButton';
import {
  Layers,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Sparkles,
  PlusCircle,
  FileText,
} from 'lucide-react';

interface CitizenDashboardClientProps {
  profile: Profile;
  initialComplaints: Complaint[];
}

export function CitizenDashboardClient({
  profile,
  initialComplaints,
}: CitizenDashboardClientProps) {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints);
  const [activeTab, setActiveTab] = useState<'report' | 'requests'>('report');

  const handleComplaintCreated = (newComplaint: Complaint) => {
    setComplaints((prev) => [newComplaint, ...prev]);
  };

  const total = complaints.length;
  const reported = complaints.filter((c) => c.status === 'Reported').length;
  const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;

  const currentCount = reported + inProgress;
  const completedCount = resolved;

  return (
    <div className="space-y-8">
      {/* Top Welcome Command Banner */}
      <div
        className="rounded-3xl p-6 sm:p-8 border shadow-xs relative overflow-hidden transition-colors"
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
              <span>Public Civic Grievance Portal</span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Citizen Command | {profile.full_name}
            </h1>
            <p
              className="text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Report civic infrastructure hazards with rapid multimodal AI triage. Submissions are classified,
              prioritized, and routed to municipal field personnel in real time.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Interactive KPI Summary Cards with Spotlight & Animated Tickers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Filed */}
        <div
          onClick={() => setActiveTab('requests')}
          className="cursor-pointer animate-fade-up"
          style={{ animationDelay: '0ms' }}
        >
          <SpotlightCard className="p-5 flex items-center justify-between">
            <div>
              <div
                className="text-2xl sm:text-3xl font-extrabold font-mono"
                style={{ color: 'var(--text-primary)' }}
              >
                <NumberTicker value={total} />
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
          </SpotlightCard>
        </div>

        {/* Reported */}
        <div
          onClick={() => setActiveTab('requests')}
          className="cursor-pointer animate-fade-up"
          style={{ animationDelay: '80ms' }}
        >
          <SpotlightCard className="p-5 flex items-center justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-500">
                <NumberTicker value={reported} />
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
          </SpotlightCard>
        </div>

        {/* In Progress */}
        <div
          onClick={() => setActiveTab('requests')}
          className="cursor-pointer animate-fade-up"
          style={{ animationDelay: '160ms' }}
        >
          <SpotlightCard className="p-5 flex items-center justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-500">
                <NumberTicker value={inProgress} />
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
          </SpotlightCard>
        </div>

        {/* Resolved */}
        <div
          onClick={() => setActiveTab('requests')}
          className="cursor-pointer animate-fade-up"
          style={{ animationDelay: '240ms' }}
        >
          <SpotlightCard className="p-5 flex items-center justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-500">
                <NumberTicker value={resolved} />
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
          </SpotlightCard>
        </div>
      </div>

      {/* Prominent Animated 2-Tab Switcher Bar */}
      <div
        className="w-full grid grid-cols-2 gap-2 p-1.5 rounded-2xl border shadow-xs transition-colors"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Tab 1: Report an Issue */}
        <RippleButton
          type="button"
          onClick={() => setActiveTab('report')}
          className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
            activeTab === 'report' ? 'shadow-sm' : 'opacity-70 hover:opacity-100'
          }`}
          style={{
            backgroundColor: activeTab === 'report' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'report' ? 'var(--accent-fg)' : 'var(--text-secondary)',
            boxShadow:
              activeTab === 'report'
                ? '0 4px 14px 0 color-mix(in srgb, var(--accent) 35%, transparent)'
                : 'none',
          }}
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Report an Issue</span>
        </RippleButton>

        {/* Tab 2: My Requests */}
        <RippleButton
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
            activeTab === 'requests' ? 'shadow-sm' : 'opacity-70 hover:opacity-100'
          }`}
          style={{
            backgroundColor: activeTab === 'requests' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'requests' ? 'var(--accent-fg)' : 'var(--text-secondary)',
            boxShadow:
              activeTab === 'requests'
                ? '0 4px 14px 0 color-mix(in srgb, var(--accent) 35%, transparent)'
                : 'none',
          }}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">My Requests</span>
          <span
            className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold whitespace-nowrap inline-flex items-center gap-1"
            style={{
              backgroundColor:
                activeTab === 'requests'
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'var(--bg-elevated)',
              color:
                activeTab === 'requests'
                  ? 'var(--accent-fg)'
                  : 'var(--text-primary)',
            }}
          >
            <NumberTicker value={currentCount} /> Active · <NumberTicker value={completedCount} /> Done
          </span>
        </RippleButton>
      </div>

      {/* Tab Workspaces */}
      {activeTab === 'report' ? (
        <ComplaintForm
          onComplaintCreated={handleComplaintCreated}
          onViewRequests={() => setActiveTab('requests')}
        />
      ) : (
        <CitizenTicketList
          complaints={complaints}
          onComplaintsUpdated={setComplaints}
          onReportNew={() => setActiveTab('report')}
        />
      )}
    </div>
  );
}
