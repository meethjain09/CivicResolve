'use client';

import React, { useState } from 'react';
import { Complaint, DEPARTMENTS, Department } from '@/types/database';
import { RefreshCw, AlertCircle, X, Loader2, ArrowRightLeft } from 'lucide-react';

interface ReassignModalProps {
  complaint: Complaint;
  currentDepartment: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Complaint) => void;
}

export function ReassignModal({
  complaint,
  currentDepartment,
  isOpen,
  onClose,
  onSuccess,
}: ReassignModalProps) {
  // Candidate departments excluding current department
  const eligibleDepartments = DEPARTMENTS.filter((d) => d !== currentDepartment);

  const [targetDepartment, setTargetDepartment] = useState<Department>(
    eligibleDepartments[0] || DEPARTMENTS[0]
  );
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!reason.trim()) {
      setErrorMsg('Please specify why this ticket should be reassigned.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/resolver/complaints/${complaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_reassignment',
          requested_department: targetDepartment,
          reassignment_reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to request reassignment');
      }

      onSuccess(data.complaint);
      onClose();
    } catch (err: any) {
      console.error('Reassignment request error:', err);
      setErrorMsg(err?.message || 'Failed to submit reassignment request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl border space-y-5 animate-in zoom-in-95"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-strong)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between border-b pb-4"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Request Department Reassignment
              </h3>
              <p className="text-xs font-mono font-bold mt-0.5" style={{ color: 'var(--accent)' }}>
                {complaint.ticket_code}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <div>
              <p className="font-semibold text-rose-600 dark:text-rose-400">Action Blocked</p>
              <p className="mt-0.5 opacity-90">{errorMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current department */}
          <div>
            <label
              className="block text-[11px] font-mono font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Currently Assigned Department
            </label>
            <input
              type="text"
              disabled
              value={currentDepartment}
              className="w-full px-3.5 py-2 text-xs rounded-xl font-medium cursor-not-allowed opacity-75"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            />
          </div>

          {/* Target department */}
          <div>
            <label
              className="block text-[11px] font-mono font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Target Department <span className="text-rose-500">*</span>
            </label>
            <select
              value={targetDepartment}
              onChange={(e) => setTargetDepartment(e.target.value as Department)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-strong)',
              }}
            >
              {eligibleDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label
              className="block text-[11px] font-mono font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Reassignment Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this grievance falls outside your jurisdiction (e.g. Electrical wiring hazard inside water drainage sump, requires Electrical team)..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 transition-colors"
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-strong)',
              }}
            />
          </div>

          {/* Institutional note */}
          <div className="p-3 rounded-xl border text-[11px] leading-relaxed bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300">
            Institutional Audit Notice: This request will be placed directly in the Chief Administrator review queue for formal verification and department reassignment.
          </div>

          {/* Actions */}
          <div
            className="flex items-center justify-end gap-3 pt-3 border-t"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting to Admin...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Submit Reassignment Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
