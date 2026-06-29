"use client";

import * as XLSX from "xlsx";
import { useRef, useState } from "react";

export interface ImportFileProps {
  title: string;
  templateColumns: { label: string; required?: boolean; note?: string }[];
  templateExample: string[];
  templateFileName?: string;
  onFileReady: (file: File, fileName: string) => void;
  onClose: () => void;
  onDownloadTemplate?: () => void; // override hàm tải về
}

export function ImportFile({
  title,
  templateColumns,
  templateExample,
  templateFileName = "file-mau.xlsx",
  onFileReady,
  onClose,
  onDownloadTemplate,
}: ImportFileProps) {
  const importRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    onFileReady(file, file.name);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (importRef.current) importRef.current.value = "";
  };

  const downloadTemplate = () => {
    const headers = templateColumns.map((c) =>
      c.required ? `${c.label} *` : c.label,
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, templateExample]);
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 20) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/45">
      <div className="w-[520px] rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 py-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-white/80"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {/* Upload */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            onClick={() => importRef.current?.click()}
            className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${
              dragOver
                ? "border-primary bg-[#eff6ff]"
                : "border-[#d1d5db] bg-[#f9fafb] hover:border-primary hover:bg-[#eff6ff]"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eff6ff]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[13.5px] font-semibold text-[#374151]">
                Kéo thả file vào đây hoặc{" "}
                <span className="text-primary underline">chọn file</span>
              </p>
              <p className="text-[12px] text-muted mt-1">
                Hỗ trợ: .xlsx, .xls, .csv
              </p>
            </div>
            <input
              ref={importRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>

          {/* File mẫu */}
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eff6ff] flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#374151] mb-0.5">
                  File khung mẫu
                </p>
                <p className="text-[12px] text-muted leading-relaxed">
                  Tải về, điền đầy đủ thông tin rồi upload lên.
                  <br />
                  Cột có dấu{" "}
                  <span className="text-red-600 font-semibold">*</span> là bắt
                  buộc phải điền.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onDownloadTemplate) {
                  onDownloadTemplate();
                } else {
                  downloadTemplate();
                }
              }}
              className="flex-shrink-0 flex items-center gap-1.5 border border-primary rounded-md bg-white px-4 py-2 text-[13px] font-semibold text-primary hover:bg-[#eff6ff] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Tải về
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 pb-5 pt-4 border-t border-[#f3f4f6]">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-line px-5 text-[13px] text-[#374151] hover:bg-[#f9fafb]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}