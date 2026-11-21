'use client';

import React, { useEffect, useState, useRef } from 'react';

export interface NumberTickerProps {
  value: number;
  className?: string;
  duration?: number;
}

export function NumberTicker({
  value,
  className = '',
  duration = 600,
}: NumberTickerProps) {
  // Hydration-safe initial value
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const targetValue = value;
    prevValueRef.current = value;

    if (startValue === targetValue) {
      setDisplayValue(targetValue);
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic: 1 - pow(1 - progress, 3)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (targetValue - startValue) * easeProgress);

      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span className={`inline-block tabular-nums font-mono ${className}`}>{displayValue}</span>;
}
