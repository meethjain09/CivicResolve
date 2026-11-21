'use client';

import React, { useState } from 'react';
import { Complaint, TicketStatus } from '@/types/database';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
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
            Real-time municipal dispatch, status updates, and audit receipts.
          </p>
        </div>

        {/* Segmented Status Filter Tabs */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl border overflow-x-auto"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {(['All', 'Reported', 'In Progress', 'Resolved'] as const).map((tab) => {
            const count =
              tab === 'All'
                ? complaints.length
                : complaints.filter((c) => c.status === tab).length;
            const isSelected = filter === tab;

            return (
              <button
                key={tab}
                type="button"
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
                  {count}
                </span>
              </button>
            );
          })}
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
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {filter === 'All' ? 'No Grievances Filed Yet' : `No ${filter} Grievances`}
          </h3>
          <p className="text-xs max-w-sm mx-auto mt-1" style={{ color: 'var(--text-muted)' }}>
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
              className="rounded-3xl border shadow-xs transition-all duration-200 p-5 sm:p-6 space-y-4 hover:shadow-md"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
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
                    <span
                      className="inline-flex items-center gap-1 font-mono font-semibold px-2 py-0.5 rounded border"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-secondary)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <MapPin className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                      {item.ward}
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

                {/* Clickable Photo Thumbnail */}
                {item.image_url && (
                  <button
                    type="button"
                    onClick={() => setExpandedImage(item.image_url)}
                    className="shrink-0 relative group rounded-xl overflow-hidden border shadow-xs cursor-pointer focus:outline-none"
                    style={{ borderColor: 'var(--border-subtle)' }}
                    title="Click to view full photo evidence"
                  >
                    <img
                      src={item.image_url}
                      alt="Complaint attachment"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover transition-transform duration-200 group-hover:scale-105"
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

              {/* AI Department Triage & Summary Box */}
              <div
                className="rounded-2xl p-3.5 sm:p-4 border space-y-2"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Assigned Department:
                    </span>
                    {item.ai_status === 'review_pending' && item.department === 'Unassigned' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-amber-600 bg-amber-500/15 border border-amber-500/30 text-[11px]">
                        <Clock className="w-3 h-3" />
                        Pending Admin Review
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
                        {item.image_verified ? 'Photo Verified' : 'Photo Unverified'}
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
            </div>
          ))}
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
