'use client';

import React, { useState } from 'react';
import { Complaint, Profile, TicketStatus } from '@/types/database';
import { ResolverTicketCard } from './ResolverTicketCard';
import {
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  Layers,
  Inbox,
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

  const department = profile.department || 'Unassigned';

  const handleComplaintUpdated = (updated: Complaint) => {
    setComplaints((prev) => {
      // If the ticket was reassigned to another department, remove it from this resolver's active department view
      if (updated.department !== department) {
        return prev.filter((c) => c.id !== updated.id);
      }
      return prev.map((c) => (c.id === updated.id ? updated : c));
    });
  };

  const total = complaints.length;
  const reported = complaints.filter((c) => c.status === 'Reported').length;
  const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;
  const reassignmentPending = complaints.filter((c) => c.reassignment_requested).length;

  const filteredComplaints = complaints.filter((c) => {
    if (filter === 'All') return true;
    if (filter === 'Reassignment Pending') return c.reassignment_requested;
    return c.status === filter;
  });

  return (
    <div className="space-y-8">
      {/* Department Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 mb-3">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              {department} Division
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Department Operations: {profile.full_name}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              Investigate municipal grievances routed to your jurisdiction, coordinate on-site repairs, publish resolution notes to citizens, or request inter-department reassignment.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Status Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{total}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              Assigned Tickets
            </div>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">{reported}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              Reported
            </div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">{inProgress}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              In Progress
            </div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{resolved}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              Resolved
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between col-span-2 lg:col-span-1">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600">{reassignmentPending}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              Reassign Appeals
            </div>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-indigo-600" />
            {department} Action Queue
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing grievances triaged and routed to your departmental jurisdiction.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {(['All', 'Reported', 'In Progress', 'Resolved', 'Reassignment Pending'] as const).map(
            (tab) => {
              const count =
                tab === 'All'
                  ? total
                  : tab === 'Reassignment Pending'
                  ? reassignmentPending
                  : complaints.filter((c) => c.status === tab).length;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    filter === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                  <span
                    className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                      filter === tab
                        ? 'bg-slate-100 text-slate-800'
                        : 'bg-slate-200/60 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Ticket List or Empty State */}
      {filteredComplaints.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {filter === 'All'
              ? 'No Complaints Currently Assigned'
              : `No Tickets in "${filter}" Status`}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {filter === 'All'
              ? `There are no active civic grievances assigned to the ${department} division at this time.`
              : `No grievances currently match the "${filter}" filter criteria.`}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredComplaints.map((complaint) => (
            <ResolverTicketCard
              key={complaint.id}
              complaint={complaint}
              currentDepartment={department}
              onComplaintUpdated={handleComplaintUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
