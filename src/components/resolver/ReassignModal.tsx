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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Request Department Reassignment</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{complaint.ticket_code}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-950">Action Blocked</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Currently Assigned Department
            </label>
            <input
              type="text"
              disabled
              value={currentDepartment}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Department <span className="text-rose-500">*</span>
            </label>
            <select
              value={targetDepartment}
              onChange={(e) => setTargetDepartment(e.target.value as Department)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              {eligibleDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reassignment Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this grievance falls outside your jurisdiction (e.g. Electrical wiring hazard inside water drainage sump, requires Electrical team)..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>

          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
            Note: This request will be routed directly to the Chief Administrator for review and formal department transfer.
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Routing to Admin...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Submit Reassignment Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
