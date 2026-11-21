'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface TypingIndicatorWrapperProps {
  children: React.ReactNode;
  className?: string;
  value?: string;
  showDot?: boolean;
}

export function TypingIndicatorWrapper({
  children,
  className = '',
  value,
  showDot = true,
}: TypingIndicatorWrapperProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevValueRef = useRef<string | undefined>(value);

  // Trigger pulse whenever value changes
  useEffect(() => {
    if (value !== undefined && prevValueRef.current !== undefined && value !== prevValueRef.current) {
      setIsTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 450);
    }
    prevValueRef.current = value;

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [value]);

  const handleKeyDown = () => {
    setIsTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 450);
  };

  return (
    <div
      className={`relative w-full group ${className}`}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={() => setIsFocused(false)}
      onKeyDownCapture={handleKeyDown}
    >
      {/* Wrapped Input / Textarea */}
      {children}

      {/* Animated Bottom Accent Laser Line */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[2px] transition-transform duration-300 ease-out origin-center pointer-events-none rounded-full z-10 ${
          isFocused ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
        }`}
        style={{
          background: 'linear-gradient(90deg, transparent, var(--accent) 25%, var(--accent) 75%, transparent)',
          boxShadow: isFocused ? '0 0 10px 1px var(--glow-1)' : 'none',
        }}
      />

      {/* Subtle Live Keystroke Indicator Dot */}
      {showDot && (
        <div
          className={`absolute right-3.5 top-3 pointer-events-none flex items-center gap-1 transition-opacity duration-200 z-10 ${
            isTyping ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-ping"
            style={{ backgroundColor: 'var(--accent)' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full -ml-2.5"
            style={{ backgroundColor: 'var(--accent)' }}
          />
        </div>
      )}
    </div>
  );
}
