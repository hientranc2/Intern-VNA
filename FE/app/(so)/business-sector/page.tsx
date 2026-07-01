"use client";

import * as XLSX from "xlsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { MenuItem, TextField } from "@mui/material";
import useDebounce from "@/libs/shared/core/hooks/useDebounce";
import { TriCheckbox } from "@/libs/shared/core/components/TriCheckbox/TriCheckbox";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { Modal } from "@/libs/shared/core/components/Modal/Modal";
import {
  CAP_LABELS,
  type BusinessSector,
} from "@/libs/tts/business-sector/businessSectorData";
import {
  getBusinessSectorList,
  createBusinessSector,
  updateBusinessSector,
  importBusinessSectors,
} from "@/libs/tts/business-sector/businessSectorApi";
import { ApiError } from "@/libs/tts/auth/apiClient";
import { useCan } from "@/libs/tts/auth/abilityContext";
import { BusinessSectorImportForm } from "@/libs/tts/business-sector/BusinessSectorImportForm";

const FILTER_INPUT_CLASS =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] font-normal text-ink outline-none focus:border-[#3b82f6]";

const CAP_BADGE_CLASS = [
  "",
  "bg-[#eff6ff] text-[#1d4ed8]",
  "bg-[#f0fdf4] text-[#166534]",
  "bg-[#fefce8] text-[#92400e]",
  "bg-[#fdf4ff] text-[#7c3aed]",
];
const INDENT_PX = ["0", "0", "14px", "28px", "42px"];

export default function BusinessSectorPage() {
  const canCreate = useCan("create", "BUSINESS_SECTOR");
  const canUpdate = useCan("update", "BUSINESS_SECTOR");
  const importRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<BusinessSector[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Import preview states
  const [importFileName, setImportFileName] = useState("");
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<Record<number, Record<string, string>>>({});
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    getBusinessSectorList()
      .then(setItems)
      .catch(() => {});
  }, []);

  const parentOptions = useMemo(
    () =>
      buildTreeOrder(items)
        .filter((s) => s.cap < 4)
        .map((s) => ({
          value: s.ma,
          label: `${s.ma} - ${s.ten.replace(/^[–-]\s*/, "")}`,
        })),
    [items],
  );

  const [fMa, setFMa] = useState("");
  const [fTen, setFTen] = useState("");
  const [searchMa, setSearchMa] = useState("");
  const [searchTen, setSearchTen] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const hasActiveFilters = Boolean(
    fMa || searchMa || fTen || searchTen
  );

  const handleClearFilters = () => {
    setFMa("");
    setSearchMa("");
    setFTen("");
    setSearchTen("");
    setCurrentPage(1);
  };

  const [panelOpen, setPanelOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [inputMa, setInputMa] = useState("");
  const [inputTen, setInputTen] = useState("");
  const [inputCha, setInputCha] = useState("");
  const [inputActive, setInputActive] = useState("1");
  const [panelErrors, setPanelErrors] = useState<{ ma?: string; ten?: string }>(
    {},
  );

  function buildTreeOrder(items: BusinessSector[]): BusinessSector[] {
    const roots = items.filter((x) => !x.cha || x.cha === "");
    
    function getChildren(maCha: string): BusinessSector[] {
      const children = items.filter((x) => x.cha === maCha);
      // sort anh em cùng cấp theo mã
      children.sort((a, b) => a.ma.localeCompare(b.ma));
      const result: BusinessSector[] = [];
      for (const child of children) {
        result.push(child);
        result.push(...getChildren(child.ma));
      }
      return result;
    }

    roots.sort((a, b) => a.ma.localeCompare(b.ma));
    const result: BusinessSector[] = [];
    for (const root of roots) {
      result.push(root);
      result.push(...getChildren(root.ma));
    }
    return result;
  }

  const filtered = useMemo(() => {
    const treeOrdered = buildTreeOrder(items);
    return treeOrdered.filter(
      (r) =>
        r.ma.toLowerCase().includes(searchMa.toLowerCase()) &&
        r.ten.toLowerCase().includes(searchTen.toLowerCase()),
    );
  }, [items, searchMa, searchTen]);

  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(currentPage, lastPage);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paged = filtered.slice(start, end);
  const allPageChecked =
    paged.length > 0 && paged.every((r) => selectedIds.has(r.id));

  const toggleRow = (id: number, checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      paged.forEach((r) => (checked ? next.add(r.id) : next.delete(r.id)));
      return next;
    });

  const openAdd = () => {
    setEditId(null);
    setInputMa("");
    setInputTen("");
    setInputCha("");
    setInputActive("1");
    setPanelErrors({});
    setPanelOpen(true);
  };

  const openEdit = (r: BusinessSector) => {
    setEditId(r.id);
    setInputMa(r.ma);
    setInputTen(r.ten);
    setInputCha(r.cha);
    setInputActive("1");
    setPanelErrors({});
    setPanelOpen(true);
  };

  const normalizeBusinessSectorRows = (rawRows: any[]) => {
    return rawRows.map((row) => {
      const normalizedRow: Record<string, string> = {};
      for (const k of Object.keys(row)) {
        const cleanKey = k.replace(/\s*\*\s*$/, "").trim();
        normalizedRow[cleanKey] = String(row[k] ?? "").trim();
      }
      return {
        'Mã ngành': normalizedRow['Mã ngành'] || normalizedRow['Mã'] || "",
        'Tên ngành': normalizedRow['Tên ngành'] || normalizedRow['Tên'] || "",
        'Cấp': normalizedRow['Cấp'] || normalizedRow['Cấp độ'] || "",
        'Mã cha': normalizedRow['Mã cha'] || normalizedRow['Cha'] || "",
      };
    });
  };

  const validateBusinessSectorImport = (rows: any[]) => {
    const errs: Record<number, Record<string, string>> = {};
    const seenMas = new Set<string>();

    rows.forEach((row, idx) => {
      const rowErrs: Record<string, string> = {};
      const ma = (row['Mã ngành'] || '').toString().trim();
      const ten = (row['Tên ngành'] || '').toString().trim();
      const capStr = (row['Cấp'] || '').toString().trim();

      if (!ma) {
        rowErrs['Mã ngành'] = 'Thiếu mã ngành';
      } else if (seenMas.has(ma)) {
        rowErrs['Mã ngành'] = 'Mã bị trùng lặp trong file';
      } else {
        seenMas.add(ma);
      }

      if (!ten) {
        rowErrs['Tên ngành'] = 'Thiếu tên ngành';
      }

      if (!capStr) {
        rowErrs['Cấp'] = 'Thiếu cấp độ ngành';
      } else {
        const cap = parseInt(capStr, 10);
        if (isNaN(cap) || cap < 1 || cap > 4) {
          rowErrs['Cấp'] = 'Cấp độ ngành phải là số từ 1 đến 4';
        }
      }

      if (Object.keys(rowErrs).length > 0) {
        errs[idx] = rowErrs;
      }
    });

    return errs;
  };

  const handleFileDrop = (file: File, fileName: string) => {
    setImportFileName(fileName);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error("Không đọc được dữ liệu file");

        const workbook = XLSX.read(new Uint8Array(data as ArrayBuffer), { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("File không có sheet nào");

        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "", blankrows: false });
        if (rawRows.length === 0) throw new Error("File không có dòng dữ liệu nào");

        const dataRows = rawRows.filter((row) => {
          const importantKeys = ["Mã ngành *", "Mã ngành", "Tên ngành *", "Tên ngành"];
          const hasRealValue = importantKeys.some(
            (k) => String(row[k] ?? "").trim() !== ""
          );
          if (!hasRealValue) return false;

          const ma = String(row["Mã ngành *"] || row["Mã ngành"] || "").trim();
          const ten = String(row["Tên ngành *"] || row["Tên ngành"] || "").trim();
          return !(ma === "0111" && ten === "Trồng lúa");
        });

        if (dataRows.length === 0) throw new Error("File không có dòng dữ liệu nào");

        const normalized = normalizeBusinessSectorRows(dataRows);
        const errs = validateBusinessSectorImport(normalized);

        setImportRows(normalized);
        setImportErrors(errs);
        setImportPreviewOpen(true);
      } catch (err) {
        setToast({ message: err instanceof Error ? err.message : "Đọc file Excel thất bại", variant: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setToast({ message: "Không thể đọc file", variant: "error" });
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleCellChange = (rowIdx: number, field: string, val: string) => {
    const updated = [...importRows];
    updated[rowIdx] = { ...updated[rowIdx], [field]: val };
    setImportRows(updated);

    const clientErrs = validateBusinessSectorImport(updated);
    const newErrs: Record<number, Record<string, string>> = {};

    Object.keys(importErrors).forEach((idxStr) => {
      const idx = parseInt(idxStr, 10);
      const rowErrs = importErrors[idx];
      if (rowErrs) {
        Object.keys(rowErrs).forEach((col) => {
          const isEditedCell = idx === rowIdx && col === field;
          const isDbError = rowErrs[col].includes("tồn tại trong hệ thống");
          if (isDbError && !isEditedCell) {
            if (!newErrs[idx]) newErrs[idx] = {};
            newErrs[idx][col] = rowErrs[col];
          }
        });
      }
    });

    Object.keys(clientErrs).forEach((idxStr) => {
      const idx = parseInt(idxStr, 10);
      if (!newErrs[idx]) newErrs[idx] = {};
      newErrs[idx] = { ...newErrs[idx], ...clientErrs[idx] };
    });

    setImportErrors(newErrs);
  };

  const confirmImport = async () => {
    const errs = validateBusinessSectorImport(importRows);
    if (Object.keys(errs).length > 0) {
      setImportErrors(errs);
      setToast({ message: "Vui lòng sửa hết lỗi trước khi import!", variant: "error" });
      return;
    }

    setIsImportSubmitting(true);
    try {
      const worksheet = XLSX.utils.json_to_sheet(importRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const file = new File([blob], importFileName || "business_sectors.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      const res = await importBusinessSectors(file);
      setToast({ message: res.message || "Import thành công ngành nghề kinh doanh", variant: "success" });
      setImportPreviewOpen(false);
      getBusinessSectorList().then(setItems).catch(() => {});
    } catch (err) {
      if (err instanceof ApiError && err.message) {
        const lines = err.message.split("\n");
        const newErrs = { ...importErrors };
        let hasMappedErrors = false;

        lines.forEach((line) => {
          const match = line.match(/^Dòng\s+(\d+):\s*"([^"]+)"\s*(.+)$/);
          if (match) {
            const rowIdx = parseInt(match[1], 10) - 1;
            const column = match[2];
            const msg = match[3];

            if (rowIdx >= 0 && rowIdx < importRows.length) {
              if (!newErrs[rowIdx]) newErrs[rowIdx] = {};
              newErrs[rowIdx][column] = msg;
              hasMappedErrors = true;
            }
          }
        });

        if (hasMappedErrors) {
          setImportErrors(newErrs);
          setToast({ message: "Phát hiện một số lỗi dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra các ô màu đỏ.", variant: "error" });
          return;
        }
      }
      setToast({ message: err instanceof ApiError ? err.message : "Import thất bại", variant: "error" });
    } finally {
      setIsImportSubmitting(false);
    }
  };

  const isSectorFormChanged = useMemo(() => {
    if (!editId) return true;
    const originalItem = items.find((r) => r.id === editId);
    if (!originalItem) return true;
    return inputTen.trim() !== originalItem.ten;
  }, [editId, items, inputTen]);

  const savePanel = async () => {
    const ma = inputMa.trim();
    const ten = inputTen.trim();
    const errors: { ma?: string; ten?: string } = {};
    if (!ma) errors.ma = "Mã ngành không được để trống";
    if (!ten) errors.ten = "Tên ngành không được để trống";
    if (Object.keys(errors).length > 0) {
      setPanelErrors(errors);
      return;
    }
    setPanelErrors({});
    setSaving(true);
    try {
      if (editId) {
        if (!isSectorFormChanged) {
          setToast({ message: "Không có thay đổi nào cần cập nhật", variant: "success" });
          setPanelOpen(false);
          return;
        }
        const updated = await updateBusinessSector(editId, { ten });
        setItems((prev) => prev.map((r) => (r.id === editId ? updated : r)));
      } else {
        const parent = items.find((x) => x.ma === inputCha);
        const cap = inputCha ? Math.min((parent?.cap ?? 0) + 1, 4) : 1;
        await createBusinessSector({
          ma,
          ten,
          cap,
          cha: inputCha || undefined,
        });
        await getBusinessSectorList().then(setItems);
      }
      setPanelOpen(false);
      setToast({ message: editId ? "Cập nhật thành công" : "Thêm mới thành công", variant: "success" });
    } catch {
      setToast({ message: "Lưu thất bại. Vui lòng thử lại.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
        <h1 className="text-base font-semibold text-ink">
          Danh sách ngành nghề kinh doanh
        </h1>
        <div className="flex gap-2.5">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex h-9 items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-4 text-[13px] text-[#6b7280] hover:border-[#f87171] hover:text-[#ef4444] transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Xóa bộ lọc
            </button>
          )}

          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-primary bg-white px-4 text-[13px] font-medium text-primary hover:bg-[#eff6ff]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Thêm từ file
          </button>
          <button
            type="button"
            onClick={openAdd}
            disabled={!canCreate}
            title={canCreate ? undefined : "Bạn không có quyền thêm"}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Thêm mới
          </button>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className="w-11 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left">
                  <TriCheckbox checked={allPageChecked} onChange={toggleAll} />
                </th>
                <th className="w-12 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5" />
                <th className="w-36 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                  Mã ngành
                </th>
                <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                  Tên ngành nghề
                </th>
                <th className="w-24 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                  Cấp
                </th>
              </tr>
              <tr>
                <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                  <input
                    className={FILTER_INPUT_CLASS}
                    value={fMa}
                    onChange={(e) => {
                      setFMa(e.target.value);
                      if (e.target.value === "") {
                        setSearchMa("");
                        setCurrentPage(1);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setSearchMa(fMa);
                        setCurrentPage(1);
                      }
                    }}
                  />
                </th>
                <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                  <input
                    className={FILTER_INPUT_CLASS}
                    value={fTen}
                    onChange={(e) => {
                      setFTen(e.target.value);
                      if (e.target.value === "") {
                        setSearchTen("");
                        setCurrentPage(1);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setSearchTen(fTen);
                        setCurrentPage(1);
                      }
                    }}
                  />
                </th>
                <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3.5 py-8 text-center text-[13.5px] text-muted"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                paged.map((r) => {
                  const selected = selectedIds.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-[#f3f4f6] ${selected ? "bg-[#eff6ff]" : "hover:bg-[#f9fafb]"}`}
                    >
                      <td className="px-3.5 py-2.5">
                        <TriCheckbox
                          checked={selected}
                          onChange={(c) => toggleRow(r.id, c)}
                        />
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          disabled={!canUpdate}
                          title={
                            canUpdate ? "Chỉnh sửa" : "Bạn không có quyền sửa"
                          }
                          className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-3.5 py-2.5 text-[#374151]">{r.ma}</td>
                      <td
                        className="px-3.5 py-2.5 text-[#374151]"
                        style={{ paddingLeft: INDENT_PX[r.cap] }}
                      >
                        {r.cap > 1 ? `– ${r.ten.replace(/^[–-]\s*/, "")}` : r.ten}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${CAP_BADGE_CLASS[r.cap]}`}
                        >
                          {CAP_LABELS[r.cap]}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-end gap-3 border-t border-[#f3f4f6] px-4 py-3 text-[13px] text-[#374151]">
            <select
              className="h-[30px] cursor-pointer rounded-[5px] border border-line px-1.5 text-[13px] outline-none"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-[#6b7280]">
              {total === 0 ? "0 of 0" : `${start + 1} - ${end} of ${total}`}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-line bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                disabled={end >= total}
                className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-line bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={panelOpen}
        title={
          editId
            ? "Cập nhật ngành nghề kinh doanh"
            : "Thêm mới ngành nghề kinh doanh"
        }
        onClose={() => setPanelOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              disabled={saving}
              className="h-9 rounded-md border border-line px-4.5 text-[13.5px] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
            >
              Huỷ bỏ
            </button>
            <button
              type="button"
              onClick={savePanel}
              disabled={saving || (editId ? !isSectorFormChanged : false)}
              className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Lưu
            </button>
          </div>
        }
      >
        <div className="mb-4">
          <TextField
            label="Mã ngành"
            value={inputMa}
            disabled={editId !== null}
            onChange={(e) => {
              setInputMa(e.target.value);
              if (panelErrors.ma)
                setPanelErrors((p) => ({ ...p, ma: undefined }));
            }}
            error={!!panelErrors.ma}
            helperText={panelErrors.ma}
            size="small"
            fullWidth
            required
          />
        </div>
        <div className="mb-4">
          <TextField
            label="Tên ngành"
            value={inputTen}
            onChange={(e) => {
              setInputTen(e.target.value);
              if (panelErrors.ten)
                setPanelErrors((p) => ({ ...p, ten: undefined }));
            }}
            onBlur={(e) => {
              const cleaned = e.target.value
                .normalize("NFC")
                .replace(/[^a-zA-Z0-9\sÀ-ỹà-ỹ]/g, "");
              setInputTen(cleaned);
            }}
            error={!!panelErrors.ten}
            helperText={panelErrors.ten}
            size="small"
            fullWidth
            required
          />
        </div>
        <div className="mb-4">
          <TextField
            label="Nhóm ngành cha"
            select
            value={inputCha}
            onChange={(e) => setInputCha(e.target.value)}
            size="small"
            fullWidth
          >
            <MenuItem value="">-- Không có (Cấp 1) --</MenuItem>
            {parentOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <div className="mb-4">
          <TextField
            label="Trạng thái"
            select
            value={inputActive}
            onChange={(e) => setInputActive(e.target.value)}
            size="small"
            fullWidth
            required
          >
            <MenuItem value="1">Sử dụng</MenuItem>
            <MenuItem value="0">Ngừng sử dụng</MenuItem>
          </TextField>
        </div>
      </Modal>

      {importModalOpen && (
        <BusinessSectorImportForm
          onClose={() => setImportModalOpen(false)}
          onFileReady={(file, fileName) => {
            setImportModalOpen(false);
            handleFileDrop(file, fileName);
          }}
        />
      )}

      {/* Modal Preview Import */}
      {importPreviewOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 transition-opacity duration-200">
          <div className="flex h-[90vh] w-[90vw] max-w-5xl flex-col rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-transform duration-200">
            {/* Header */}
            <div className="bg-primary px-6 py-4 text-center rounded-t-[10px] flex items-center justify-between">
              <span className="w-6" /> {/* Spacer */}
              <h3 className="text-base font-semibold tracking-wide text-white">
                Xem trước dữ liệu import ngành nghề kinh doanh
              </h3>
              <button
                type="button"
                onClick={() => setImportPreviewOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
                aria-label="Đóng"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden px-6 py-4 flex flex-col gap-3">
              <div className="flex justify-between items-center text-[13px] text-muted">
                <span>File nguồn: <strong className="text-ink">{importFileName}</strong></span>
                <span>Số dòng: <strong className="text-ink">{importRows.length}</strong></span>
              </div>

              {/* Scrollable table container */}
              <div className="flex-1 overflow-auto rounded-lg border border-line bg-body">
                <table className="w-full border-collapse text-[13px] bg-white">
                  <thead className="sticky top-0 z-10 bg-[#f9fafb] shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
                    <tr>
                      <th className="w-12 border-b border-[#e5e7eb] px-3 py-2 text-center font-semibold text-[#374151]">STT</th>
                      <th className="w-40 border-b border-[#e5e7eb] px-3 py-2 text-left font-semibold text-[#374151]">Mã ngành *</th>
                      <th className="border-b border-[#e5e7eb] px-3 py-2 text-left font-semibold text-[#374151]">Tên ngành *</th>
                      <th className="w-32 border-b border-[#e5e7eb] px-3 py-2 text-left font-semibold text-[#374151]">Cấp *</th>
                      <th className="w-40 border-b border-[#e5e7eb] px-3 py-2 text-left font-semibold text-[#374151]">Mã cha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((row, idx) => {
                      const rowErrs = importErrors[idx] || {};
                      const hasMaError = !!rowErrs['Mã ngành'];
                      const hasTenError = !!rowErrs['Tên ngành'];
                      const hasCapError = !!rowErrs['Cấp'];

                      return (
                        <tr key={idx} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                          <td className="px-3 py-2.5 text-center text-muted font-medium">{idx + 1}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={row['Mã ngành'] || ''}
                                onChange={(e) => handleCellChange(idx, 'Mã ngành', e.target.value)}
                                className={`h-9 w-full rounded border px-2.5 text-[13px] outline-none transition-colors ${
                                  hasMaError ? "border-danger focus:border-danger bg-red-50" : "border-line focus:border-primary"
                                }`}
                              />
                              {hasMaError && (
                                <span className="text-[11px] text-danger font-medium leading-none">{rowErrs['Mã ngành']}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={row['Tên ngành'] || ''}
                                onChange={(e) => handleCellChange(idx, 'Tên ngành', e.target.value)}
                                className={`h-9 w-full rounded border px-2.5 text-[13px] outline-none transition-colors ${
                                  hasTenError ? "border-danger focus:border-danger bg-red-50" : "border-line focus:border-primary"
                                }`}
                              />
                              {hasTenError && (
                                <span className="text-[11px] text-danger font-medium leading-none">{rowErrs['Tên ngành']}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-1">
                              <select
                                value={row['Cấp'] || '1'}
                                onChange={(e) => handleCellChange(idx, 'Cấp', e.target.value)}
                                className={`h-9 w-full rounded border px-2 text-[13px] outline-none focus:border-primary cursor-pointer bg-white ${
                                  hasCapError ? "border-danger focus:border-danger bg-red-50" : "border-line"
                                }`}
                              >
                                <option value="1">Cấp 1</option>
                                <option value="2">Cấp 2</option>
                                <option value="3">Cấp 3</option>
                                <option value="4">Cấp 4</option>
                              </select>
                              {hasCapError && (
                                <span className="text-[11px] text-danger font-medium leading-none">{rowErrs['Cấp']}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={row['Mã cha'] || ''}
                              onChange={(e) => handleCellChange(idx, 'Mã cha', e.target.value)}
                              className="h-9 w-full rounded border border-line px-2.5 text-[13px] outline-none transition-colors focus:border-primary"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-4 flex items-center justify-between border-t border-[#f3f4f6]">
              <div>
                {Object.keys(importErrors).length > 0 ? (
                  <span className="text-[13px] font-semibold text-danger flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Phát hiện lỗi ở {Object.keys(importErrors).length} dòng. Vui lòng sửa lại.
                  </span>
                ) : (
                  <span className="text-[13px] font-semibold text-success flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Dữ liệu hoàn toàn hợp lệ!
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setImportPreviewOpen(false)}
                  disabled={isImportSubmitting}
                  className="h-9 rounded-md border border-line px-5 text-[13px] font-semibold text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="button"
                  onClick={confirmImport}
                  disabled={isImportSubmitting || Object.keys(importErrors).length > 0}
                  className="h-9 rounded-md bg-primary px-6 text-[13px] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImportSubmitting ? "Đang gửi..." : "Xác nhận & Gửi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant}
        onDone={() => setToast(null)}
      />
    </>
  );
}
