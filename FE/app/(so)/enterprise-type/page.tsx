"use client";

import * as XLSX from "xlsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { MenuItem, TextField } from "@mui/material";
import useDebounce from "@/libs/shared/core/hooks/useDebounce";
import { TriCheckbox } from "@/libs/shared/core/components/TriCheckbox/TriCheckbox";
import { Switch } from "@/libs/shared/core/components/Switch/Switch";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { Modal } from "@/libs/shared/core/components/Modal/Modal";
import { type EnterpriseType } from "@/libs/tts/enterprise-type/enterpriseTypeData";
import {
  getEnterpriseTypeList,
  createEnterpriseType,
  updateEnterpriseType,
  deleteEnterpriseType,
  toggleEnterpriseTypeActive,
  importEnterpriseTypes,
} from "@/libs/tts/enterprise-type/enterpriseTypeApi";
import { ApiError } from "@/libs/tts/auth/apiClient";
import { useCan } from "@/libs/tts/auth/abilityContext";


const FILTER_INPUT_CLASS =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] text-ink outline-none focus:border-[#3b82f6]";

export default function EnterpriseTypePage() {
  const canCreate = useCan("create", "ENTERPRISE_TYPE");
  const canUpdate = useCan("update", "ENTERPRISE_TYPE");
  const canDelete = useCan("delete", "ENTERPRISE_TYPE");
  const importRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<EnterpriseType[]>([]);
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

  useEffect(() => {
    getEnterpriseTypeList().then(setItems).catch(() => {});
  }, []);

  const [fMa, setFMa] = useState("");
  const [fTen, setFTen] = useState("");
  const [fTrangThai, setFTrangThai] = useState("");
  const [pageSize, setPageSize] = useState(10);

  const dFMa = useDebounce(fMa, 300);
  const dFTen = useDebounce(fTen, 300);
  const [currentPage, setCurrentPage] = useState(1);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [inputMa, setInputMa] = useState("");
  const [inputTen, setInputTen] = useState("");
  const [inputActive, setInputActive] = useState("1");
  const [panelErrors, setPanelErrors] = useState<{ ma?: string; ten?: string }>({});

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    return items.filter(
      (r) =>
        r.ma.toLowerCase().includes(dFMa.toLowerCase()) &&
        r.ten.toLowerCase().includes(dFTen.toLowerCase()) &&
        (fTrangThai === "" || (fTrangThai === "1" ? r.active : !r.active)),
    );
  }, [items, dFMa, dFTen, fTrangThai]);

  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(currentPage, lastPage);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paged = filtered.slice(start, end);
  const allPageChecked = paged.length > 0 && paged.every((r) => selectedIds.has(r.id));

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

  const toggleStatus = (id: number, active: boolean) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, active } : r)));
    toggleEnterpriseTypeActive(id, active)
      .then(() => setToast({ message: "Cập nhật trạng thái thành công", variant: "success" }))
      .catch(() => {
        setItems((prev) => prev.map((r) => (r.id === id ? { ...r, active: !active } : r)));
        setToast({ message: "Cập nhật thất bại", variant: "error" });
      });
  };

  const openAdd = () => {
    setEditId(null);
    setInputMa("");
    setInputTen("");
    setInputActive("1");
    setPanelErrors({});
    setPanelOpen(true);
  };

  const openEdit = (r: EnterpriseType) => {
    setEditId(r.id);
    setInputMa(r.ma);
    setInputTen(r.ten);
    setInputActive(r.active ? "1" : "0");
    setPanelErrors({});
    setPanelOpen(true);
  };

  const savePanel = async () => {
    const ma = inputMa.trim();
    const ten = inputTen.trim();
    const errors: { ma?: string; ten?: string } = {};
    if (!ma) errors.ma = "Mã loại hình không được để trống";
    if (!ten) errors.ten = "Tên loại hình không được để trống";
    if (Object.keys(errors).length > 0) { setPanelErrors(errors); return; }
    setPanelErrors({});
    const active = inputActive === "1";
    setSaving(true);
    try {
      if (editId) {
        const updated = await updateEnterpriseType(editId, { ten, active });
        setItems((prev) => prev.map((r) => (r.id === editId ? updated : r)));
      } else {
        const created = await createEnterpriseType({ ma, ten, active });
        setItems((prev) => [created, ...prev]);
      }
      setPanelOpen(false);
      setToast({ message: editId ? "Cập nhật thành công" : "Thêm mới thành công", variant: "success" });
    } catch {
      setToast({ message: "Lưu thất bại. Vui lòng thử lại.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const normalizeEnterpriseTypeRows = (rawRows: any[]) => {
    return rawRows.map((row) => {
      const pick = (candidates: string[]) => {
        for (const k of Object.keys(row)) {
          if (candidates.map(c => c.toLowerCase().trim()).includes(k.toLowerCase().trim())) {
            return String(row[k] ?? "").trim();
          }
        }
        return "";
      };

      return {
        'Mã loại hình': pick(['Mã loại hình', 'Mã']),
        'Tên loại hình': pick(['Tên loại hình', 'Tên']),
        'Trạng thái': pick(['Trạng thái', 'Kích hoạt', 'Active']),
      };
    });
  };

  const validateEnterpriseTypeImport = (rows: any[]) => {
    const errs: Record<number, Record<string, string>> = {};
    const seenMas = new Set<string>();
    const seenTens = new Set<string>();

    rows.forEach((row, idx) => {
      const rowErrs: Record<string, string> = {};
      const ma = (row['Mã loại hình'] || '').toString().trim();
      const ten = (row['Tên loại hình'] || '').toString().trim();

      if (!ma) {
        rowErrs['Mã loại hình'] = 'Thiếu mã loại hình';
      } else if (seenMas.has(ma)) {
        rowErrs['Mã loại hình'] = 'Mã bị trùng lặp trong file';
      } else {
        seenMas.add(ma);
      }

      if (!ten) {
        rowErrs['Tên loại hình'] = 'Thiếu tên loại hình';
      } else {
        const normTen = ten.toLowerCase();
        if (seenTens.has(normTen)) {
          rowErrs['Tên loại hình'] = 'Tên bị trùng lặp trong file';
        } else {
          seenTens.add(normTen);
        }
      }

      if (Object.keys(rowErrs).length > 0) {
        errs[idx] = rowErrs;
      }
    });

    return errs;
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
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
        const rawRows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
        if (rawRows.length === 0) throw new Error("File không có dòng dữ liệu nào");

        const normalized = normalizeEnterpriseTypeRows(rawRows);
        const errs = validateEnterpriseTypeImport(normalized);

        setImportRows(normalized);
        setImportErrors(errs);
        setImportPreviewOpen(true);
      } catch (err) {
        setToast({ message: err instanceof Error ? err.message : "Đọc file Excel thất bại", variant: "error" });
      } finally {
        setIsLoading(false);
        if (importRef.current) importRef.current.value = "";
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

    const clientErrs = validateEnterpriseTypeImport(updated);
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
    const errs = validateEnterpriseTypeImport(importRows);
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
      const file = new File([blob], importFileName || "enterprise_types.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      const res = await importEnterpriseTypes(file);
      setToast({ message: res.message || "Import thành công loại hình doanh nghiệp", variant: "success" });
      setImportPreviewOpen(false);
      getEnterpriseTypeList().then(setItems).catch(() => {});
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

  const deleteSelected = async () => {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => deleteEnterpriseType(id)));
      setItems((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setDeleteConfirmOpen(false);
      setToast({ message: `Đã xóa ${ids.length} loại hình`, variant: "success" });
    } catch {
      setDeleteConfirmOpen(false);
      setToast({ message: "Xóa thất bại. Vui lòng thử lại.", variant: "error" });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
        <h1 className="text-base font-semibold text-ink">
          Danh sách loại hình kinh doanh
        </h1>
        <div className="flex gap-2.5">
          <input
            ref={importRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleImport}
          />
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-[13px] text-[#374151] hover:bg-[#f9fafb]"
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
                  <TriCheckbox
                    checked={allPageChecked}
                    indeterminate={selectedIds.size > 0 && !allPageChecked}
                    onChange={toggleAll}
                  />
                </th>
                <th className="w-12 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5" />
                <th className="w-40 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                  Mã loại hình
                </th>
                <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                  Tên loại hình
                </th>
                <th className="w-40 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-center text-[13px] font-semibold text-[#374151]">
                  Trạng thái
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
                      setCurrentPage(1);
                    }}
                  />
                </th>
                <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                  <input
                    className={FILTER_INPUT_CLASS}
                    value={fTen}
                    onChange={(e) => {
                      setFTen(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </th>
                <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                  <select
                    className={`${FILTER_INPUT_CLASS} cursor-pointer bg-white`}
                    value={fTrangThai}
                    onChange={(e) => {
                      setFTrangThai(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">Tất cả</option>
                    <option value="1">Sử dụng</option>
                    <option value="0">Ngừng sử dụng</option>
                  </select>
                </th>
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
                      <td className="px-3.5 py-2.5 text-[#374151]">{r.ten}</td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex justify-center">
                          <Switch
                            checked={r.active}
                            onChange={(c) => toggleStatus(r.id, c)}
                            disabled={!canUpdate}
                          />
                        </div>
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
              <option value={5}>5</option>
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
            ? "Cập nhật loại hình kinh doanh"
            : "Thêm mới loại hình kinh doanh"
        }
        onClose={() => setPanelOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              disabled={saving}
              className="h-9 rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
            >
              Huỷ bỏ
            </button>
            <button
              type="button"
              onClick={savePanel}
              disabled={saving}
              className="h-9 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        }
      >
        <div className="mb-4">
          <TextField
            label="Mã loại hình"
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
            label="Tên loại hình kinh doanh"
            value={inputTen}
            onChange={(e) => {
              setInputTen(e.target.value);
              if (panelErrors.ten)
                setPanelErrors((p) => ({ ...p, ten: undefined }));
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

      {/* Thanh thao tác hàng loạt khi chọn checkbox */}
      {selectedIds.size > 0 ? (
        <div className="fixed bottom-6 left-1/2 z-300 -translate-x-1/2">
          <div className="flex items-center gap-0 overflow-hidden rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.18)]">
            <div className="flex h-10 min-w-9 items-center justify-center bg-primary px-3 text-sm font-bold text-white">
              {selectedIds.size}
            </div>
            <div className="flex h-10 items-center bg-white px-3 text-[13px] font-medium text-ink">
              dữ liệu được chọn
            </div>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={!canDelete}
              title={canDelete ? undefined : "Bạn không có quyền xóa"}
              className="flex h-10 items-center gap-1.5 bg-danger px-3.5 text-[13px] font-semibold text-white hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-danger"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
              Xoá
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              aria-label="Bỏ chọn"
              className="flex h-10 w-10 items-center justify-center bg-white text-muted hover:bg-body hover:text-ink"
            >
              <svg
                width="14"
                height="14"
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
        </div>
      ) : null}

      {/* Modal xác nhận xóa */}
      <Modal
        open={deleteConfirmOpen}
        title="Xác nhận xóa"
        onClose={() => setDeleteConfirmOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              className="h-9.5 rounded-md px-5 text-sm font-medium text-muted hover:bg-[#f9fafb] hover:text-[#374151]"
            >
              Huỷ bỏ
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              className="h-9.5 rounded-md bg-danger px-6 text-sm font-semibold text-white hover:bg-[#dc2626]"
            >
              Xóa
            </button>
          </div>
        }
      >
        <p className="text-[13.5px] text-[#374151]">
          Bạn có chắc muốn xóa <strong>{selectedIds.size}</strong> loại hình đã
          chọn? Hành động này không thể hoàn tác.
        </p>
      </Modal>

      {/* Modal Preview Import */}
      {importPreviewOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 transition-opacity duration-200">
          <div className="flex h-[90vh] w-[90vw] max-w-5xl flex-col rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-transform duration-200">
            {/* Header */}
            <div className="bg-primary px-6 py-4 text-center rounded-t-[10px] flex items-center justify-between">
              <span className="w-6" /> {/* Spacer */}
              <h3 className="text-base font-semibold tracking-wide text-white">
                Xem trước dữ liệu import loại hình doanh nghiệp
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
                      <th className="w-48 border-b border-[#e5e7eb] px-3 py-2 text-left font-semibold text-[#374151]">Mã loại hình *</th>
                      <th className="border-b border-[#e5e7eb] px-3 py-2 text-left font-semibold text-[#374151]">Tên loại hình *</th>
                      <th className="w-48 border-b border-[#e5e7eb] px-3 py-2 text-left font-semibold text-[#374151]">Trạng thái *</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((row, idx) => {
                      const rowErrs = importErrors[idx] || {};
                      const hasMaError = !!rowErrs['Mã loại hình'];
                      const hasTenError = !!rowErrs['Tên loại hình'];

                      return (
                        <tr key={idx} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                          <td className="px-3 py-2.5 text-center text-muted font-medium">{idx + 1}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={row['Mã loại hình'] || ''}
                                onChange={(e) => handleCellChange(idx, 'Mã loại hình', e.target.value)}
                                className={`h-9 w-full rounded border px-2.5 text-[13px] outline-none transition-colors ${
                                  hasMaError ? "border-danger focus:border-danger bg-red-50" : "border-line focus:border-primary"
                                }`}
                              />
                              {hasMaError && (
                                <span className="text-[11px] text-danger font-medium leading-none">{rowErrs['Mã loại hình']}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={row['Tên loại hình'] || ''}
                                onChange={(e) => handleCellChange(idx, 'Tên loại hình', e.target.value)}
                                className={`h-9 w-full rounded border px-2.5 text-[13px] outline-none transition-colors ${
                                  hasTenError ? "border-danger focus:border-danger bg-red-50" : "border-line focus:border-primary"
                                }`}
                              />
                              {hasTenError && (
                                <span className="text-[11px] text-danger font-medium leading-none">{rowErrs['Tên loại hình']}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              value={row['Trạng thái'] === "0" || row['Trạng thái'] === "false" || String(row['Trạng thái']).toLowerCase() === "ngừng sử dụng" ? "0" : "1"}
                              onChange={(e) => handleCellChange(idx, 'Trạng thái', e.target.value)}
                              className="h-9 w-full rounded border border-line px-2 text-[13px] outline-none focus:border-primary cursor-pointer bg-white"
                            >
                              <option value="1">Sử dụng</option>
                              <option value="0">Ngừng sử dụng</option>
                            </select>
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
