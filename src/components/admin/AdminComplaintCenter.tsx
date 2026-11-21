'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Complaint,
  DEPARTMENTS,
  Department,
  TicketPriority,
  TicketStatus,
} from '@/types/database';
import {
  Sparkles,
  ArrowRightLeft,
  Layers,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  RefreshCw,
  Save,
  Check,
  X,
  Loader2,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface AdminComplaintCenterProps {
  complaints: Complaint[];
  onComplaintsUpdated: (complaints: Complaint[]) => void;
}

type TabType = 'pending' | 'reassignments' | 'all';

export function AdminComplaintCenter({
  complaints,
  onComplaintsUpdated,
}: AdminComplaintCenterProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  // AI Retry loading & feedback
  const [retryingAi, setRetryingAi] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Individual card action loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Expanded image modal
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Filters for "All Complaints" tab
  const [filterDept, setFilterDept] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Local editing state for cards: { [complaintId]: { department, priority, targetDept } }
  const [cardEdits, setCardEdits] = useState<
    Record<
      string,
      {
        department: Department;
        priority: TicketPriority;
        targetDept: Department;
      }
    >
  >({});

  const getCardEdit = (c: Complaint) => {
    return (
      cardEdits[c.id] || {
        department: (DEPARTMENTS.find((d) => d === c.department) || DEPARTMENTS[0]) as Department,
        priority: c.priority || 'Medium',
        targetDept: (DEPARTMENTS.find((d) => d === c.requested_department) ||
          DEPARTMENTS[0]) as Department,
      }
    );
  };

  const updateCardEdit = (
    id: string,
    field: 'department' | 'priority' | 'targetDept',
    value: any
  ) => {
    setCardEdits((prev) => {
      const current = prev[id] || {
        department: DEPARTMENTS[0],
        priority: 'Medium',
        targetDept: DEPARTMENTS[0],
      };
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  // Sync state update helper
  const updateComplaintInState = (updated: Complaint) => {
    const nextList = complaints.map((c) => (c.id === updated.id ? updated : c));
    onComplaintsUpdated(nextList);
    router.refresh();
  };

  // 1. Retry AI on all pending
  const handleRetryAllPending = async () => {
    setRetryingAi(true);
    setStatusBanner(null);

    try {
      const res = await fetch('/api/admin/retry-ai', { method: 'POST' });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to retry AI triage');
      }

      setStatusBanner({
        type: 'success',
        message: `AI Triage completed: ${data.updated} ticket(s) classified and routed successfully. (${data.remaining} remaining)`,
      });

      // Refetch latest complaints list from server API
      const refreshRes = await fetch('/api/admin/complaints');
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const nextList = refreshData.complaints || [];
        onComplaintsUpdated(nextList);
      }
      router.refresh();
    } catch (err: any) {
      console.error('Retry AI error:', err);
      setStatusBanner({
        type: 'error',
        message: err?.message || 'Error occurred while running AI retry.',
      });
    } finally {
      setRetryingAi(false);
    }
  };

  // 2. Manual Triage Assignment
  const handleManualTriage = async (complaint: Complaint) => {
    const edit = getCardEdit(complaint);
    setActionLoadingId(complaint.id);
    setStatusBanner(null);

    try {
      const res = await fetch(`/api/admin/complaints/${complaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_triage',
          department: edit.department,
          priority: edit.priority,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to assign complaint');
      }

      updateComplaintInState(data.complaint);
      setStatusBanner({
        type: 'success',
        message: `Ticket ${complaint.ticket_code} manually assigned to "${edit.department}" (${edit.priority} priority).`,
      });
    } catch (err: any) {
      setStatusBanner({ type: 'error', message: err?.message || 'Failed to assign ticket.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Resolve Reassignment Request (Approve or Reject)
  const handleResolveReassignment = async (
    complaint: Complaint,
    decision: 'approve' | 'reject'
  ) => {
    const edit = getCardEdit(complaint);
    setActionLoadingId(complaint.id);
    setStatusBanner(null);

    try {
      const res = await fetch(`/api/admin/complaints/${complaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_reassignment',
          decision,
          target_department: decision === 'approve' ? edit.targetDept : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to resolve reassignment');
      }

      updateComplaintInState(data.complaint);
      setStatusBanner({
        type: 'success',
        message:
          decision === 'approve'
            ? `Reassignment approved! Ticket ${complaint.ticket_code} moved to "${data.complaint.department}".`
            : `Reassignment rejected. Ticket ${complaint.ticket_code} remains with "${complaint.department}".`,
      });
    } catch (err: any) {
      setStatusBanner({ type: 'error', message: err?.message || 'Action failed.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Direct Reassign / Override on any ticket
  const handleDirectReassign = async (complaint: Complaint) => {
    const edit = getCardEdit(complaint);
    setActionLoadingId(complaint.id);
    setStatusBanner(null);

    try {
      const res = await fetch(`/api/admin/complaints/${complaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reassign',
          department: edit.department,
          priority: edit.priority,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update ticket routing');
      }

      updateComplaintInState(data.complaint);
      setStatusBanner({
        type: 'success',
        message: `Ticket ${complaint.ticket_code} updated to ${edit.department} (${edit.priority}).`,
      });
    } catch (err: any) {
      setStatusBanner({ type: 'error', message: err?.message || 'Update failed.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered views for each tab
  const pendingComplaints = complaints.filter((c) => c.ai_status === 'review_pending');
  const reassignmentComplaints = complaints.filter((c) => c.reassignment_requested);

  const allFilteredComplaints = complaints.filter((c) => {
    if (filterDept !== 'All' && c.department !== filterDept) return false;
    if (filterStatus !== 'All' && c.status !== filterStatus) return false;
    return true;
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'Critical':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-300">
            Critical
          </span>
        );
      case 'High':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
            High
          </span>
        );
      case 'Low':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 text-slate-700 border border-slate-200">
            Low
          </span>
        );
      case 'Medium':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-blue-50 text-blue-700 border border-blue-200">
            Medium
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            Complaint Triage & Reassignment Queue
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Supervise automated Gemini triage, adjudicate officer reassignment appeals, and manage citywide grievance routing.
          </p>
        </div>

        {/* 3 Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'pending'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Pending AI Review
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'pending'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {pendingComplaints.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reassignments')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'reassignments'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-rose-500" />
            Reassignments
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'reassignments'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {reassignmentComplaints.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            All Complaints
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'all'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {complaints.length}
            </span>
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      {statusBanner && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {statusBanner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{statusBanner.message}</div>
          <button
            onClick={() => setStatusBanner(null)}
            className="text-slate-400 hover:text-slate-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: PENDING AI REVIEW */}
      {/* ========================================================= */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          {/* Action Header with Retry AI button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>{pendingComplaints.length} Tickets Awaiting Classification / Triage</span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Rerun Gemini multi-model classification or manually assign municipal jurisdiction.
              </p>
            </div>

            <button
              type="button"
              disabled={retryingAi || pendingComplaints.length === 0}
              onClick={handleRetryAllPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-700 focus:ring-4 focus:ring-amber-200 shadow-sm transition-all disabled:opacity-50 self-start sm:self-auto"
            >
              {retryingAi ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running AI Models...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Retry AI Triage on All Pending
                </>
              )}
            </button>
          </div>

          {/* Pending List or Empty state */}
          {pendingComplaints.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No Review Pending Grievances</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                All citizen complaints have been successfully triaged and assigned to active municipal departments.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingComplaints.map((item) => {
                const edit = getCardEdit(item);
                const isLoading = actionLoadingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4 hover:border-amber-300 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-slate-900 text-emerald-400">
                          {item.ticket_code}
                        </span>
                        <span className="text-xs text-slate-400">&bull;</span>
                        <span className="text-xs text-slate-500">{item.ward}</span>
                        <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          AI Status: Review Pending
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                        <p className="text-xs text-slate-600">{item.address}</p>
                        <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                          {item.description}
                        </p>
                      </div>

                      {item.image_url && (
                        <button
                          type="button"
                          onClick={() => setExpandedImage(item.image_url)}
                          className="shrink-0 rounded-xl overflow-hidden border border-slate-200"
                        >
                          <img
                            src={item.image_url}
                            alt="Attachment"
                            className="w-16 h-16 object-cover"
                          />
                        </button>
                      )}
                    </div>

                    {/* Inline Manual Assign Controls */}
                    <div className="pt-3 border-t border-slate-100 bg-slate-50/70 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Assign Department:
                          </label>
                          <select
                            value={edit.department}
                            onChange={(e) =>
                              updateCardEdit(item.id, 'department', e.target.value as Department)
                            }
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                          >
                            {DEPARTMENTS.map((dept) => (
                              <option key={dept} value={dept}>
                                {dept}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Priority:
                          </label>
                          <select
                            value={edit.priority}
                            onChange={(e) =>
                              updateCardEdit(item.id, 'priority', e.target.value as TicketPriority)
                            }
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleManualTriage(item)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 self-end sm:self-auto"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            Save Assignment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: REASSIGNMENT REQUESTS */}
      {/* ========================================================= */}
      {activeTab === 'reassignments' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
            <h3 className="font-bold text-sm text-rose-950 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-rose-600" />
              <span>{reassignmentComplaints.length} Department Reassignment Appeals</span>
            </h3>
            <p className="text-xs text-rose-800 mt-0.5">
              Department resolvers have requested reassignment for tickets outside their jurisdiction. Review reasons and adjudicate transfer.
            </p>
          </div>

          {reassignmentComplaints.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No Reassignment Appeals</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                There are no pending department transfer requests from officers at this time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reassignmentComplaints.map((item) => {
                const edit = getCardEdit(item);
                const isLoading = actionLoadingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border border-amber-200 bg-white shadow-xs space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-slate-900 text-emerald-400">
                          {item.ticket_code}
                        </span>
                        <span className="text-xs text-slate-400">&bull;</span>
                        <span className="text-xs text-slate-500">{item.ward}</span>
                        {getPriorityBadge(item.priority)}
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{item.address}</p>
                    </div>

                    {/* Department Transition Indicator */}
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-600">Currently With:</span>
                        <span className="px-2 py-0.5 rounded font-bold bg-slate-200/80 text-slate-800">
                          {item.department}
                        </span>
                        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                        <span className="font-semibold text-slate-600">Requested Transfer:</span>
                        <span className="px-2 py-0.5 rounded font-bold bg-amber-200 text-amber-900">
                          {item.requested_department}
                        </span>
                      </div>

                      {item.reassignment_reason && (
                        <p className="text-xs text-amber-900 italic">
                          &ldquo;{item.reassignment_reason}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Approval & Department Override Form */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                          Destination Override:
                        </label>
                        <select
                          value={edit.targetDept}
                          onChange={(e) =>
                            updateCardEdit(item.id, 'targetDept', e.target.value as Department)
                          }
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                        >
                          {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleResolveReassignment(item, 'reject')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject Transfer
                        </button>

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleResolveReassignment(item, 'approve')}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Approve Transfer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ALL COMPLAINTS */}
      {/* ========================================================= */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Department & Status Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">Filter Roster:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                >
                  <option value="All">All Departments</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                  <option value="Unassigned">Unassigned</option>
                </select>
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                >
                  <option value="All">All Statuses</option>
                  <option value="Reported">Reported</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>
          </div>

          {allFilteredComplaints.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
              No complaints match the selected department and status filters.
            </div>
          ) : (
            <div className="space-y-4">
              {allFilteredComplaints.map((item) => {
                const edit = getCardEdit(item);
                const isLoading = actionLoadingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-slate-900 text-emerald-400">
                          {item.ticket_code}
                        </span>
                        <span className="text-xs text-slate-400">&bull;</span>
                        <span className="text-xs text-slate-500">{item.ward}</span>
                        {getPriorityBadge(item.priority)}
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            item.status === 'Resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'In Progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                        <p className="text-xs text-slate-500">{item.address}</p>
                        <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                          {item.description}
                        </p>
                      </div>

                      {item.image_url && (
                        <button
                          type="button"
                          onClick={() => setExpandedImage(item.image_url)}
                          className="shrink-0 rounded-xl overflow-hidden border border-slate-200"
                        >
                          <img
                            src={item.image_url}
                            alt="Attachment"
                            className="w-16 h-16 object-cover"
                          />
                        </button>
                      )}
                    </div>

                    {/* Inline Chief Admin Override Controls */}
                    <div className="pt-3 border-t border-slate-100 bg-slate-50/70 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Department Routing:
                          </label>
                          <select
                            value={edit.department}
                            onChange={(e) =>
                              updateCardEdit(item.id, 'department', e.target.value as Department)
                            }
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                          >
                            {DEPARTMENTS.map((dept) => (
                              <option key={dept} value={dept}>
                                {dept}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Priority:
                          </label>
                          <select
                            value={edit.priority}
                            onChange={(e) =>
                              updateCardEdit(item.id, 'priority', e.target.value as TicketPriority)
                            }
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleDirectReassign(item)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 self-end sm:self-auto"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            Update Routing
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
              alt="Expanded Attachment"
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
