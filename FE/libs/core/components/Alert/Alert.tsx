type AlertVariant = "error" | "success";

type AlertProps = {
  variant: AlertVariant;
  message: string;
  onClose?: () => void;
};

const STYLES: Record<AlertVariant, { box: string; icon: string; glyph: string }> = {
  error: {
    box: "bg-[#fff1f0] border-[#fca5a5] text-[#b91c1c]",
    icon: "bg-danger",
    glyph: "!",
  },
  success: {
    box: "bg-[#f0fdf4] border-[#86efac] text-[#166534]",
    icon: "bg-success",
    glyph: "✓",
  },
};

export function Alert({ variant, message, onClose }: AlertProps) {
  const style = STYLES[variant];
  return (
    <div
      className={`relative mb-4 flex w-full items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-[13px] ${style.box}`}
      role="alert"
    >
      <span
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${style.icon}`}
      >
        {style.glyph}
      </span>
      <span className="flex-1">{message}</span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1 text-base text-[#9ca3af] hover:text-[#374151]"
          aria-label="Đóng"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
