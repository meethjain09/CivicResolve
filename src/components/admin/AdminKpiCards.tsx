'use client';

import React from 'react';
import { TiltCard } from '@/components/ui/TiltCard';
import { Layers, AlertCircle, RefreshCw, Users, AlertTriangle } from 'lucide-react';

interface AdminKpiCardsProps {
  totalComplaints: number;
  pendingAiReview: number;
  reassignmentRequests: number;
  activeResolvers: number;
}

export function AdminKpiCards({
  totalComplaints,
  pendingAiReview,
  reassignmentRequests,
  activeResolvers,
}: AdminKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* Total Grievances */}
      <TiltCard className="p-5 flex items-center justify-between">
        <div>
          <div
            className="text-2xl sm:text-3xl font-extrabold font-mono"
            style={{ color: 'var(--text-primary)' }}
          >
            {totalComplaints}
          </div>
          <div
            className="text-[11px] font-mono font-semibold uppercase tracking-wider mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Total Grievances
          </div>
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center border"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <Layers className="w-5 h-5" />
        </div>
      </TiltCard>

      {/* Pending AI Review */}
      <TiltCard className="p-5 flex items-center justify-between">
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-500">
            {pendingAiReview}
          </div>
          <div
            className="text-[11px] font-mono font-semibold uppercase tracking-wider mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Pending AI Review
          </div>
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-amber-500/10 text-amber-500 border-amber-500/30">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </TiltCard>

      {/* Reassignment Requests */}
      <TiltCard className="p-5 flex items-center justify-between">
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-500">
            {reassignmentRequests}
          </div>
          <div
            className="text-[11px] font-mono font-semibold uppercase tracking-wider mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Reassignment Requests
          </div>
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-rose-500/10 text-rose-500 border-rose-500/30">
          <RefreshCw className="w-5 h-5" />
        </div>
      </TiltCard>

      {/* Active Resolvers */}
      <TiltCard className="p-5 flex items-center justify-between">
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-500">
            {activeResolvers}
          </div>
          <div
            className="text-[11px] font-mono font-semibold uppercase tracking-wider mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Active Resolvers
          </div>
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
          <Users className="w-5 h-5" />
        </div>
      </TiltCard>
    </div>
  );
}
