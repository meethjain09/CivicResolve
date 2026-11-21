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
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { RippleButton } from '@/components/ui/RippleButton';
import { NumberTicker } from '@/components/ui/NumberTicker';
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
  Eye,
  FileText,
  Calendar,
  Cpu,
} from 'lucide-react';

interface AdminComplaintCenterProps {
  complaints: Complaint[];
  onComplaintsUpdated: (complaints: Complaint[]) => void;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  departmentFilter?: string | null;
  onClearDepartmentFilter?: () => void;
}

type TabType = 'pending' | 'reassignments' | 'all';

export function AdminComplaintCenter({
  complaints,
  onComplaintsUpdated,
  activeTab: activeTabProp,
  onTabChange,
  departmentFilter,
  onClearDepartmentFilter,
}: AdminComplaintCenterProps) {
  const router = useRouter();
  const [internalActiveTab, setInternalActiveTab] = useState<TabType>('pending');
  const activeTab = activeTabProp || internalActiveTab;

  const setActiveTab = (tab: TabType) => {
    setInternalActiveTab(tab);
    onTabChange?.(tab);
  };

  // AI Retry loading & feedback
  const [retryingAi, setRetryingAi] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Individual card action loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Expanded image modal & Slide-over ticket inspector
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [inspectedTicket, setInspectedTicket] = useState<Complaint | null>(null);

  // Filters for "All Complaints" tab
  const [filterDept, setFilterDept] = useState<string>(departmentFilter || 'All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Sync external department filter prop
  React.useEffect(() => {
    if (departmentFilter) {
      setFilterDept(departmentFilter);
      if (activeTab !== 'all') {
        setActiveTab('all');
      }
    }
  }, [departmentFilter]);

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
    if (inspectedTicket?.id === updated.id) {
      setInspectedTicket(updated);
    }
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
          <RippleButton
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
              <NumberTicker value={pendingComplaints.length} />
            </span>
          </RippleButton>

          <RippleButton
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
              <NumberTicker value={reassignmentComplaints.length} />
            </span>
          </RippleButton>

          <RippleButton
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
              <NumberTicker value={complaints.length} />
            </span>
          </RippleButton>
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
          <RippleButton
            type="button"
            onClick={() => setStatusBanner(null)}
            className="opacity-60 hover:opacity-100 p-0.5 cursor-pointer rounded-lg"
          >
            <X className="w-4 h-4" />
          </RippleButton>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: PENDING AI REVIEW */}
      {/* ========================================================= */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          {/* Action Header with Prominent Run AI Triage Button */}
          <SpotlightCard className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span><NumberTicker value={pendingComplaints.length} /> Tickets Awaiting Classification / Triage</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Rerun Gemini multi-model fallback chain across pending complaints or manually route jurisdiction.
              </p>
            </div>

            <RippleButton
              type="button"
              disabled={retryingAi || pendingComplaints.length === 0}
              onClick={handleRetryAllPending}
              className="btn-shimmer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95 self-start sm:self-auto active:scale-[0.98]"
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
            </RippleButton>
          </SpotlightCard>

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
              {pendingComplaints.map((item, idx) => {
                const edit = getCardEdit(item);
                const isLoading = actionLoadingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${Math.min(idx * 60, 360)}ms` }}
                  >
                    <SpotlightCard className="p-5 space-y-4">
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
                          {item.pincode ? `PIN ${item.pincode}` : 'Pincode N/A'}
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
                        <RippleButton
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
                        </RippleButton>
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

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <RippleButton
                          type="button"
                          onClick={() => setInspectedTicket(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer hover:bg-[var(--bg-elevated)] hover:-translate-y-0.5 active:scale-95"
                          style={{
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </RippleButton>

                        <RippleButton
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleManualTriage(item)}
                          className="btn-shimmer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 hover:opacity-95 active:scale-[0.98]"
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
                        </RippleButton>
                      </div>
                    </div>
                  </SpotlightCard>
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
          <SpotlightCard className="p-4 sm:p-5">
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <ArrowRightLeft className="w-4 h-4 text-rose-500" />
              <span><NumberTicker value={reassignmentComplaints.length} /> Department Reassignment Appeals</span>
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Department resolvers have requested reassignment for tickets outside their jurisdiction. Review reasons and adjudicate transfer.
            </p>
          </SpotlightCard>

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
              {reassignmentComplaints.map((item, idx) => {
                const edit = getCardEdit(item);
                const isLoading = actionLoadingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${Math.min(idx * 60, 360)}ms` }}
                  >
                    <SpotlightCard className="p-5 space-y-4">
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
                          {item.pincode ? `PIN ${item.pincode}` : 'Pincode N/A'}
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
                        <RippleButton
                          type="button"
                          onClick={() => setInspectedTicket(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer hover:bg-[var(--bg-elevated)] hover:-translate-y-0.5 active:scale-95"
                          style={{
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </RippleButton>

                        <RippleButton
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleResolveReassignment(item, 'reject')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 active:scale-95"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject Transfer</span>
                        </RippleButton>

                        <RippleButton
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleResolveReassignment(item, 'approve')}
                          className="btn-shimmer inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Approve Transfer</span>
                        </RippleButton>
                      </div>
                    </div>
                  </SpotlightCard>
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

          {/* Active Department Filter Banner */}
          {filterDept !== 'All' && (
            <div
              className="flex items-center justify-between p-3 rounded-xl border text-xs"
              style={{
                backgroundColor: 'var(--accent-soft)',
                borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
              }}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--accent)]" />
                <span style={{ color: 'var(--text-primary)' }}>
                  Filtered by department: <strong className="text-[var(--accent)]">{filterDept}</strong> (<NumberTicker value={allFilteredComplaints.length} /> tickets)
                </span>
              </div>
              <RippleButton
                type="button"
                onClick={() => {
                  setFilterDept('All');
                  onClearDepartmentFilter?.();
                }}
                className="font-mono text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Department Filter</span>
              </RippleButton>
            </div>
          )}

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
              {allFilteredComplaints.map((item, idx) => {
                const edit = getCardEdit(item);
                const isLoading = actionLoadingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${Math.min(idx * 60, 360)}ms` }}
                  >
                    <SpotlightCard className="p-5 space-y-4">
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
                          {item.pincode ? `PIN ${item.pincode}` : 'Pincode N/A'}
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
                        <RippleButton
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
                        </RippleButton>
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

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <RippleButton
                          type="button"
                          onClick={() => setInspectedTicket(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer hover:bg-[var(--bg-elevated)] hover:-translate-y-0.5 active:scale-95"
                          style={{
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </RippleButton>

                        <RippleButton
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleDirectReassign(item)}
                          className="btn-shimmer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 hover:opacity-95 active:scale-[0.98]"
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
                        </RippleButton>
                      </div>
                    </div>
                  </SpotlightCard>
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
            <RippleButton
              type="button"
              onClick={() => setExpandedImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer"
              title="Close image preview"
            >
              <X className="w-4 h-4" />
            </RippleButton>
          </div>
        </div>
      )}

      {/* Slide-over Ticket Detail Inspector Drawer */}
      {inspectedTicket && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setInspectedTicket(null)}
        >
          <div
            className="relative w-full max-w-2xl h-full overflow-y-auto border-l shadow-2xl p-6 sm:p-8 space-y-6 flex flex-col justify-between animate-in slide-in-from-right duration-200"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-strong)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div
                className="flex items-start justify-between gap-4 border-b pb-4"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className="font-mono font-extrabold text-sm px-3 py-1 rounded-lg border shadow-xs"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border-strong)',
                      }}
                    >
                      {inspectedTicket.ticket_code}
                    </span>
                    <StatusBadge status={inspectedTicket.status} />
                    <PriorityBadge priority={inspectedTicket.priority} />
                    <AiStatusBadge status={inspectedTicket.ai_status} />
                  </div>
                  <h3
                    className="text-lg sm:text-xl font-bold tracking-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {inspectedTicket.title}
                  </h3>
                </div>

                <RippleButton
                  type="button"
                  onClick={() => setInspectedTicket(null)}
                  className="p-2 rounded-xl border hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer shrink-0"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                  title="Close Inspector"
                >
                  <X className="w-5 h-5" />
                </RippleButton>
              </div>

              {/* Core Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div
                  className="p-3.5 rounded-xl border space-y-1"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <span className="font-mono uppercase tracking-wider text-[10px] font-bold block" style={{ color: 'var(--text-muted)' }}>
                    Jurisdiction / Department
                  </span>
                  <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    <Building2 className="w-4 h-4 text-[var(--accent)]" />
                    <span>{inspectedTicket.department}</span>
                  </div>
                </div>

                <div
                  className="p-3.5 rounded-xl border space-y-1"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <span className="font-mono uppercase tracking-wider text-[10px] font-bold block" style={{ color: 'var(--text-muted)' }}>
                    Postal Jurisdiction
                  </span>
                  <div className="font-bold flex items-center gap-1.5 font-mono" style={{ color: 'var(--text-primary)' }}>
                    <MapPin className="w-4 h-4 text-[var(--accent)]" />
                    <span>PIN {inspectedTicket.pincode}</span>
                  </div>
                </div>

                <div
                  className="p-3.5 rounded-xl border space-y-1"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <span className="font-mono uppercase tracking-wider text-[10px] font-bold block" style={{ color: 'var(--text-muted)' }}>
                    Submission Timestamp
                  </span>
                  <div className="font-mono text-xs flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(inspectedTicket.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div
                  className="p-3.5 rounded-xl border space-y-1"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <span className="font-mono uppercase tracking-wider text-[10px] font-bold block" style={{ color: 'var(--text-muted)' }}>
                    Citizen Filing Category
                  </span>
                  <div className="font-semibold text-xs flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <FileText className="w-3.5 h-3.5" />
                    <span>{inspectedTicket.citizen_category || 'General Citizen Complaint'}</span>
                  </div>
                </div>
              </div>

              {/* Exact Location */}
              <div
                className="p-4 rounded-xl border space-y-1.5 text-xs"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <span className="font-mono uppercase tracking-wider text-[10px] font-bold block" style={{ color: 'var(--text-muted)' }}>
                  Incident Location Address
                </span>
                <p className="font-medium whitespace-pre-wrap break-words leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {inspectedTicket.address}
                </p>
              </div>

              {/* Citizen Description */}
              <div className="space-y-1.5 text-xs">
                <span className="font-mono uppercase tracking-wider text-[10px] font-bold block" style={{ color: 'var(--text-muted)' }}>
                  Grievance Description
                </span>
                <div
                  className="p-4 rounded-xl border text-xs leading-relaxed"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {inspectedTicket.description}
                </div>
              </div>

              {/* Evidence Photo Preview */}
              {inspectedTicket.image_url && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono uppercase tracking-wider text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                      Photo Evidence Attachment
                    </span>
                    {inspectedTicket.image_verified !== null && (
                      <span
                        className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          inspectedTicket.image_verified
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{inspectedTicket.image_verified ? 'AI Verified Evidence' : 'Unverified Evidence'}</span>
                      </span>
                    )}
                  </div>
                  <div
                    onClick={() => setExpandedImage(inspectedTicket.image_url)}
                    className="relative rounded-2xl overflow-hidden border shadow-sm cursor-pointer group max-h-56"
                    style={{ borderColor: 'var(--border-subtle)' }}
                    title="Click to zoom photo"
                  >
                    <img
                      src={inspectedTicket.image_url}
                      alt="Attachment Preview"
                      className="w-full h-56 object-cover group-hover:scale-102 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-mono font-bold">
                      Click to expand full resolution
                    </div>
                  </div>
                </div>
              )}

              {/* Gemini AI Telemetry & Audit */}
              <div
                className="p-4 rounded-2xl border space-y-3 text-xs"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--text-primary)' }}>
                    <Cpu className="w-4 h-4 text-purple-500" />
                    <span>Gemini AI Triage & Telemetry</span>
                  </div>
                  {inspectedTicket.ai_model_used && (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)]" style={{ color: 'var(--text-muted)' }}>
                      {inspectedTicket.ai_model_used}
                    </span>
                  )}
                </div>

                {inspectedTicket.ai_summary && (
                  <div>
                    <span className="font-mono uppercase tracking-wider text-[10px] font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>
                      AI Executive Summary:
                    </span>
                    <p className="italic leading-relaxed p-2.5 rounded-lg border bg-[var(--bg-card)] border-[var(--border-subtle)]" style={{ color: 'var(--text-secondary)' }}>
                      &ldquo;{inspectedTicket.ai_summary}&rdquo;
                    </p>
                  </div>
                )}

                {inspectedTicket.urgency_reason && (
                  <div>
                    <span className="font-mono uppercase tracking-wider text-[10px] font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>
                      Urgency & Priority Justification:
                    </span>
                    <p className="leading-relaxed p-2.5 rounded-lg border bg-[var(--bg-card)] border-[var(--border-subtle)]" style={{ color: 'var(--text-secondary)' }}>
                      {inspectedTicket.urgency_reason}
                    </p>
                  </div>
                )}
              </div>

              {/* Resolution Note if present */}
              {inspectedTicket.resolution_note && (
                <div
                  className="p-4 rounded-2xl border space-y-1.5 text-xs"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Resolver Official Resolution Note</span>
                  </div>
                  <p className="leading-relaxed p-2.5 rounded-lg border bg-[var(--bg-card)] border-[var(--border-subtle)]" style={{ color: 'var(--text-primary)' }}>
                    {inspectedTicket.resolution_note}
                  </p>
                </div>
              )}

              {/* Reassignment Appeal Alert if requested */}
              {inspectedTicket.reassignment_requested && (
                <div className="p-4 rounded-2xl border space-y-3 bg-rose-500/10 border-rose-500/30 text-xs">
                  <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Officer Reassignment Appeal Pending</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span>From: <strong>{inspectedTicket.department}</strong></span>
                    <span>&rarr;</span>
                    <span>Target: <strong>{inspectedTicket.requested_department}</strong></span>
                  </div>
                  {inspectedTicket.reassignment_reason && (
                    <p className="italic text-rose-700 dark:text-rose-300">
                      &ldquo;{inspectedTicket.reassignment_reason}&rdquo;
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <RippleButton
                      type="button"
                      disabled={actionLoadingId === inspectedTicket.id}
                      onClick={() => handleResolveReassignment(inspectedTicket, 'reject')}
                      className="px-3 py-1.5 rounded-xl font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-colors cursor-pointer"
                    >
                      Reject Appeal
                    </RippleButton>
                    <RippleButton
                      type="button"
                      disabled={actionLoadingId === inspectedTicket.id}
                      onClick={() => handleResolveReassignment(inspectedTicket, 'approve')}
                      className="px-3.5 py-1.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      Approve Transfer
                    </RippleButton>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Admin Override Footer in Drawer */}
            <div
              className="mt-6 pt-4 border-t p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                    Re-Route Department:
                  </label>
                  <select
                    value={getCardEdit(inspectedTicket).department}
                    onChange={(e) => updateCardEdit(inspectedTicket.id, 'department', e.target.value as Department)}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none transition-colors cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-strong)',
                    }}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                    Priority:
                  </label>
                  <select
                    value={getCardEdit(inspectedTicket).priority}
                    onChange={(e) => updateCardEdit(inspectedTicket.id, 'priority', e.target.value as TicketPriority)}
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

              <RippleButton
                type="button"
                disabled={actionLoadingId === inspectedTicket.id}
                onClick={() => handleDirectReassign(inspectedTicket)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 hover:opacity-95 self-end sm:self-auto"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                {actionLoadingId === inspectedTicket.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Routing Override</span>
                  </>
                )}
              </RippleButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
