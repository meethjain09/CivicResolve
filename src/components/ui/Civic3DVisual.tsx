'use client';

import React, { useState } from 'react';
import {
  Activity,
  Building2,
  CheckCircle2,
  Cpu,
  Layers,
  MapPin,
  Sparkles,
} from 'lucide-react';

export function Civic3DVisual() {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    // Moderate tilt angles for architectural feel
    setRotation({
      x: -y * 18,
      y: x * 22,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center">
      {/* Perspective Container */}
      <div
        className="w-full relative py-6 select-none"
        style={{ perspective: '1100px' }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="relative w-full aspect-[4/3] max-h-[460px] p-6 rounded-3xl transition-transform duration-200 ease-out will-change-transform"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          }}
        >
          {/* BASE LAYER (translateZ: 0px): Civic Infrastructure Telemetry Grid */}
          <div
            className="absolute inset-0 rounded-2xl border p-6 transition-all duration-300 flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              transform: 'translateZ(0px)',
              boxShadow: isHovered
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                : '0 10px 30px -10px rgba(0, 0, 0, 0.12)',
            }}
          >
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold"
                    style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Architecture Layer 01 / Municipal Grid
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Telemetry Live</span>
                </div>
              </div>

              {/* 4-Stat Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                  <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Pincode Coverage
                  </div>
                  <div className="text-base font-bold font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    12 / 12
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    100% Monitored
                  </div>
                </div>

                <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                  <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    AI Routing
                  </div>
                  <div className="text-base font-bold font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    0.84s
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Avg Latency
                  </div>
                </div>

                <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                  <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Departments
                  </div>
                  <div className="text-base font-bold font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    6 Active
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Dedicated Units
                  </div>
                </div>

                <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                  <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Verification
                  </div>
                  <div className="text-base font-bold font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    Vision AI
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Multimodal
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle background circuit coordinates */}
            <div
              className="mt-4 pt-3 border-t flex items-center justify-between text-[11px] font-mono"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              <span>SYS_COORD: 40.7128°N, 74.0060°W</span>
              <span>SUPABASE_RLS: ENFORCED</span>
            </div>
          </div>

          {/* MIDDLE LAYER (translateZ: 40px): Live AI Multimodal Triage Card */}
          <div
            className="absolute top-16 left-6 right-6 sm:top-20 sm:left-10 sm:right-10 rounded-xl border p-4.5 sm:p-5 transition-all duration-300"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-strong)',
              transform: 'translateZ(42px)',
              boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.28)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-xs font-bold px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  CR-849201
                </span>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    color: 'var(--accent)',
                    borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                  }}
                >
                  <Building2 className="w-3 h-3" />
                  Roads & Traffic
                </span>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                HIGH PRIORITY
              </span>
            </div>

            <h4
              className="text-xs sm:text-sm font-semibold tracking-tight leading-snug line-clamp-1"
              style={{ color: 'var(--text-primary)' }}
            >
              Dangerous Pothole & Damaged Road Median on 5th Ave
            </h4>

            <div className="flex items-center gap-2 mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span className="inline-flex items-center gap-1 font-mono">
                <MapPin className="w-3 h-3" />
                PIN 560001 (Central District)
              </span>
              <span>&bull;</span>
              <span className="inline-flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                Confidence: 98.4%
              </span>
            </div>

            <div
              className="mt-3 pt-2.5 border-t flex items-center justify-between text-[11px]"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
            >
              <span className="font-mono text-[10px] uppercase tracking-wider">Triage Engine</span>
              <span className="font-semibold text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                <Sparkles className="w-3 h-3" />
                Multi-Model Fallback Chain
              </span>
            </div>
          </div>

          {/* TOP FLOATING BADGE (translateZ: 75px): Real-Time Department Resolution Status Pill */}
          <div
            className="absolute -bottom-2 right-4 sm:bottom-4 sm:right-6 rounded-xl p-3 sm:p-3.5 transition-all duration-300 flex items-center gap-3 border shadow-2xl"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
              borderColor: 'color-mix(in srgb, var(--accent) 80%, white)',
              transform: 'translateZ(78px)',
              boxShadow: '0 25px 35px -5px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider opacity-85 leading-none">
                Resolution Queue
              </div>
              <div className="text-xs sm:text-sm font-bold tracking-tight mt-0.5">
                Dispatched to Field Crew #04
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Helper Text */}
      <div
        className="text-[11px] font-mono tracking-tight text-center mt-3 opacity-60 flex items-center justify-center gap-1.5"
        style={{ color: 'var(--text-muted)' }}
      >
        <Activity className="w-3 h-3" />
        <span>Interactive spatial telemetry &bull; Move cursor to tilt perspective</span>
      </div>
    </div>
  );
}
