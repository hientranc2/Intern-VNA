"use client";

import { useRef, useState } from "react";
import { FormHelperText } from "@mui/material";

interface DateInputProps {
  value: string; // yyyy-mm-dd or ""
  onChange?: (value: string) => void;
  max?: string; // yyyy-mm-dd
  min?: string; // yyyy-mm-dd
  error?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  label?: string;
  required?: boolean;
  helperText?: string;
}

function fmtVN(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function DateInput({
  value,
  onChange,
  max,
  min,
  error,
  disabled,
  readOnly,
  className = "",
  label,
  required,
  helperText,
}: DateInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mở lịch khi bấm vào bất kỳ đâu trong ô (không chỉ icon góc phải).
  const openPicker = () => {
    if (disabled || readOnly) return;
    try {
      inputRef.current?.showPicker?.();
    } catch {
      /* showPicker không khả dụng → bỏ qua, dùng hành vi mặc định */
    }
  };

  const isFloated = !!value || focused;

  return (
    <div className={`flex flex-col w-full ${className}`}>
      <div
        onClick={openPicker}
        className={[
          "relative group flex w-full items-center rounded-md px-3 text-sm transition-colors bg-white",
          disabled || readOnly ? "" : "cursor-pointer",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ height: "40px" }}
      >
        <fieldset
          className={`absolute inset-0 m-0 p-0 rounded-md border pointer-events-none transition-colors ${
            focused
              ? "border-[#1976d2] border-2"
              : error
                ? "border-danger border-2"
                : disabled || readOnly
                  ? "border-line"
                  : "border-line group-hover:border-ink"
          }`}
        >
          {label && (
            <legend
              className="ml-2 px-1 text-[0px] text-transparent transition-all"
            >
              {label} {required ? " *" : ""}
            </legend>
          )}
        </fieldset>

        {label && (
          <label
            className={`absolute left-3 transition-all pointer-events-none px-1 font-sans ${
              isFloated
                ? "-top-2 text-[11px] z-10 bg-white " +
                  (error ? "text-danger" : focused ? "text-[#1976d2]" : disabled || readOnly ? "text-[#9ca3af]" : "text-muted")
                : "top-[10px] text-sm " + (error ? "text-danger" : disabled || readOnly ? "text-[#9ca3af]" : "text-muted")
            }`}
          >
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}

        <span
          className={`flex-1 select-none truncate font-sans ${
            value
              ? disabled || readOnly
                ? "text-[#9ca3af]"
                : "text-[#111827]"
              : isFloated || !label
                ? "text-[#9ca3af]"
                : "text-transparent"
          }`}
        >
          {value ? fmtVN(value) : "dd/mm/yyyy"}
        </span>
        <svg
          aria-hidden
          className="pointer-events-none ml-2 shrink-0 text-[#9ca3af]"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {/* Input phủ full field → lịch native bung ra thẳng hàng dưới mép trái field. */}
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={onChange && !readOnly ? (e) => onChange(e.target.value) : undefined}
          max={max}
          min={min}
          disabled={disabled}
          readOnly={readOnly}
          tabIndex={disabled || readOnly ? -1 : 0}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 outline-none disabled:cursor-default"
        />
      </div>

      {helperText && (
        <FormHelperText error={error} sx={{ mt: 0.5, mx: "14px", fontSize: "11px" }}>
          {helperText}
        </FormHelperText>
      )}
    </div>
  );
}
