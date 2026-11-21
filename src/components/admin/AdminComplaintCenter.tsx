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
import { StatusBadge, PriorityBadge, AiStatusBadge } from '@/components/shared/StatusBadge';
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
  ShieldCheck,
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
        throw new Error(data.error || 'Failed to run AI triage');
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

  return (
    <div
      className="rounded-3xl border shadow-sm p-6 sm:p-8 space-y-6 transition-colors"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Top Header & Navigation Tabs */}
      <div
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b pb-5"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <h2
            className="text-lg sm:text-xl font-bold flex items-center gap-2.5 tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            <ShieldAlert className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <span>Complaint Triage & Reassignment Center</span>
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Supervise automated Gemini triage, adjudicate officer reassignment appeals, and manage citywide grievance routing.
          </p>
        </div>

        {/* 3 Segmented Tabs */}
        <div
          className="flex items-center gap-1 p-1 rounded-2xl border overflow-x-auto self-start lg:self-auto"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
              activeTab === 'pending' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: activeTab === 'pending' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'pending' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: activeTab === 'pending' ? '1px solid var(--border-subtle)' : '1px solid transparent',
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Pending AI Review</span>
            <span
              className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold"
            >
              {pendingComplaints.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reassignments')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
              activeTab === 'reassignments' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: activeTab === 'reassignments' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'reassignments' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: activeTab === 'reassignments' ? '1px solid var(--border-subtle)' : '1px solid transparent',
            }}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-rose-500" />
            <span>Reassignments</span>
            <span
              className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold"
            >
              {reassignmentComplaints.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
              activeTab === 'all' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: activeTab === 'all' ? 'var(--bg-card)' : 'transparent',
              color: activeTab === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: activeTab === 'all' ? '1px solid var(--border-subtle)' : '1px solid transparent',
            }}
          >
            <Layers className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <span>All Grievances</span>
            <span
              className="px-1.5 py-0.2 rounded-full text-[10px] font-mono"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
              }}
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
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          {statusBanner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium leading-relaxed">{statusBanner.message}</div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="opacity-60 hover:opacity-100 p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: PENDING AI REVIEW */}
      {/* ========================================================= */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          {/* Action Header with Prominent Run AI Triage Button */}
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 rounded-2xl border"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div>
              <div className="flex items-center gap-2 font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{pendingComplaints.length} Tickets Awaiting Classification / Triage</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Rerun Gemini multi-model fallback chain across pending complaints or manually route jurisdiction.
              </p>
            </div>

            <button
              type="button"
              disabled={retryingAi || pendingComplaints.length === 0}
              onClick={handleRetryAllPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95 self-start sm:self-auto"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              {retryingAi ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running AI Models...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Run AI Triage on Pending</span>
                </>
              )}
            </button>
          </div>

          {/* Pending List or Empty state */}
          {pendingComplaints.length === 0 ? (
            <div
              className="py-12 px-4 text-center rounded-3xl border-2 border-dashed"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                No Review Pending Grievances
              </h3>
              <p className="text-xs max-w-sm mx-auto mt-1" style={{ color: 'var(--text-muted)' }}>
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
                    className="p-5 rounded-2xl border shadow-xs space-y-4 transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-strong)',
                    }}
                  >
                    <div
                      className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"
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
                        <span
                          className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded border"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <MapPin className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                          {item.ward}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          AI Status: Review Pending
                        </span>
                      </div>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <h4 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                          {item.title}
                        </h4>
                        <p className="text-xs whitespace-pre-wrap break-words" style={{ color: 'var(--text-secondary)' }}>
                          {item.address}
                        </p>
                        <p
                          className="text-xs p-3 rounded-xl border mt-2 leading-relaxed"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {item.description}
                        </p>
                      </div>

                      {item.image_url && (
                        <button
                          type="button"
                          onClick={() => setExpandedImage(item.image_url)}
                          className="shrink-0 rounded-xl overflow-hidden border shadow-xs cursor-pointer group"
                          style={{ borderColor: 'var(--border-subtle)' }}
                          title="Click to expand attached photo"
                        >
                          <img
                            src={item.image_url}
                            alt="Attachment"
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover group-hover:scale-105 transition-transform"
                          />
                        </button>
                      )}
                    </div>

                    {/* Inline Manual Assign Controls */}
                    <div
                      className="pt-3 border-t p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <div>
                          <label
                            className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            Assign Department:
                          </label>
                          <select
                            value={edit.department}
                            onChange={(e) =>
                              updateCardEdit(item.id, 'department', e.target.value as Department)
                            }
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none transition-colors cursor-pointer"
                            style={{
                              backgroundColor: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              borderColor: 'var(--border-strong)',
                            }}
                          >
                            {DEPARTMENTS.map((dept) => (
                              <option key={dept} value={dept}>
                                {dept}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            Priority:
                          </label>
                          <select
                            value={edit.priority}
                            onChange={(e) =>
                              updateCardEdit(item.id, 'priority', e.target.value as TicketPriority)
                            }
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none transition-colors cursor-pointer"
                            style={{
                              backgroundColor: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              borderColor: 'var(--border-strong)',
                            }}
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
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 self-end sm:self-auto hover:opacity-95"
                        style={{
                          backgroundColor: 'var(--accent)',
                          color: 'var(--accent-fg)',
                        }}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Assignment</span>
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
          <div
            className="p-4 sm:p-5 rounded-2xl border"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <ArrowRightLeft className="w-4 h-4 text-rose-500" />
              <span>{reassignmentComplaints.length} Department Reassignment Appeals</span>
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Department resolvers have requested reassignment for tickets outside their jurisdiction. Review reasons and adjudicate transfer.
            </p>
          </div>

          {reassignmentComplaints.length === 0 ? (
            <div
              className="py-12 px-4 text-center rounded-3xl border-2 border-dashed"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                No Reassignment Appeals
              </h3>
              <p className="text-xs max-w-sm mx-auto mt-1" style={{ color: 'var(--text-muted)' }}>
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
                    className="p-5 rounded-2xl border shadow-xs space-y-4"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-strong)',
                    }}
                  >
                    <div
                      className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"
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
                        <span
                          className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded border"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <MapPin className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                          {item.ward}
                        </span>
                        <PriorityBadge priority={item.priority} />
                      </div>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {item.title}
                      </h4>
                      <p className="text-xs mt-0.5 whitespace-pre-wrap break-words" style={{ color: 'var(--text-secondary)' }}>
                        {item.address}
                      </p>
                    </div>

                    {/* Department Transition Comparison Box */}
                    <div
                      className="p-4 rounded-xl border space-y-2.5"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          Currently With:
                        </span>
                        <span
                          className="px-2.5 py-1 rounded-md font-bold border"
                          style={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {item.department}
                        </span>
                        <span className="font-bold text-base" style={{ color: 'var(--accent)' }}>
                          &rarr;
                        </span>
                        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          Requested Destination:
                        </span>
                        <span
                          className="px-2.5 py-1 rounded-md font-bold border"
                          style={{
                            backgroundColor: 'var(--accent-soft)',
                            color: 'var(--accent)',
                            borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                          }}
                        >
                          {item.requested_department}
                        </span>
                      </div>

                      {item.reassignment_reason && (
                        <div
                          className="p-2.5 rounded-lg border text-xs leading-relaxed"
                          style={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <span className="font-mono uppercase tracking-wider text-[10px] font-bold block mb-0.5" style={{ color: 'var(--text-muted)' }}>
                            Resolver Justification:
                          </span>
                          &ldquo;{item.reassignment_reason}&rdquo;
                        </div>
                      )}
                    </div>

                    {/* Approval & Department Override Form */}
                    <div
                      className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="flex items-center gap-2">
                        <label
                          className="text-xs font-mono font-semibold uppercase tracking-wider whitespace-nowrap"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Destination Override:
                        </label>
                        <select
                          value={edit.targetDept}
                          onChange={(e) =>
                            updateCardEdit(item.id, 'targetDept', e.target.value as Department)
                          }
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none transition-colors cursor-pointer"
                          style={{
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            borderColor: 'var(--border-strong)',
                          }}
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
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject Transfer</span>
                        </button>

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleResolveReassignment(item, 'approve')}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Approve Transfer</span>
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
      {/* TAB 3: ALL GRIEVANCES */}
      {/* ========================================================= */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Department & Status Filter Bar */}
          <div
            className="p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                Filter Municipal Roster:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-strong)',
                  }}
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
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-strong)',
                  }}
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
            <div
              className="py-12 px-4 text-center rounded-3xl border-2 border-dashed text-xs"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
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
                    className="p-5 rounded-2xl border shadow-xs space-y-4 transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div
                      className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"
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
                        <span
                          className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded border"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <MapPin className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                          {item.ward}
                        </span>
                        <PriorityBadge priority={item.priority} />
                        <StatusBadge status={item.status} />
                      </div>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <h4 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                          {item.title}
                        </h4>
                        <p className="text-xs whitespace-pre-wrap break-words" style={{ color: 'var(--text-secondary)' }}>
                          {item.address}
                        </p>
                        <p
                          className="text-xs p-3 rounded-xl border mt-2 leading-relaxed"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {item.description}
                        </p>
                      </div>

                      {item.image_url && (
                        <button
                          type="button"
                          onClick={() => setExpandedImage(item.image_url)}
                          className="shrink-0 rounded-xl overflow-hidden border shadow-xs cursor-pointer group"
                          style={{ borderColor: 'var(--border-subtle)' }}
                          title="Click to view full photo"
                        >
                          <img
                            src={item.image_url}
                            alt="Attachment"
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover group-hover:scale-105 transition-transform"
                          />
                        </button>
                      )}
                    </div>

                    {/* Inline Chief Admin Override Controls */}
                    <div
                      className="pt-3 border-t p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <div>
                          <label
                            className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            Department Routing:
                          </label>
                          <select
                            value={edit.department}
                            onChange={(e) =>
                              updateCardEdit(item.id, 'department', e.target.value as Department)
                            }
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none transition-colors cursor-pointer"
                            style={{
                              backgroundColor: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              borderColor: 'var(--border-strong)',
                            }}
                          >
                            {DEPARTMENTS.map((dept) => (
                              <option key={dept} value={dept}>
                                {dept}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            Priority:
                          </label>
                          <select
                            value={edit.priority}
                            onChange={(e) =>
                              updateCardEdit(item.id, 'priority', e.target.value as TicketPriority)
                            }
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none transition-colors cursor-pointer"
                            style={{
                              backgroundColor: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              borderColor: 'var(--border-strong)',
                            }}
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
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 self-end sm:self-auto hover:opacity-95"
                        style={{
                          backgroundColor: 'var(--accent)',
                          color: 'var(--accent-fg)',
                        }}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Update Routing</span>
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
              alt="Expanded Attachment"
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
