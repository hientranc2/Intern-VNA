"use client";

import type { ReactNode } from "react";

type SlidePanelProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
};

export function SlidePanel({ open, title, onClose, children, footer, width = 380 }: SlidePanelProps) {
  return (
    <div
      className={`fixed inset-0 z-[200] bg-black/30 transition-opacity duration-200 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        style={{ width }}
        className={`fixed right-0 top-0 z-[201] flex h-screen flex-col bg-white shadow-[-4px_0_20px_rgba(0,0,0,0.15)] transition-transform duration-[250ms] ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-[52px] shrink-0 items-center justify-between bg-primary px-5">
          <h3 className="text-[14.5px] font-bold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[22px] leading-none text-white/80 hover:text-white"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? (
          <div className="flex shrink-0 justify-end gap-2.5 border-t border-[#e5e7eb] px-5 py-3.5">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
