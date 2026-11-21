'use client';

import React, { useRef, useState, useCallback } from 'react';
import { ShineBorder } from './ShineBorder';

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  shine?: boolean;
  spotlightColor?: string;
}

export function SpotlightCard({
  children,
  className = '',
  shine = false,
  spotlightColor = 'var(--spotlight-color)',
  style,
  onMouseMove,
  onMouseEnter,
  onMouseLeave,
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      setPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      onMouseMove?.(e);
    },
    [onMouseMove]
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setIsHovered(true);
      onMouseEnter?.(e);
    },
    [onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setIsHovered(false);
      onMouseLeave?.(e);
    },
    [onMouseLeave]
  );

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`glass-surface relative overflow-hidden rounded-3xl border transition-all duration-200 hover:-translate-y-0.5 ${className}`}
      style={{
        borderColor: 'var(--border-subtle)',
        ...style,
      }}
      {...props}
    >
      {shine && <ShineBorder borderWidth={2} />}

      {/* Radial Hover Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 rounded-[inherit]"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(480px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 70%)`,
        }}
      />

      {/* Content wrapper with relative z-10 */}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
