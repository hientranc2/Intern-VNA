"use client";

import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Mặc định false: bấm ra ngoài (overlay) KHÔNG đóng modal — chỉ đóng bằng nút Hủy/X. */
  closeOnOverlayClick?: boolean;
};

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  closeOnOverlayClick = false,
}: ModalProps) {
  return (
    <div
      onClick={(event) => {
        if (!closeOnOverlayClick) return;
        if (event.target === event.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/45 transition-opacity duration-200 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        className={`w-[400px] rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
          open ? "translate-y-0" : "translate-y-3"
        }`}
      >
        <div className="relative bg-primary px-5 py-4 text-center rounded-t-[10px]">
          <h3 className="text-base font-semibold tracking-wide text-white">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="px-7 py-6">{children}</div>
        {footer ? <div className="px-7 pb-6">{footer}</div> : null}
      </div>
    </div>
  );
}
