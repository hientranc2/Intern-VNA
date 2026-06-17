"use client";

import { CircularProgress } from "@mui/material";

type LoadingOverlayProps = {
  open: boolean;
  message?: string;
};

// Spinner che toàn màn hình, chặn mọi thao tác khác khi đang xử lý (submit, xoá...).
export function LoadingOverlay({ open, message }: LoadingOverlayProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-3 bg-black/40">
      <CircularProgress size={44} sx={{ color: "#ffffff" }} />
      {message ? <span className="text-sm font-medium text-white">{message}</span> : null}
    </div>
  );
}
