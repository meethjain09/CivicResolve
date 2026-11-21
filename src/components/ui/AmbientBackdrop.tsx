'use client';

import React, { useEffect, useRef } from 'react';

export function AmbientBackdrop() {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      posRef.current.targetX = e.clientX;
      posRef.current.targetY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const animate = () => {
      const { x, y, targetX, targetY } = posRef.current;
      const nextX = x + (targetX - x) * 0.12;
      const nextY = y + (targetY - y) * 0.12;
      posRef.current.x = nextX;
      posRef.current.y = nextY;

      if (spotlightRef.current) {
        spotlightRef.current.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none transition-colors duration-300"
    >
      {/* 1. Architectural Dot/Grid Pattern */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          backgroundImage: 'radial-gradient(var(--grid-color) 1.25px, transparent 1.25px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse at 50% 35%, black 40%, transparent 88%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 35%, black 40%, transparent 88%)',
        }}
      />

      {/* 2. Slow-drifting radial aurora light orbs */}
      <div
        className="absolute -top-[15%] left-[8%] w-[550px] h-[550px] rounded-full blur-[110px] opacity-75"
        style={{
          background: 'radial-gradient(circle, var(--glow-1) 0%, transparent 70%)',
          animation: 'floatOrb 18s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-[35%] -right-[12%] w-[620px] h-[620px] rounded-full blur-[130px] opacity-70"
        style={{
          background: 'radial-gradient(circle, var(--glow-2) 0%, transparent 70%)',
          animation: 'floatOrb 22s ease-in-out infinite reverse',
        }}
      />

      {/* 3. Mouse-following subtle radial spotlight aura */}
      <div
        ref={spotlightRef}
        className="absolute -top-[250px] -left-[250px] w-[500px] h-[500px] rounded-full blur-[90px] opacity-80 pointer-events-none will-change-transform"
        style={{
          background: 'radial-gradient(circle, var(--spotlight-color) 0%, transparent 65%)',
          transform: 'translate3d(-1000px, -1000px, 0)',
        }}
      />
    </div>
  );
}
