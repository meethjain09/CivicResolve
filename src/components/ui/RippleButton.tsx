'use client';

import React, { useState, useEffect } from 'react';

export interface RippleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  rippleColor?: string;
  duration?: string;
  children: React.ReactNode;
}

interface Ripple {
  x: number;
  y: number;
  size: number;
  key: number;
}

export const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  (
    {
      className = '',
      children,
      onClick,
      rippleColor = 'rgba(255, 255, 255, 0.35)',
      duration = '600ms',
      disabled,
      ...props
    },
    ref
  ) => {
    const [buttonRipples, setButtonRipples] = useState<Ripple[]>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const left = e.clientX - rect.left;
      const top = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;

      setButtonRipples((prevRipples) => [
        ...prevRipples,
        {
          x: left,
          y: top,
          size,
          key: Date.now() + Math.random(),
        },
      ]);
      onClick?.(e);
    };

    useEffect(() => {
      if (buttonRipples.length > 0) {
        const lastRipple = buttonRipples[buttonRipples.length - 1];
        const timeout = setTimeout(() => {
          setButtonRipples((prevRipples) =>
            prevRipples.filter((ripple) => ripple.key !== lastRipple.key)
          );
        }, parseInt(duration, 10));
        return () => clearTimeout(timeout);
      }
    }, [buttonRipples, duration]);

    return (
      <button
        ref={ref}
        disabled={disabled}
        onClick={handleClick}
        className={`relative overflow-hidden cursor-pointer select-none ${className}`}
        {...props}
      >
        {children}
        <span className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden z-10">
          {buttonRipples.map((ripple) => (
            <span
              key={ripple.key}
              className="animate-rippling absolute rounded-full pointer-events-none"
              style={{
                width: `${ripple.size}px`,
                height: `${ripple.size}px`,
                top: `${ripple.y - ripple.size / 2}px`,
                left: `${ripple.x - ripple.size / 2}px`,
                backgroundColor: rippleColor,
                transform: 'scale(0)',
                ['--duration' as any]: duration,
              }}
            />
          ))}
        </span>
      </button>
    );
  }
);

RippleButton.displayName = 'RippleButton';
