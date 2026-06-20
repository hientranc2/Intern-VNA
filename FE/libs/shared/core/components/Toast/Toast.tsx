"use client";

import { useEffect, useRef } from "react";

type ToastProps = {
  message: string | null;
  onDone: () => void;
  duration?: number;
  variant?: "success" | "error" | "warning"; // Thêm "warning"
};

const STYLES = {
  success: "border-[#86efac] bg-[#f0fdf4] text-[#166534]",
  error: "border-[#fca5a5] bg-[#fff1f0] text-[#b91c1c]",
  warning: "border-[#fcd34d] bg-[#fffbeb] text-[#92400e]", // Thêm style cho warning
};

export function Toast({
  message,
  onDone,
  duration = 2500,
  variant = "success",
}: ToastProps) {
  // Giữ onDone trong ref: nếu để trong deps, parent re-render (vd đồng hồ đếm ngược tick
  // mỗi giây) sẽ tạo onDone mới → reset timer liên tục → toast không bao giờ tự tắt.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onDoneRef.current(), duration);
    return () => clearTimeout(timer);
  }, [message, duration]);

  if (!message) return null;

  // Icon cho warning
  const getIcon = () => {
    if (variant === "success") {
      return (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    }
    if (variant === "warning") {
      return (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        </svg>
      );
    }
    // error
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  };

  return (
    <div
      className={`fixed right-5 top-17 z-999 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[13px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] ${STYLES[variant]}`}
    >
      {getIcon()}
      <span className="whitespace-pre-line">{message}</span>
    </div>
  );
}
