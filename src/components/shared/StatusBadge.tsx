'use client';

import React from 'react';
import { TicketStatus, TicketPriority, AiStatus } from '@/types/database';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const sizeClasses =
    size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm font-semibold';

  switch (status) {
    case 'Resolved':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-semibold border transition-colors shadow-xs ${sizeClasses}`}
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.14)',
            color: '#059669',
            borderColor: 'rgba(16, 185, 129, 0.35)',
          }}
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Resolved</span>
        </span>
      );
    case 'In Progress':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-semibold border transition-colors shadow-xs ${sizeClasses}`}
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.14)',
            color: '#2563EB',
            borderColor: 'rgba(59, 130, 246, 0.35)',
          }}
        >
          <Clock className="w-3.5 h-3.5 shrink-0 animate-pulse" />
          <span>In Progress</span>
        </span>
      );
    case 'Reported':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-semibold border transition-colors shadow-xs ${sizeClasses}`}
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.14)',
            color: '#D97706',
            borderColor: 'rgba(245, 158, 11, 0.35)',
          }}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Reported</span>
        </span>
      );
  }
}

interface PriorityBadgeProps {
  priority: TicketPriority | string;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  switch (priority) {
    case 'Critical':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md font-bold uppercase tracking-wider border shadow-xs ${sizeClasses}`}
          style={{
            backgroundColor: 'rgba(244, 63, 94, 0.14)',
            color: '#E11D48',
            borderColor: 'rgba(244, 63, 94, 0.35)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          <span>Critical</span>
        </span>
      );
    case 'High':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md font-bold uppercase tracking-wider border shadow-xs ${sizeClasses}`}
          style={{
            backgroundColor: 'rgba(249, 115, 22, 0.14)',
            color: '#EA580C',
            borderColor: 'rgba(249, 115, 22, 0.35)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          <span>High Priority</span>
        </span>
      );
    case 'Low':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md font-medium uppercase tracking-wider border shadow-xs ${sizeClasses}`}
          style={{
            backgroundColor: 'rgba(100, 116, 139, 0.14)',
            color: '#475569',
            borderColor: 'rgba(100, 116, 139, 0.35)',
          }}
        >
          <span>Low</span>
        </span>
      );
    case 'Medium':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md font-semibold uppercase tracking-wider border shadow-xs ${sizeClasses}`}
          style={{
            backgroundColor: 'rgba(14, 165, 233, 0.14)',
            color: '#0284C7',
            borderColor: 'rgba(14, 165, 233, 0.35)',
          }}
        >
          <span>Medium</span>
        </span>
      );
  }
}

interface AiStatusBadgeProps {
  status: AiStatus | string;
  modelUsed?: string | null;
  size?: 'sm' | 'md';
}

export function AiStatusBadge({ status, modelUsed, size = 'sm' }: AiStatusBadgeProps) {
  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  switch (status) {
    case 'completed':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md font-semibold border shadow-xs ${sizeClasses}`}
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.14)',
            color: '#059669',
            borderColor: 'rgba(16, 185, 129, 0.35)',
          }}
          title={modelUsed ? `Triaged via ${modelUsed}` : 'Automated Triage'}
        >
          <Sparkles className="w-3 h-3" />
          <span>Automated</span>
        </span>
      );
    case 'review_pending':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md font-semibold border shadow-xs ${sizeClasses}`}
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.14)',
            color: '#D97706',
            borderColor: 'rgba(245, 158, 11, 0.35)',
          }}
        >
          <Clock className="w-3 h-3" />
          <span>Review Queued</span>
        </span>
      );
    case 'pending':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md font-semibold border shadow-xs ${sizeClasses}`}
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.14)',
            color: '#2563EB',
            borderColor: 'rgba(59, 130, 246, 0.35)',
          }}
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Analyzing</span>
        </span>
      );
    case 'failed':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md font-semibold border shadow-xs ${sizeClasses}`}
          style={{
            backgroundColor: 'rgba(244, 63, 94, 0.14)',
            color: '#E11D48',
            borderColor: 'rgba(244, 63, 94, 0.35)',
          }}
        >
          <AlertCircle className="w-3 h-3" />
          <span>Review Required</span>
        </span>
      );
  }
}
