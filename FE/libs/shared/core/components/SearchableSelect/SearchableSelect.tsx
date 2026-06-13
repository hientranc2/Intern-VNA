"use client";

import { useState, useRef, useEffect } from "react";

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
  dropUp,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      if (fixed && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownStyle(
          dropUp
            ? { position: "fixed", bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width, zIndex: 9999 }
            : { position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 },
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
          <div className="px-3 py-3 text-center text-[13px] text-muted">{emptyText}</div>
        ) : (
          filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => select(opt)}
              className={`w-full px-3 py-2 text-left text-[13px] hover:bg-[#f0f7ff] ${
                opt === value ? "bg-[#eff6ff] font-medium text-primary" : "text-ink"
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
    <div ref={containerRef} className={`relative${className ? ` ${className}` : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        className={`flex w-full items-center justify-between gap-2 border bg-white text-ink outline-none transition-colors focus:border-[#3b82f6] disabled:cursor-not-allowed disabled:bg-body disabled:text-muted ${
          error ? "border-danger" : "border-line"
        } ${
          compact
            ? "h-7 rounded-[5px] px-1.5 text-xs"
            : "h-10 rounded-md px-3 text-sm focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
        }`}
      >
        <span className={`truncate ${value ? "text-ink" : "text-muted"}`}>
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
      </button>

      {dropdownContent}
    </div>
  );
}
