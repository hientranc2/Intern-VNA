"use client";

interface DateInputProps {
  value: string; // yyyy-mm-dd or ""
  onChange?: (value: string) => void;
  max?: string; // yyyy-mm-dd
  min?: string; // yyyy-mm-dd
  error?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
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
}: DateInputProps) {
  return (
    <div
      className={[
        "relative flex h-10 w-full items-center rounded-md border bg-white px-3 text-sm transition-colors",
        error
          ? "border-danger"
          : "border-line focus-within:border-[#3b82f6] focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]",
        disabled || readOnly ? "bg-[#f9fafb]" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={`flex-1 select-none truncate ${value ? "text-[#111827]" : "text-[#9ca3af]"}`}
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
      <input
        type="date"
        value={value}
        onChange={onChange && !readOnly ? (e) => onChange(e.target.value) : undefined}
        max={max}
        min={min}
        disabled={disabled}
        readOnly={readOnly}
        tabIndex={disabled || readOnly ? -1 : 0}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 outline-none disabled:cursor-default"
      />
    </div>
  );
}
