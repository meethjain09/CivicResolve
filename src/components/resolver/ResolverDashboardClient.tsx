'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Complaint, Profile, TicketStatus } from '@/types/database';
import { ResolverTicketCard } from './ResolverTicketCard';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { ShineBorder } from '@/components/ui/ShineBorder';
import { NumberTicker } from '@/components/ui/NumberTicker';
import { RippleButton } from '@/components/ui/RippleButton';
import { TypingIndicatorWrapper } from '@/components/ui/TypingIndicatorWrapper';
import {
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  Layers,
  Inbox,
  Search,
  X,
} from 'lucide-react';

interface ResolverDashboardClientProps {
  profile: Profile;
  initialComplaints: Complaint[];
}

type FilterTab = 'All' | TicketStatus | 'Reassignment Pending';

export function ResolverDashboardClient({
  profile,
  initialComplaints,
}: ResolverDashboardClientProps) {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints);
  const [filter, setFilter] = useState<FilterTab>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const department = profile.department || 'Unassigned';

  const handleComplaintUpdated = useCallback((updated: Complaint) => {
    setComplaints((prev) => {
      // If the ticket was reassigned to another department, remove it from this resolver's active department view
      if (updated.department !== department) {
        return prev.filter((c) => c.id !== updated.id);
      }
      return prev.map((c) => (c.id === updated.id ? updated : c));
    });
  }, [department]);

  const departmentComplaints = useMemo(
    () => complaints.filter((c) => c.department === department),
    [complaints, department]
  );

  const { total, reported, inProgress, resolved, reassignmentPending } = useMemo(() => {
    let rep = 0;
    let prog = 0;
    let res = 0;
    let reassign = 0;
    for (const c of departmentComplaints) {
      if (c.status === 'Reported') rep++;
      if (c.status === 'In Progress') prog++;
      if (c.status === 'Resolved') res++;
      if (c.reassignment_requested) reassign++;
    }
    return {
      total: departmentComplaints.length,
      reported: rep,
      inProgress: prog,
      resolved: res,
      reassignmentPending: reassign,
    };
  }, [departmentComplaints]);

  const filteredComplaints = useMemo(() => {
    return departmentComplaints.filter((c) => {
      // 1. Status Filter
      if (filter === 'Reassignment Pending') {
        if (!c.reassignment_requested) return false;
      } else if (filter !== 'All') {
        if (c.status !== filter) return false;
      }

      // 2. Search Filter (by ticket_code, address, title, or pincode)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = c.ticket_code.toLowerCase().includes(q);
        const matchesAddress = c.address.toLowerCase().includes(q);
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesPincode = (c.pincode || '').toLowerCase().includes(q);
        return matchesCode || matchesAddress || matchesTitle || matchesPincode;
      }

      return true;
    });
  }, [departmentComplaints, filter, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Department Command Header */}
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
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold border mb-3 shadow-xs"
              style={{
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent)',
                borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
              }}
            >
              <Building2 className="w-4 h-4" />
              <span>{department} Division</span>
            </div>

            <h1
              className="text-2xl sm:text-3xl font-extrabold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Department Command: {profile.full_name}
            </h1>

            <p
              className="text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Operational triage and field dispatch workspace. Investigate civic grievances assigned to your
              jurisdiction, record resolution actions, and coordinate inter-department reassignment requests.
            </p>
          </div>

          {reassignmentPending > 0 && (
            <div
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-semibold self-start sm:self-auto shadow-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>
                <NumberTicker value={reassignmentPending} /> Reassignment Appeal{reassignmentPending > 1 ? 's' : ''} Pending
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Interactive KPI Summary Cards with Spotlight & Animated Tickers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Assigned Queue */}
        <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
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
                Assigned Queue
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
        <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
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
        <div className="animate-fade-up" style={{ animationDelay: '160ms' }}>
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
        <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
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

      {/* Filter Navigation & Search Bar */}
      <div
        className="relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border shadow-xs transition-colors"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <ShineBorder borderWidth={2} />
        {/* Segmented Filter Pills */}
        <div
          role="tablist"
          aria-label="Ticket status filter"
          className="flex items-center gap-1 p-1 rounded-xl border overflow-x-auto"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {(['All', 'Reported', 'In Progress', 'Resolved', 'Reassignment Pending'] as const).map(
            (tab) => {
              const count =
                tab === 'All'
                  ? total
                  : tab === 'Reassignment Pending'
                  ? reassignmentPending
                  : complaints.filter((c) => c.status === tab).length;
              const isSelected = filter === tab;

              return (
                <RippleButton
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                    isSelected ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'var(--bg-card)' : 'transparent',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: isSelected ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  }}
                >
                  <span>{tab}</span>
                  <span
                    className="px-1.5 py-0.2 rounded-full text-[10px] font-mono"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--border-subtle)',
                      color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    <NumberTicker value={count} />
                  </span>
                </RippleButton>
              );
            }
          )}
        </div>

        {/* Search Bar */}
        <div className="w-full lg:w-72">
          <TypingIndicatorWrapper value={searchQuery}>
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by code, pincode, or address..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 transition-colors border"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-strong)',
                }}
              />
              {searchQuery && (
                <RippleButton
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </RippleButton>
              )}
            </div>
          </TypingIndicatorWrapper>
        </div>
      </div>

      {/* Ticket List or Empty State */}
      {filteredComplaints.length === 0 ? (
        <div
          className="rounded-3xl border-2 border-dashed p-12 text-center shadow-xs transition-colors"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div
            className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3 border"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            <Inbox className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {searchQuery
              ? 'No Matching Grievances Found'
              : filter === 'All'
              ? 'No Complaints Currently Assigned'
              : `No Tickets in "${filter}" Status`}
          </h3>
          <p className="text-xs max-w-sm mx-auto mt-1" style={{ color: 'var(--text-muted)' }}>
            {searchQuery
              ? `No assigned grievances match "${searchQuery}". Try searching with a different ticket code or street name.`
              : filter === 'All'
              ? `There are no active civic grievances assigned to the ${department} division at this time.`
              : `No grievances currently match the "${filter}" filter criteria.`}
          </p>
          {searchQuery && (
            <RippleButton
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              Clear Search Query
            </RippleButton>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filteredComplaints.map((complaint, idx) => (
            <div
              key={complaint.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(idx * 70, 420)}ms` }}
            >
              <ResolverTicketCard
                complaint={complaint}
                currentDepartment={department}
                onComplaintUpdated={handleComplaintUpdated}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
