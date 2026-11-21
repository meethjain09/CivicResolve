'use client';

import React, { useState } from 'react';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function TiltCard({ children, className = '', style, ...rest }: TiltCardProps) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    // Max 4deg subtle tilt for architectural Swiss feel
    setRotation({
      x: -y * 8,
      y: x * 8,
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
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`rounded-xl transition-all duration-200 will-change-transform ${className}`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: isHovered ? 'var(--border-strong)' : 'var(--border-subtle)',
        borderWidth: '1px',
        borderStyle: 'solid',
        transform: `perspective(800px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        boxShadow: isHovered
          ? '0 12px 24px -6px rgba(0, 0, 0, 0.15)'
          : '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
