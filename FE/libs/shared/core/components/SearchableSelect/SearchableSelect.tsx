"use client";

import { useState, useRef, useEffect } from "react";
import { FormHelperText } from "@mui/material";

type Props = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  /** Show danger border on the trigger (validation error) */
  error?: boolean;
  /** Render dropdown with position:fixed to escape overflow:hidden containers (e.g. table filters) */
  fixed?: boolean;
  /** Compact size (h-7, text-xs) to match table filter row height */
  compact?: boolean;
  /** Open dropdown upward instead of downward */
  dropUp?: boolean;
  label?: string;
  required?: boolean;
  helperText?: string;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Chọn...",
  emptyText = "Không tìm thấy",
  disabled,
  className,
  error,
  fixed,
  compact,
  label,
  dropUp,
  required,
  helperText,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Loại bỏ giá trị trùng để tránh trùng key React và mục lặp trong dropdown.
  const uniqueOptions = Array.from(new Set(options));
  const filtered = query.trim()
    ? uniqueOptions.filter((o) =>
        o.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : uniqueOptions;

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      if (fixed && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownStyle(
          dropUp
            ? {
                position: "fixed",
                bottom: window.innerHeight - rect.top + 4,
                left: rect.left,
                width: rect.width,
                zIndex: 9999,
              }
            : {
                position: "fixed",
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                zIndex: 9999,
              },
        );
      }
    }
  }, [open, fixed]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const select = (opt: string) => {
    onChange(opt);
    setOpen(false);
    setQuery("");
  };

  const toggle = () => {
    if (disabled) return;
    setOpen((v) => !v);
    if (open) setQuery("");
  };

  const dropdownContent = open && (
    <div
      style={fixed ? dropdownStyle : undefined}
      className={`${fixed ? "" : dropUp ? "absolute bottom-full mb-1 w-full" : "absolute mt-1 w-full"} z-50 rounded-md border border-line bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]`}
    >
      <div className="p-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm..."
          className="h-8 w-full rounded border border-line px-2.5 text-[13px] text-ink outline-none focus:border-[#3b82f6]"
        />
      </div>
      <div className="max-h-52 overflow-y-auto">
        {value && (
          <button
            type="button"
            onClick={() => select("")}
            className="w-full px-3 py-2 text-left text-[13px] text-muted hover:bg-[#f9fafb]"
          >
            -- Bỏ chọn --
          </button>
        )}
        {filtered.length === 0 ? (
          <div className="px-3 py-3 text-center text-[13px] text-muted">
            {emptyText}
          </div>
        ) : (
          filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => select(opt)}
              className={`w-full px-3 py-2 text-left text-[13px] hover:bg-[#f0f7ff] ${
                opt === value
                  ? "bg-[#eff6ff] font-medium text-primary"
                  : "text-ink"
              }`}
            >
              {opt}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`flex flex-col ${className ? ` ${className}` : ""}`}
    >
      <div
        className="relative group w-full"
        style={{ height: compact ? "28px" : "40px" }}
      >
        {!compact && (
          <>
            <fieldset
              className={`absolute inset-0 m-0 p-0 rounded-md border pointer-events-none transition-colors ${
                open
                  ? "border-[#1976d2] border-2"
                  : error
                    ? "border-danger border-2"
                    : disabled
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
                className={`absolute left-3 transition-all pointer-events-none px-1 ${
                  open || value
                    ? "-top-2 text-[11px] z-10 bg-white " +
                      (error
                        ? "text-danger"
                        : open
                          ? "text-[#1976d2]"
                          : disabled
                            ? "text-[#9ca3af]"
                            : "text-muted")
                    : "top-[10px] text-sm " +
                      (error
                        ? "text-danger"
                        : disabled
                          ? "text-[#9ca3af]"
                          : "text-muted")
                }`}
              >
                {label} {required && <span className="text-danger">*</span>}
              </label>
            )}
          </>
        )}

        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={toggle}
          className={`w-full h-full p-0 outline-none transition-colors disabled:cursor-not-allowed disabled:text-[#9ca3af] bg-white ${
            compact
              ? "rounded-[5px] border border-line text-xs"
              : "rounded-md text-sm"
          }`}
        >
          <div
            className={`flex w-full h-full items-center justify-between gap-2 ${
              compact ? "px-1.5" : "px-3"
            }`}
          >
            <span
              className={`truncate ${
                value
                  ? disabled
                    ? "text-[#9ca3af]"
                    : "text-ink"
                  : open || !label
                    ? disabled
                      ? "text-[#9ca3af]"
                      : "text-muted"
                    : "text-transparent"
              }`}
            >
              {value || placeholder}
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </button>

        {dropdownContent}
      </div>

      {helperText && (
        <FormHelperText
          error={error}
          sx={{ mt: 0.5, mx: "14px", fontSize: "11px" }}
        >
          {helperText}
        </FormHelperText>
      )}
    </div>
  );
}
