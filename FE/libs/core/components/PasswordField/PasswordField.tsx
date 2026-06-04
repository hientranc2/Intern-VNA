"use client";

import { useState } from "react";

type PasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
  id?: string;
  autoComplete?: string;
};

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
    </svg>
  );
}

export function PasswordField({
  value,
  onChange,
  placeholder = "••••••••",
  hasError = false,
  id,
  autoComplete = "current-password",
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const borderClass = hasError
    ? "border-danger"
    : "border-line focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`h-10 w-full rounded-md border bg-white pl-3 pr-10 text-sm text-ink outline-none transition-colors ${borderClass}`}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#374151]"
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  );
}
