'use client';

import React, { useState } from 'react';
import { Complaint, Profile } from '@/types/database';
import { ComplaintForm } from './ComplaintForm';
import { CitizenTicketList } from './CitizenTicketList';
import { Layers, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

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
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-emerald-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-3">
              Citizen Grievance Services
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {profile.full_name}
            </h1>
            <p className="text-emerald-100/80 text-sm mt-1 max-w-2xl leading-relaxed">
              Report civic infrastructure issues directly to city departments. Powered by Gemini AI for rapid automated classification, prioritization, and resolution tracking.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Summary Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{total}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              Total Grievances
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
      </div>

      {/* Main 2-Column Grievance Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Complaint Form (5 cols) */}
        <div className="lg:col-span-5 sticky top-24">
          <ComplaintForm onComplaintCreated={handleComplaintCreated} />
        </div>

        {/* Right Column: Ticket List (7 cols) */}
        <div className="lg:col-span-7">
          <CitizenTicketList complaints={complaints} />
        </div>
      </div>
    </div>
  );
}
