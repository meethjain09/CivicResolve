'use client';

import React, { useState, useEffect } from 'react';
import { Complaint } from '@/types/database';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import {
  MapPin,
  Clock,
  CheckCircle2,
  Building2,
  Sparkles,
  FileText,
  ExternalLink,
  ShieldCheck,
  X,
  Loader2,
  PlusCircle,
} from 'lucide-react';

type SubFilter = 'all' | 'current' | 'completed';

interface CitizenTicketListProps {
  complaints: Complaint[];
  onComplaintsUpdated?: (updated: Complaint[]) => void;
  onReportNew?: () => void;
}

export function CitizenTicketList({
  complaints,
  onComplaintsUpdated,
  onReportNew,
}: CitizenTicketListProps) {
  const [filter, setFilter] = useState<SubFilter>('all');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Background polling: check every 5 seconds ONLY if at least one complaint has ai_status === 'review_pending'
  useEffect(() => {
    const hasPendingAi = complaints.some((c) => c.ai_status === 'review_pending');
    if (!hasPendingAi) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch('/api/complaints');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.complaints)) {
            onComplaintsUpdated?.(data.complaints);
          }
        }
      } catch (pollErr) {
        console.warn('Background poll for complaint status failed:', pollErr);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [complaints, onComplaintsUpdated]);

  const allCount = complaints.length;
  const currentCount = complaints.filter(
    (c) => c.status === 'Reported' || c.status === 'In Progress'
  ).length;
  const completedCount = complaints.filter((c) => c.status === 'Resolved').length;

  const filteredComplaints = complaints.filter((c) => {
    if (filter === 'current') return c.status === 'Reported' || c.status === 'In Progress';
    if (filter === 'completed') return c.status === 'Resolved';
    return true;
  });

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
      {/* Filter Tabs Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 rounded-2xl border shadow-xs transition-colors"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div>
          <h2
            className="text-base sm:text-lg font-bold flex items-center gap-2 tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            <FileText className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span>My Grievance Tracker</span>
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Real-time municipal dispatch, automated background AI routing, and live status telemetry.
          </p>
        </div>

        {/* 3 Sub-Filters: All, Current (Reported & In Progress), and Completed (Resolved) */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl border overflow-x-auto"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* All */}
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
              filter === 'all' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: filter === 'all' ? 'var(--bg-card)' : 'transparent',
              color: filter === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: filter === 'all' ? '1px solid var(--border-subtle)' : '1px solid transparent',
            }}
          >
            <span>All</span>
            <span
              className="px-1.5 py-0.2 rounded-full text-[10px] font-mono"
              style={{
                backgroundColor: filter === 'all' ? 'var(--accent-soft)' : 'var(--border-subtle)',
                color: filter === 'all' ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {allCount}
            </span>
          </button>

          {/* Current */}
          <button
            type="button"
            onClick={() => setFilter('current')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
              filter === 'current' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: filter === 'current' ? 'var(--bg-card)' : 'transparent',
              color: filter === 'current' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: filter === 'current' ? '1px solid var(--border-subtle)' : '1px solid transparent',
            }}
          >
            <span>Current (Reported & In Progress)</span>
            <span
              className="px-1.5 py-0.2 rounded-full text-[10px] font-mono"
              style={{
                backgroundColor: filter === 'current' ? 'var(--accent-soft)' : 'var(--border-subtle)',
                color: filter === 'current' ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {currentCount}
            </span>
          </button>

          {/* Completed */}
          <button
            type="button"
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
              filter === 'completed' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: filter === 'completed' ? 'var(--bg-card)' : 'transparent',
              color: filter === 'completed' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: filter === 'completed' ? '1px solid var(--border-subtle)' : '1px solid transparent',
            }}
          >
            <span>Completed (Resolved)</span>
            <span
              className="px-1.5 py-0.2 rounded-full text-[10px] font-mono"
              style={{
                backgroundColor: filter === 'completed' ? 'var(--accent-soft)' : 'var(--border-subtle)',
                color: filter === 'completed' ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {completedCount}
            </span>
          </button>
        </div>
      </div>

      {/* Ticket List or Empty State */}
      {filteredComplaints.length === 0 ? (
        <div
          className="rounded-3xl border-2 border-dashed p-12 text-center shadow-xs transition-colors space-y-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div
            className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center border"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {filter === 'all'
                ? 'No Grievances Filed Yet'
                : filter === 'current'
                ? 'No Active Grievances'
                : 'No Completed Grievances'}
            </h3>
            <p className="text-xs max-w-sm mx-auto mt-1" style={{ color: 'var(--text-muted)' }}>
              {filter === 'all'
                ? 'Submit your first civic issue using the Report an Issue wizard to track municipal resolution.'
                : `There are currently no tickets matching the "${filter}" filter.`}
            </p>
          </div>

          {onReportNew && (
            <button
              type="button"
              onClick={onReportNew}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report an Issue Now</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((item, idx) => {
            const isAiPending = item.ai_status === 'review_pending';

            return (
              <div
                key={item.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(idx * 70, 420)}ms` }}
              >
                <SpotlightCard
                  className="p-5 sm:p-6 space-y-4"
                  style={{
                    borderColor: isAiPending ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : 'var(--border-subtle)',
                  }}
                >
                  {/* Header: Monospace Ticket Code, Date, Priority, Status */}
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 border-b pb-3"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono font-bold text-xs px-2.5 py-1 rounded-md border"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          color: 'var(--text-primary)',
                          borderColor: 'var(--border-strong)',
                        }}
                      >
                        {item.ticket_code}
                      </span>
                      <span className="text-xs opacity-40" style={{ color: 'var(--text-muted)' }}>
                        &bull;
                      </span>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={item.priority} />
                      <StatusBadge status={item.status} />
                    </div>
                  </div>

                  {/* Title & Location with Photo Thumbnail */}
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <h3
                        className="text-base font-bold leading-snug tracking-tight"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {item.title}
                      </h3>

                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {/* Pincode badge */}
                        <span
                          className="inline-flex items-center gap-1 font-mono font-semibold px-2 py-0.5 rounded border"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <MapPin className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                          {item.pincode ? `PIN ${item.pincode}` : 'Pincode N/A'}
                        </span>
                        <span
                          className="text-xs whitespace-pre-wrap break-words"
                          style={{ color: 'var(--text-secondary)' }}
                          title={item.address}
                        >
                          {item.address}
                        </span>
                      </div>
                    </div>

                    {/* Clickable Photo Thumbnail with smooth hover zoom */}
                    {item.image_url && (
                      <button
                        type="button"
                        onClick={() => setExpandedImage(item.image_url)}
                        className="shrink-0 relative group rounded-xl overflow-hidden border shadow-xs cursor-pointer focus:outline-none transition-transform duration-200 hover:scale-105 hover:shadow-md"
                        style={{ borderColor: 'var(--border-subtle)' }}
                        title="Click to view full photo evidence"
                      >
                        <img
                          src={item.image_url}
                          alt="Complaint attachment"
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  <div
                    className="text-xs leading-relaxed p-3.5 rounded-xl border whitespace-pre-wrap break-words"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {item.description}
                  </div>

                  {/* AI Department Triage & Telemetry Box */}
                  <div
                    className="rounded-2xl p-3.5 sm:p-4 border space-y-2 transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          Department:
                        </span>
                        {isAiPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 text-[11px] animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>AI Triage in Progress (Auto-updating...)</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] border"
                            style={{
                              backgroundColor: 'var(--accent-soft)',
                              color: 'var(--accent)',
                              borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                            }}
                          >
                            {item.department}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {item.image_verified !== null && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border"
                            style={{
                              backgroundColor: item.image_verified ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                              color: item.image_verified ? '#059669' : '#E11D48',
                              borderColor: item.image_verified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)',
                            }}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {item.image_verified ? 'Photo Corroborated' : 'Photo Flagged'}
                          </span>
                        )}

                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-mono font-medium"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Sparkles className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                          {item.category}
                        </span>
                      </div>
                    </div>

                    {item.ai_summary && (
                      <p
                        className="text-[11px] italic pt-1 border-t leading-relaxed"
                        style={{
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        &ldquo;{item.ai_summary}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Highlighted Official Resolution Note Banner */}
                  {item.resolution_note && (
                    <div
                      className="rounded-2xl p-4 border flex items-start gap-3 shadow-xs"
                      style={{
                        backgroundColor: 'var(--accent-soft)',
                        borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)',
                      }}
                    >
                      <CheckCircle2
                        className="w-4 h-4 shrink-0 mt-0.5"
                        style={{ color: 'var(--accent)' }}
                      />
                      <div>
                        <span
                          className="text-xs font-bold block"
                          style={{ color: 'var(--accent)' }}
                        >
                          Official Resolution Note:
                        </span>
                        <p
                          className="text-xs mt-0.5 leading-relaxed font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {item.resolution_note}
                        </p>
                      </div>
                    </div>
                  )}
                </SpotlightCard>
              </div>
            );
          })}
        </div>
      )}

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setExpandedImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden border shadow-2xl p-1"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-strong)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={expandedImage}
              alt="Expanded Evidence Photo"
              className="max-w-full max-h-[85vh] object-contain mx-auto rounded-xl"
            />
            <button
              type="button"
              onClick={() => setExpandedImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer"
              title="Close image preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
