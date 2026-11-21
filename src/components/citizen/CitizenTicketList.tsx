'use client';

import React, { useState } from 'react';
import { Complaint, TicketStatus } from '@/types/database';
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sparkles,
  FileText,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface CitizenTicketListProps {
  complaints: Complaint[];
}

export function CitizenTicketList({ complaints }: CitizenTicketListProps) {
  const [filter, setFilter] = useState<'All' | TicketStatus>('All');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const filteredComplaints = complaints.filter((c) => {
    if (filter === 'All') return true;
    return c.status === filter;
  });

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'Resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Resolved
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            In Progress
          </span>
        );
      case 'Reported':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Reported
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-rose-100 text-rose-800 border border-rose-300">
            Critical
          </span>
        );
      case 'High':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300">
            High Priority
          </span>
        );
      case 'Low':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-slate-100 text-slate-700 border border-slate-200">
            Low
          </span>
        );
      case 'Medium':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200">
            Medium
          </span>
        );
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            My Filed Grievances
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time resolution updates from municipal officers.
          </p>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {(['All', 'Reported', 'In Progress', 'Resolved'] as const).map((tab) => {
            const count =
              tab === 'All'
                ? complaints.length
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
          })}
        </div>
      </div>

      {/* Ticket List or Empty State */}
      {filteredComplaints.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {filter === 'All' ? 'No Grievances Filed Yet' : `No ${filter} Grievances`}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {filter === 'All'
              ? 'Submit your first civic issue using the form on the left to start tracking municipal resolution.'
              : `There are currently no tickets in the "${filter}" status queue.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 space-y-4"
            >
              {/* Header: Ticket Code, Status & Priority */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-slate-900 text-emerald-400">
                    {item.ticket_code}
                  </span>
                  <span className="text-xs text-slate-400">&bull;</span>
                  <span className="text-xs text-slate-500">{formatDate(item.created_at)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {getPriorityBadge(item.priority)}
                  {getStatusBadge(item.status)}
                </div>
              </div>

              {/* Title & Location */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {item.title}
                  </h3>

                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {item.ward}
                    </span>
                    <span className="truncate max-w-md text-slate-600" title={item.address}>
                      {item.address}
                    </span>
                  </div>
                </div>

                {/* Photo Thumbnail */}
                {item.image_url && (
                  <button
                    type="button"
                    onClick={() => setExpandedImage(item.image_url)}
                    className="shrink-0 relative group rounded-xl overflow-hidden border border-slate-200 shadow-xs"
                    title="Click to view full image"
                  >
                    <img
                      src={item.image_url}
                      alt="Complaint attachment"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </button>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                {item.description}
              </p>

              {/* AI Department Triage & Summary Box */}
              <div className="bg-indigo-50/50 rounded-2xl p-3.5 border border-indigo-100/80 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-slate-700">Assigned Department:</span>
                    {item.ai_status === 'review_pending' && item.department === 'Unassigned' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-amber-700 bg-amber-100 text-[11px]">
                        <Clock className="w-3 h-3" />
                        Pending Admin Triage
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-indigo-800 bg-indigo-100 text-[11px]">
                        {item.department}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.image_verified !== null && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          item.image_verified
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {item.image_verified ? 'Image Verified' : 'Image Unverified'}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      {item.category}
                    </span>
                  </div>
                </div>

                {item.ai_summary && (
                  <p className="text-[11px] text-slate-600 italic">
                    &ldquo;{item.ai_summary}&rdquo;
                  </p>
                )}
              </div>

              {/* Resolution Note if ticket is resolved */}
              {item.resolution_note && (
                <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      Department Officer Resolution Note:
                    </span>
                    <p className="text-xs text-emerald-800 mt-0.5">{item.resolution_note}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden bg-slate-900 shadow-2xl">
            <img
              src={expandedImage}
              alt="Expanded Complaint Image"
              className="max-w-full max-h-[85vh] object-contain mx-auto"
            />
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
