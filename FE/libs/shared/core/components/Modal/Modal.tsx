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
        <div className="bg-primary px-5 py-4 text-center rounded-t-[10px]">
          <h3 className="text-base font-semibold tracking-wide text-white">
            {title}
          </h3>
        </div>
        <div className="px-7 py-6">{children}</div>
        {footer ? <div className="px-7 pb-6">{footer}</div> : null}
      </div>
    </div>
  );
}
