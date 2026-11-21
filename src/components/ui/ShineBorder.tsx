'use client';

import React from 'react';

export interface ShineBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  borderWidth?: number;
  duration?: number;
  shineColor?: string | string[];
}

export function ShineBorder({
  borderWidth = 2,
  duration = 12,
  shineColor,
  className = '',
  style,
  ...props
}: ShineBorderProps) {
  const colorList = shineColor
    ? Array.isArray(shineColor)
      ? shineColor.join(',')
      : shineColor
    : 'var(--shine-1), var(--shine-2), var(--shine-3)';

  return (
    <div
      style={
        {
          '--border-width': `${borderWidth}px`,
          '--duration': `${duration}s`,
          backgroundImage: `radial-gradient(transparent, transparent, ${colorList}, transparent, transparent)`,
          backgroundSize: '300% 300%',
          mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: 'var(--border-width)',
          boxSizing: 'border-box',
          ...style,
        } as React.CSSProperties
      }
      className={`animate-shine inset-0 rounded-[inherit] pointer-events-none absolute size-full will-change-[background-position] z-20 ${className}`}
      {...props}
    />
  );
}
