import React from 'react';
import { Layers, AlertCircle, RefreshCw, Users } from 'lucide-react';

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
  const cards = [
    {
      label: 'Total Complaints',
      value: totalComplaints,
      description: 'Citywide grievances submitted',
      icon: Layers,
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      badgeColor: 'bg-indigo-100 text-indigo-700',
    },
    {
      label: 'Pending AI Review',
      value: pendingAiReview,
      description: 'Awaiting triage or verification',
      icon: AlertCircle,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      badgeColor: 'bg-amber-100 text-amber-700',
    },
    {
      label: 'Reassignment Requests',
      value: reassignmentRequests,
      description: 'Officer transfer appeals',
      icon: RefreshCw,
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-600',
      badgeColor: 'bg-rose-100 text-rose-700',
    },
    {
      label: 'Active Resolvers',
      value: activeResolvers,
      description: 'Department officers on duty',
      icon: Users,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {card.label}
              </span>
              <div className={`p-2.5 rounded-xl ${card.bgColor} ${card.textColor}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {card.value}
              </div>
              <p className="text-xs text-slate-400 mt-1">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
