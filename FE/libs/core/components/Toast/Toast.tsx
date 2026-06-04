"use client";

import { useEffect } from "react";

type ToastProps = {
  message: string | null;
  onDone: () => void;
  duration?: number;
};

export function Toast({ message, onDone, duration = 2500 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDone]);

  if (!message) return null;

  return (
    <div className="fixed right-5 top-[68px] z-[999] flex items-center gap-2 rounded-lg border border-[#86efac] bg-[#f0fdf4] px-4 py-2.5 text-[13px] text-[#166534] shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
