'use client';

import React, { useState } from 'react';
import { Complaint, TicketStatus } from '@/types/database';
import { ReassignModal } from './ReassignModal';
import { StatusBadge, PriorityBadge, AiStatusBadge } from '@/components/shared/StatusBadge';
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Save,
  Loader2,
  FileText,
  AlertCircle,
  X,
} from 'lucide-react';

interface ResolverTicketCardProps {
  complaint: Complaint;
  currentDepartment: string;
  onComplaintUpdated: (updated: Complaint) => void;
}

export function ResolverTicketCard({
  complaint,
  currentDepartment,
  onComplaintUpdated,
}: ResolverTicketCardProps) {
  const [status, setStatus] = useState<TicketStatus>(complaint.status);
  const [resolutionNote, setResolutionNote] = useState(complaint.resolution_note || '');
  const [saving, setSaving] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Reassignment modal state
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const handleStatusSave = async () => {
    setSaving(true);
    setUpdateError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/resolver/complaints/${complaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          status,
          resolution_note: resolutionNote.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update ticket status');
      }

      onComplaintUpdated(data.complaint);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Status update error:', err);
      setUpdateError(err?.message || 'Failed to update status');
    } finally {
      setSaving(false);
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

  const hasUnsavedChanges =
    status !== complaint.status ||
    (resolutionNote.trim() || '') !== (complaint.resolution_note || '');

  return (
    <>
      <div
        className="rounded-xl border p-5 sm:p-6 space-y-5 shadow-xs transition-all duration-200 hover:shadow-md"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Top Bar: Monospace ticket_code, Priority badge, Status badge, AI Triage badge */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b pb-3.5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-mono font-bold text-xs px-2.5 py-1 rounded-md border"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-strong)',
              }}
            >
              {complaint.ticket_code}
            </span>
            <span className="text-xs opacity-40" style={{ color: 'var(--text-muted)' }}>
              &bull;
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {formatDate(complaint.created_at)}
            </span>

            {complaint.reassignment_requested && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                <RefreshCw className="w-3 h-3" />
                <span>Reassignment Appeal Active</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={complaint.priority} />
            <StatusBadge status={complaint.status} />
            <AiStatusBadge
              status={complaint.ai_status}
              modelUsed={complaint.ai_model_used}
            />
          </div>
        </div>

        {/* Body: Issue title, wrapped Ward + Address, and attached photo thumbnail */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <h3
              className="text-base sm:text-lg font-bold leading-snug tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {complaint.title}
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
                {complaint.ward}
              </span>
              <span
                className="text-xs whitespace-pre-wrap break-words"
                style={{ color: 'var(--text-secondary)' }}
                title={complaint.address}
              >
                {complaint.address}
              </span>
            </div>
          </div>

          {complaint.image_url && (
            <button
              type="button"
              onClick={() => setExpandedImage(complaint.image_url)}
              className="shrink-0 relative group rounded-xl overflow-hidden border shadow-xs cursor-pointer focus:outline-none"
              style={{ borderColor: 'var(--border-subtle)' }}
              title="Click to view full photo evidence"
            >
              <img
                src={complaint.image_url}
                alt="Citizen complaint attachment"
                className="w-18 h-18 sm:w-20 sm:h-20 object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                <ExternalLink className="w-4 h-4" />
              </div>
            </button>
          )}
        </div>

        {/* Citizen Description */}
        <div
          className="rounded-xl p-3.5 border space-y-1"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <span
            className="text-[10px] font-mono font-semibold uppercase tracking-wider block"
            style={{ color: 'var(--text-muted)' }}
          >
            Citizen Grievance Description
          </span>
          <p
            className="text-xs leading-relaxed whitespace-pre-wrap"
            style={{ color: 'var(--text-primary)' }}
          >
            {complaint.description}
          </p>
        </div>

        {/* AI Urgency & Summary Callout */}
        <div
          className="rounded-xl p-4 border space-y-2.5"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Triage Category:
              </span>
              <span className="font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
                {complaint.category}
              </span>
            </div>

            {complaint.image_verified !== null && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border"
                style={{
                  backgroundColor: complaint.image_verified ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                  color: complaint.image_verified ? '#059669' : '#E11D48',
                  borderColor: complaint.image_verified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)',
                }}
              >
                <ShieldCheck className="w-3 h-3" />
                {complaint.image_verified ? 'Photo Corroborated' : 'Photo Unverified'}
              </span>
            )}
          </div>

          {complaint.ai_summary && (
            <p className="text-xs italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold not-italic" style={{ color: 'var(--text-primary)' }}>
                AI Summary:{' '}
              </span>
              &ldquo;{complaint.ai_summary}&rdquo;
            </p>
          )}

          {complaint.urgency_reason && (
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              <span className="font-semibold font-mono uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Urgency Vector:{' '}
              </span>
              {complaint.urgency_reason}
            </p>
          )}
        </div>

        {/* Reassignment Details Callout (if active) */}
        {complaint.reassignment_requested && (
          <div
            className="p-3.5 rounded-xl border space-y-1 text-xs bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
          >
            <div className="flex items-center justify-between font-semibold">
              <span>Proposed Destination: {complaint.requested_department}</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20">
                Pending Head Review
              </span>
            </div>
            {complaint.reassignment_reason && (
              <p className="text-[11px] opacity-90">
                Reason: &ldquo;{complaint.reassignment_reason}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* Action Footer / Management Panel */}
        <div
          className="pt-3 border-t space-y-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <label
                className="text-xs font-mono font-semibold uppercase tracking-wider whitespace-nowrap"
                style={{ color: 'var(--text-secondary)' }}
              >
                Status:
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-strong)',
                }}
              >
                <option value="Reported">Reported</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {/* Request Reassignment Button */}
              <button
                type="button"
                disabled={complaint.reassignment_requested}
                onClick={() => setIsReassignModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-95"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
                title={
                  complaint.reassignment_requested
                    ? 'Reassignment already submitted to Chief Admin'
                    : 'Request department reassignment'
                }
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{complaint.reassignment_requested ? 'Reassign Pending' : 'Request Reassignment'}</span>
              </button>

              {/* Save Update Button */}
              <button
                type="button"
                onClick={handleStatusSave}
                disabled={saving || !hasUnsavedChanges}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Update</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Resolution Note */}
          <div>
            <label
              className="block text-[11px] font-mono uppercase tracking-wider font-semibold mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Field Resolution Note (Published directly to citizen):
            </label>
            <textarea
              rows={2}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="e.g. Dispatched maintenance crew; pothole filled with cold asphalt mix and compacted. Area verified clear."
              className="w-full px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 transition-colors"
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-strong)',
              }}
            />
          </div>

          {/* Feedback messages */}
          {updateError && (
            <p className="text-xs text-rose-500 flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{updateError}</span>
            </p>
          )}

          {saveSuccess && (
            <p className="text-xs text-emerald-500 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Grievance status & resolution note updated successfully.</span>
            </p>
          )}
        </div>
      </div>

      {/* Reassign Modal */}
      <ReassignModal
        complaint={complaint}
        currentDepartment={currentDepartment}
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        onSuccess={(updated) => onComplaintUpdated(updated)}
      />

      {/* Expanded Image Lightbox Modal */}
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
              alt="Expanded complaint attachment"
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
    </>
  );
}
