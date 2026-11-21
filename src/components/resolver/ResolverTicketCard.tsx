'use client';

import React, { useState } from 'react';
import { Complaint, TicketStatus } from '@/types/database';
import { ReassignModal } from './ReassignModal';
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

  const getPriorityBadge = (p: string) => {
    switch (p) {
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

  const hasUnsavedChanges =
    status !== complaint.status ||
    (resolutionNote.trim() || '') !== (complaint.resolution_note || '');

  return (
    <>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 space-y-5">
        {/* Top Header: Code, Priority, AI status & Reassignment Flag */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-slate-900 text-emerald-400">
              {complaint.ticket_code}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs text-slate-500">{formatDate(complaint.created_at)}</span>

            {complaint.reassignment_requested && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                <RefreshCw className="w-3 h-3 text-amber-600" />
                Reassignment Pending Admin Review
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {getPriorityBadge(complaint.priority)}

            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                complaint.ai_status === 'completed'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : complaint.ai_status === 'manual_override'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              {complaint.ai_status === 'completed'
                ? 'AI Auto-Triaged'
                : complaint.ai_status === 'manual_override'
                ? 'Admin Overridden'
                : 'Review Pending'}
            </span>
          </div>
        </div>

        {/* Title, Location & Photo */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <h3 className="text-lg font-bold text-slate-900 leading-snug">
              {complaint.title}
            </h3>

            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {complaint.ward}
              </span>
              <span className="text-slate-600 break-words whitespace-pre-wrap">
                {complaint.address}
              </span>
            </div>
          </div>

          {complaint.image_url && (
            <button
              type="button"
              onClick={() => setExpandedImage(complaint.image_url)}
              className="shrink-0 relative group rounded-xl overflow-hidden border border-slate-200 shadow-xs"
              title="Click to expand attached photo"
            >
              <img
                src={complaint.image_url}
                alt="Citizen complaint attachment"
                className="w-18 h-18 sm:w-20 sm:h-20 object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                <ExternalLink className="w-4 h-4" />
              </div>
            </button>
          )}
        </div>

        {/* Citizen Description */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Citizen Grievance Description
          </span>
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
            {complaint.description}
          </p>
        </div>

        {/* AI Triage & Urgency Briefing */}
        <div className="bg-indigo-50/60 rounded-2xl p-4 border border-indigo-100 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-slate-800">Classified Category:</span>
              <span className="font-semibold text-indigo-800">{complaint.category}</span>
            </div>

            {complaint.image_verified !== null && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                  complaint.image_verified
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                {complaint.image_verified ? 'Image Corroborated' : 'Image Unverified'}
              </span>
            )}
          </div>

          {complaint.ai_summary && (
            <p className="text-xs text-slate-700 leading-relaxed">
              <span className="font-semibold text-slate-900">AI Summary: </span>
              {complaint.ai_summary}
            </p>
          )}

          {complaint.urgency_reason && (
            <p className="text-[11px] text-indigo-900">
              <span className="font-semibold">Urgency Reason: </span>
              {complaint.urgency_reason}
            </p>
          )}
        </div>

        {/* Reassignment details if pending */}
        {complaint.reassignment_requested && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 text-xs">
            <div className="flex items-center justify-between font-semibold text-amber-900">
              <span>Requested Destination: {complaint.requested_department}</span>
              <span className="text-[10px] uppercase bg-amber-200/80 px-1.5 py-0.2 rounded">
                Pending Admin Action
              </span>
            </div>
            {complaint.reassignment_reason && (
              <p className="text-amber-800 text-[11px]">
                Reason: &ldquo;{complaint.reassignment_reason}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* Inline Status & Resolution Note Management */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                Work Status:
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border focus:outline-none transition-colors ${
                  status === 'Resolved'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : status === 'In Progress'
                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  complaint.reassignment_requested
                    ? 'Reassignment already submitted to Chief Admin'
                    : 'Request department reassignment'
                }
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {complaint.reassignment_requested ? 'Reassign Pending' : 'Request Reassignment'}
              </button>

              {/* Save Status & Note Button */}
              <button
                type="button"
                onClick={handleStatusSave}
                disabled={saving || !hasUnsavedChanges}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save Update
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Resolution Note text area */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Field Resolution Note (visible to citizen):
            </label>
            <textarea
              rows={2}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="e.g. Dispatched crew on Nov 21; pothole filled with asphalt mix and compacted."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          {/* Inline alert messages */}
          {updateError && (
            <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {updateError}
            </p>
          )}

          {saveSuccess && (
            <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ticket successfully updated.
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

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden bg-slate-900 shadow-2xl">
            <img
              src={expandedImage}
              alt="Expanded complaint attachment"
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
    </>
  );
}
