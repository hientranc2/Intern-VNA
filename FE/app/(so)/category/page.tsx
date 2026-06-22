"use client";

import * as XLSX from "xlsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { MenuItem, TextField } from "@mui/material";
import useDebounce from "@/libs/shared/core/hooks/useDebounce";
import { TriCheckbox } from "@/libs/shared/core/components/TriCheckbox/TriCheckbox";
import { Switch } from "@/libs/shared/core/components/Switch/Switch";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { Modal } from "@/libs/shared/core/components/Modal/Modal";
import { SearchableSelect } from "@/libs/shared/core/components/SearchableSelect/SearchableSelect";
import {
  CAP_LABELS,
  type CategoryTab,
  type InjuryFactor,
  type TreeNode,
} from "@/libs/tts/category/categoryData";
import {
  getInjuryFactorList,
  createInjuryFactor,
  updateInjuryFactor,
  deleteInjuryFactor,
  toggleInjuryFactorActive,
  getInjuryTypeList,
  createInjuryType,
  updateInjuryType,
  deleteInjuryType,
  getOccupationList,
  createOccupation,
  updateOccupation,
  deleteOccupation,
  importInjuryFactors,
  importInjuryTypes,
  importOccupations,
} from "@/libs/tts/category/categoryApi";
import { useCan } from "@/libs/tts/auth/abilityContext";
import { ApiError } from "@/libs/tts/auth/apiClient";
import { exportToExcel } from "@/libs/shared/core/utils/exportCsv";

const TAB_META: Record<CategoryTab, { label: string; option: string }> = {
  factor: { label: "Yếu tố gây chấn thương", option: "Yếu tố chấn thương" },
  injuryType: { label: "Loại chấn thương", option: "Loại chấn thương" },
  occupation: { label: "Danh mục nghề nghiệp", option: "Danh mục nghề nghiệp" },
};

const FILTER_INPUT_CLASS =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] font-normal text-ink outline-none focus:border-[#3b82f6]";
const FILTER_SELECT_CLASS = `${FILTER_INPUT_CLASS} cursor-pointer appearance-none bg-white bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_8px_center] bg-no-repeat pr-6`;

const CAP_BADGE_CLASS = ["", "bg-[#eff6ff] text-[#1d4ed8]", "bg-[#f0fdf4] text-[#166534]", "bg-[#fefce8] text-[#92400e]", "bg-[#fdf4ff] text-[#7c3aed]"];
const INDENT_PX = ["0", "0", "14px", "28px", "42px"];

export default function CategoryPage() {
  const canCreate = useCan("create", "CATEGORY");
  const canUpdate = useCan("update", "CATEGORY");
  const canDelete = useCan("delete", "CATEGORY");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const [factors, setFactors] = useState<InjuryFactor[]>([]);
  const [injuryTypes, setInjuryTypes] = useState<TreeNode[]>([]);
  const [occupations, setOccupations] = useState<TreeNode[]>([]);
  const [tab, setTab] = useState<CategoryTab>("factor");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Import preview states
  const [importFileName, setImportFileName] = useState("");
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<
    Record<number, Record<string, string>>
  >({});
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);

  useEffect(() => {
    getInjuryFactorList().then(setFactors).catch(() => {});
    getInjuryTypeList().then(setInjuryTypes).catch(() => {});
    getOccupationList().then(setOccupations).catch(() => {});
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  const [fMa, setFMa] = useState("");
  const [fTen, setFTen] = useState("");
  const [fTT, setFTT] = useState("");
  const [pageSize, setPageSize] = useState(10);

  const [searchMa, setSearchMa] = useState("");
  const [searchTen, setSearchTen] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const hasActiveFilters = Boolean(
    fMa || searchMa || fTen || searchTen || fTT
  );

  const handleClearFilters = () => {
    setFMa("");
    setSearchMa("");
    setFTen("");
    setSearchTen("");
    setFTT("");
    setCurrentPage(1);
  };

  const [panelOpen, setPanelOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [inputMa, setInputMa] = useState("");
  const [inputTen, setInputTen] = useState("");
  const [inputCha, setInputCha] = useState("");
  const [inputActive, setInputActive] = useState("1");
  const [panelErrors, setPanelErrors] = useState<{ ma?: string; ten?: string }>({});

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const switchTab = (next: CategoryTab) => {
    setTab(next);
    setDropdownOpen(false);
    setFMa("");
    setFTen("");
    setFTT("");
    setSearchMa("");
    setSearchTen("");
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const filteredFactors = useMemo(() => {
    return factors.filter(
      (r) =>
        r.ma.toLowerCase().includes(searchMa.toLowerCase()) &&
        r.ten.toLowerCase().includes(searchTen.toLowerCase()) &&
        (fTT === "" || (fTT === "1" ? r.active : !r.active)),
    );
  }, [factors, searchMa, searchTen, fTT]);

  const filteredTree = useMemo(() => {
    const source = tab === "injuryType" ? injuryTypes : occupations;
    return source.filter(
      (r) => r.ma.toLowerCase().includes(searchMa.toLowerCase()) && r.ten.toLowerCase().includes(searchTen.toLowerCase()),
    );
  }, [tab, injuryTypes, occupations, searchMa, searchTen]);

  const total = tab === "factor" ? filteredFactors.length : filteredTree.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(currentPage, lastPage);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pagedFactors = filteredFactors.slice(start, end);
  const pagedTree = filteredTree.slice(start, end);

  const toggleFactor = (id: number, active: boolean) => {
    setFactors((prev) => prev.map((r) => (r.id === id ? { ...r, active } : r)));
    toggleInjuryFactorActive(id, active)
      .then(() => setToast({ message: "Cập nhật trạng thái thành công", variant: "success" }))
      .catch(() => {
        setFactors((prev) => prev.map((r) => (r.id === id ? { ...r, active: !active } : r)));
        setToast({ message: "Cập nhật thất bại", variant: "error" });
      });
  };

  const openAdd = () => {
    setIsEdit(false);
    setEditId(null);
    setInputMa("");
    setInputTen("");
    setInputCha("");
    setInputActive("1");
    setPanelErrors({});
    setPanelOpen(true);
  };

  const openEditTree = (r: TreeNode) => {
    setIsEdit(true);
    setEditId(r.id);
    setInputMa(r.ma);
    setInputTen(r.ten);
    setInputCha(r.cha || "");
    setInputActive("1");
    setPanelErrors({});
    setPanelOpen(true);
  };

  const isCategoryChanged = useMemo(() => {
    if (!isEdit || editId == null) return true;
    const ten = inputTen.trim();
    const cha = inputCha.trim();
    if (tab === "factor") {
      const original = factors.find((r) => r.id === editId);
      if (original && ten === original.ten && (inputActive === "1") === original.active) {
        return false;
      }
    } else {
      const list = tab === "injuryType" ? injuryTypes : occupations;
      const original = list.find((r) => r.id === editId);
      if (original && ten === original.ten && cha === (original.cha || "")) {
        return false;
      }
    }
    return true;
  }, [isEdit, editId, tab, factors, inputTen, inputActive, injuryTypes, occupations, inputCha]);

  const savePanel = async () => {
    const errors: { ma?: string; ten?: string } = {};
    if (!inputMa.trim()) errors.ma = "Mã không được để trống";
    if (!inputTen.trim()) errors.ten = "Tên không được để trống";
    if (Object.keys(errors).length > 0) {
      setPanelErrors(errors);
      return;
    }
    setPanelErrors({});
    const ma = inputMa.trim();
    const ten = inputTen.trim();
    const cha = inputCha.trim();

    if (isEdit && editId != null && !isCategoryChanged) {
      setToast({ message: "Không có thay đổi nào cần cập nhật", variant: "success" });
      setPanelOpen(false);
      return;
    }

    setSaving(true);
    try {
      if (tab === "factor") {
        if (isEdit && editId != null) {
          const updated = await updateInjuryFactor(editId, { ten, active: inputActive === "1" });
          setFactors((prev) => prev.map((r) => (r.id === editId ? updated : r)));
        } else {
          const created = await createInjuryFactor({ ma, ten, active: inputActive === "1" });
          setFactors((prev) => [created, ...prev]);
        }
      } else {
        const isType = tab === "injuryType";
        if (isEdit && editId != null) {
          await (isType
            ? updateInjuryType(editId, { ten, cha: cha || "" })
            : updateOccupation(editId, { ten, cha: cha || "" }));
        } else {
          const list = isType ? injuryTypes : occupations;
          const parent = cha ? list.find((n) => n.ma === cha) : undefined;
          const cap = parent ? Math.min(parent.cap + 1, 4) : 1;
          const payload = { ma, ten, cap, cha: cha || "" };
          await (isType ? createInjuryType(payload) : createOccupation(payload));
        }

        // Refetch tree list from database to ensure correct level and hierarchical order
        if (isType) {
          const freshData = await getInjuryTypeList();
          setInjuryTypes(freshData);
        } else {
          const freshData = await getOccupationList();
          setOccupations(freshData);
        }
      }
      setPanelOpen(false);
      setToast({ message: isEdit ? "Cập nhật thành công" : "Thêm mới thành công", variant: "success" });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Lưu thất bại. Vui lòng thử lại.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    const ids = [...selectedIds];
    const remove = <T extends { id: number }>(list: T[]) => list.filter((r) => !selectedIds.has(r.id));
    try {
      if (tab === "factor") {
        await Promise.all(ids.map((id) => deleteInjuryFactor(id)));
        setFactors(remove);
      } else if (tab === "injuryType") {
        await Promise.all(ids.map((id) => deleteInjuryType(id)));
        const freshData = await getInjuryTypeList();
        setInjuryTypes(freshData);
      } else {
        await Promise.all(ids.map((id) => deleteOccupation(id)));
        const freshData = await getOccupationList();
        setOccupations(freshData);
      }
      setSelectedIds(new Set());
      setDeleteConfirmOpen(false);
      setToast({ message: `Đã xóa ${ids.length} mục`, variant: "success" });
    } catch {
      setDeleteConfirmOpen(false);
      setToast({ message: "Xóa thất bại. Vui lòng thử lại.", variant: "error" });
    }
  };

  // --- Export Excel ---
  const handleExport = () => {
    if (tab === "factor") {
      const headers = ["Mã yếu tố", "Tên yếu tố gây chấn thương", "Trạng thái"];
      const rows = filteredFactors.map((r) => [r.ma, r.ten, r.active ? "Sử dụng" : "Ngừng"]);
      exportToExcel("danh_sach_yeu_to_chan_thuong.xlsx", headers, rows);
    } else if (tab === "injuryType") {
      const headers = ["Mã số", "Tên loại chấn thương", "Cấp", "Mã cha"];
      const rows = filteredTree.map((r) => [r.ma, r.ten, r.cap, r.cha || ""]);
      exportToExcel("danh_sach_loai_chan_thuong.xlsx", headers, rows);
    } else {
      const headers = ["Mã nghề", "Tên nghề nghiệp", "Cấp", "Mã cha"];
      const rows = filteredTree.map((r) => [r.ma, r.ten, r.cap, r.cha || ""]);
      exportToExcel("danh_sach_nghe_nghiep.xlsx", headers, rows);
    }
  };

  // --- Import Flow ---
  const normalizeFactorRows = (rawRows: any[]) => {
    return rawRows.map((row) => {
      const pick = (candidates: string[]) => {
        for (const k of Object.keys(row)) {
          if (candidates.map((c) => c.toLowerCase().trim()).includes(k.toLowerCase().trim())) {
            return String(row[k] ?? "").trim();
          }
        }
        return "";
      };
      return {
        "Mã yếu tố": pick(["Mã yếu tố", "Mã"]),
        "Tên yếu tố gây chấn thương": pick(["Tên yếu tố gây chấn thương", "Tên yếu tố chấn thương", "Tên yếu tố", "Tên"]),
        "Trạng thái": pick(["Trạng thái", "Kích hoạt", "Active"]),
      };
    });
  };

  const validateFactorImport = (rows: any[]) => {
    const errs: Record<number, Record<string, string>> = {};
    const seenMas = new Set<string>();
    const seenTens = new Set<string>();

    rows.forEach((row, idx) => {
      const rowErrs: Record<string, string> = {};
      const ma = row["Mã yếu tố"];
      const ten = row["Tên yếu tố gây chấn thương"];

      if (!ma) {
        rowErrs["Mã yếu tố"] = "Mã không được để trống";
      } else if (seenMas.has(ma)) {
        rowErrs["Mã yếu tố"] = "Mã bị trùng trong file";
      } else {
        seenMas.add(ma);
      }

      if (!ten) {
        rowErrs["Tên yếu tố gây chấn thương"] = "Tên không được để trống";
      } else {
        const normTen = ten.toLowerCase().trim();
        if (seenTens.has(normTen)) {
          rowErrs["Tên yếu tố gây chấn thương"] = "Tên bị trùng trong file";
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

  const normalizeTreeRows = (rawRows: any[]) => {
    return rawRows.map((row) => {
      const pick = (candidates: string[]) => {
        for (const k of Object.keys(row)) {
          if (candidates.map((c) => c.toLowerCase().trim()).includes(k.toLowerCase().trim())) {
            return String(row[k] ?? "").trim();
          }
        }
        return "";
      };
      const isType = tab === "injuryType";
      return {
        [isType ? "Mã số" : "Mã nghề"]: pick([
          "Mã số",
          "Mã nghề",
          "Mã",
        ]),
        [isType ? "Tên loại chấn thương" : "Tên nghề nghiệp"]: pick([
          "Tên loại chấn thương",
          "Tên nghề nghiệp",
          "Tên",
        ]),
        "Cấp": pick(["Cấp", "Cấp độ"]),
        "Mã cha": pick(["Mã cha", "Cha"]),
      };
    });
  };

  const validateTreeImport = (rows: any[]) => {
    const errs: Record<number, Record<string, string>> = {};
    const seenMas = new Set<string>();
    const isType = tab === "injuryType";
    const codeKey = isType ? "Mã số" : "Mã nghề";
    const nameKey = isType ? "Tên loại chấn thương" : "Tên nghề nghiệp";

    rows.forEach((row, idx) => {
      const rowErrs: Record<string, string> = {};
      const ma = row[codeKey];
      const ten = row[nameKey];
      const capStr = row["Cấp"];

      if (!ma) {
        rowErrs[codeKey] = "Mã không được để trống";
      } else if (seenMas.has(ma)) {
        rowErrs[codeKey] = "Mã bị trùng trong file";
      } else {
        seenMas.add(ma);
      }

      if (!ten) {
        rowErrs[nameKey] = "Tên không được để trống";
      }

      if (!capStr) {
        rowErrs["Cấp"] = "Cấp không được để trống";
      } else {
        const cap = parseInt(capStr, 10);
        if (isNaN(cap) || cap < 1 || cap > 4) {
          rowErrs["Cấp"] = "Cấp phải là số từ 1 đến 4";
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
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

        if (rawJson.length === 0) {
          setToast({ message: "File không có dữ liệu", variant: "error" });
          return;
        }

        let normalized: any[] = [];
        let errs: Record<number, Record<string, string>> = {};

        if (tab === "factor") {
          normalized = normalizeFactorRows(rawJson);
          errs = validateFactorImport(normalized);
        } else {
          normalized = normalizeTreeRows(rawJson);
          errs = validateTreeImport(normalized);
        }

        setImportRows(normalized);
        setImportErrors(errs);
        setImportPreviewOpen(true);
      } catch (err) {
        setToast({ message: "Lỗi khi đọc file Excel", variant: "error" });
      } finally {
        if (importRef.current) importRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCellChange = (rowIdx: number, field: string, val: string) => {
    const updated = [...importRows];
    updated[rowIdx] = { ...updated[rowIdx], [field]: val };
    setImportRows(updated);

    let errs: Record<number, Record<string, string>> = {};
    if (tab === "factor") {
      errs = validateFactorImport(updated);
    } else {
      errs = validateTreeImport(updated);
    }
    setImportErrors(errs);
  };

  const confirmImport = async () => {
    setIsImportSubmitting(true);
    try {
      const worksheet = XLSX.utils.json_to_sheet(importRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const file = new File([blob], importFileName || "import.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      let res;
      if (tab === "factor") {
        res = await importInjuryFactors(file);
      } else if (tab === "injuryType") {
        res = await importInjuryTypes(file);
      } else {
        res = await importOccupations(file);
      }

      setToast({ message: res.message || "Import thành công", variant: "success" });
      setImportPreviewOpen(false);

      if (tab === "factor") {
        getInjuryFactorList().then(setFactors).catch(() => {});
      } else if (tab === "injuryType") {
        getInjuryTypeList().then(setInjuryTypes).catch(() => {});
      } else {
        getOccupationList().then(setOccupations).catch(() => {});
      }
    } catch (err) {
      if (err instanceof ApiError && err.message) {
        const newErrs = { ...importErrors };
        let hasMappedErrors = false;

        const lines = err.message.split("\n");
        const codeKey = tab === "factor" ? "Mã yếu tố" : (tab === "injuryType" ? "Mã số" : "Mã nghề");
        const nameKey = tab === "factor" ? "Tên yếu tố gây chấn thương" : (tab === "injuryType" ? "Tên loại chấn thương" : "Tên nghề nghiệp");

        lines.forEach((line) => {
          const match = line.match(/^Dòng\s+(\d+):\s*(.*)$/i);
          if (match) {
            const rowIdx = parseInt(match[1], 10) - 1;
            const msg = match[2];
            if (rowIdx >= 0 && rowIdx < importRows.length) {
              if (!newErrs[rowIdx]) newErrs[rowIdx] = {};
              
              if (msg.includes("Mã")) {
                newErrs[rowIdx][codeKey] = msg;
              } else if (msg.includes("Tên")) {
                newErrs[rowIdx][nameKey] = msg;
              } else {
                newErrs[rowIdx][codeKey] = msg;
              }
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

  const parentOptions = useMemo(() => {
    const list = tab === "injuryType" ? injuryTypes : occupations;
    if (!list) return [];
    const editNode = isEdit ? list.find((n) => n.id === editId) : null;
    const editMa = editNode?.ma;
    const descendantMas = new Set<string>();
    if (editMa) {
      const getDescendants = (parentMa: string) => {
        list.forEach((n) => {
          if (n.cha === parentMa) {
            descendantMas.add(n.ma);
            getDescendants(n.ma);
          }
        });
      };
      getDescendants(editMa);
    }
    return list
      .filter((node) => node.cap < 4 && (!isEdit || (node.id !== editId && !descendantMas.has(node.ma))))
      .map((node) => ({
        value: node.ma,
        label: `${node.ma} - ${node.ten.replace(/^[–—\-\s]+/, "")}`,
      }));
  }, [tab, injuryTypes, occupations, isEdit, editId]);

  const parentStringOptions = useMemo(() => {
    return parentOptions.map((o) => o.label);
  }, [parentOptions]);

  const selectedParentLabel = useMemo(() => {
    if (!inputCha) return "";
    const match = parentOptions.find((o) => o.value === inputCha);
    return match ? match.label : "";
  }, [inputCha, parentOptions]);

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
        <h1 className="text-base font-semibold text-ink">Khai báo danh mục</h1>
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
            onClick={handleExport}
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
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Xuất danh sách
          </button>
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
        <div className="relative mb-4 inline-block" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex h-[38px] min-w-[220px] items-center justify-between gap-2 rounded-md border border-line bg-white px-4 text-[13.5px] text-[#374151]"
          >
            <span>{TAB_META[tab].label}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {dropdownOpen ? (
            <div className="absolute left-0 top-[42px] z-50 min-w-[220px] rounded-lg border border-[#e5e7eb] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
              {(Object.keys(TAB_META) as CategoryTab[]).map((key) => (
                <div
                  key={key}
                  onClick={() => switchTab(key)}
                  className={`cursor-pointer px-4 py-2.5 text-[13.5px] hover:bg-[#f3f4f6] ${
                    tab === key
                      ? "font-semibold text-primary"
                      : "text-[#374151]"
                  }`}
                >
                  {TAB_META[key].option}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
          {tab === "factor" ? (
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <th className="w-11 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5" />
                  <th className="w-40 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                    Mã yếu tố
                  </th>
                  <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                    Yếu tố gây chấn thương
                  </th>
                  <th className="w-40 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-center text-[13px] font-semibold text-[#374151]">
                    Trạng thái
                  </th>
                </tr>
                <tr>
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
                  <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                    <select
                      className={FILTER_SELECT_CLASS}
                      value={fTT}
                      onChange={(e) => {
                        setFTT(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={{ color: fTT === "" ? "transparent" : "inherit" }}
                    >
                      <option value="" className="text-ink bg-white">Bỏ chọn</option>
                      <option value="1" className="text-ink bg-white">Sử dụng</option>
                      <option value="0" className="text-ink bg-white">Ngừng</option>
                    </select>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedFactors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3.5 py-8 text-center text-[13.5px] text-muted"
                    >
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  pagedFactors.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]"
                    >
                      <td className="px-3.5 py-2.5">
                        <TriCheckbox
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                        />
                      </td>
                      <td className="px-3.5 py-2.5 text-[#374151]">{r.ma}</td>
                      <td className="px-3.5 py-2.5 text-[#374151]">{r.ten}</td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex justify-center">
                          <Switch
                            checked={r.active}
                            onChange={(c) => toggleFactor(r.id, c)}
                            disabled={!canUpdate}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <th className="w-11 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5" />
                  {tab === "occupation" ? (
                    <th className="w-16 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]" />
                  ) : null}
                  <th className="w-40 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                    {tab === "injuryType" ? "Mã số" : "Mã nghề"}
                  </th>
                  <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                    {tab === "injuryType"
                      ? "Tên loại chấn thương"
                      : "Tên nghề nghiệp"}
                  </th>
                  <th className="w-24 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                    Cấp
                  </th>
                  {tab === "injuryType" ? (
                    <th className="w-16 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]" />
                  ) : null}
                </tr>
                <tr>
                  <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                  {tab === "occupation" ? (
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                  ) : null}
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
                  {tab === "injuryType" ? (
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {pagedTree.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3.5 py-8 text-center text-[13.5px] text-muted"
                    >
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  pagedTree.map((r) => {
                    const editBtn = (
                      <button
                        type="button"
                        onClick={() => openEditTree(r)}
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
                    );
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]"
                      >
                        <td className="px-3.5 py-2.5">
                          <TriCheckbox
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleSelect(r.id)}
                          />
                        </td>
                        {tab === "occupation" ? (
                          <td className="px-3.5 py-2.5">{editBtn}</td>
                        ) : null}
                        <td className="px-3.5 py-2.5 text-[#374151]">{r.ma}</td>
                        <td
                          className="px-3.5 py-2.5 text-[#374151]"
                          style={{ paddingLeft: INDENT_PX[r.cap] }}
                        >
                          {r.ten}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${CAP_BADGE_CLASS[r.cap]}`}
                          >
                            {CAP_LABELS[r.cap]}
                          </span>
                        </td>
                        {tab === "injuryType" ? (
                          <td className="px-3.5 py-2.5">{editBtn}</td>
                        ) : null}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

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
        title={isEdit ? "Chỉnh sửa" : "Thêm mới"}
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
              disabled={saving || (isEdit ? (!canUpdate || !isCategoryChanged) : !canCreate)}
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
              {saving ? "Đang lưu..." : "Lưu lại"}
            </button>
          </div>
        }
      >
        <div className="mb-4">
          <TextField
            label={
              tab === "factor"
                ? "Mã yếu tố chấn thương"
                : tab === "injuryType"
                  ? "Mã số"
                  : "Mã ngành"
            }
            value={inputMa}
            disabled={isEdit}
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
            label={
              tab === "factor"
                ? "Tên yếu tố chấn thương"
                : tab === "injuryType"
                  ? "Tên loại chấn thương"
                  : "Tên ngành"
            }
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
        {tab === "factor" ? (
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
        ) : (
          <div className="mb-4">
            <SearchableSelect
              label={
                tab === "injuryType"
                  ? "Tên loại chấn thương cha"
                  : "Nhóm ngành cha"
              }
              options={parentStringOptions}
              value={selectedParentLabel}
              onChange={(val) => {
                if (!val) {
                  setInputCha("");
                } else {
                  const ma = val.split(" - ")[0];
                  setInputCha(ma);
                }
              }}
              required={tab === "injuryType"}
            />
          </div>
        )}
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
          Bạn có chắc muốn xóa <strong>{selectedIds.size}</strong> mục đã chọn?
          Hành động này không thể hoàn tác.
        </p>
      </Modal>

      {/* Modal Preview Import */}
      {importPreviewOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 transition-opacity duration-200">
          <div className="flex h-[90vh] w-[90vw] max-w-5xl flex-col rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-transform duration-200">
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-[10px] bg-primary px-6 py-4 text-white">
              <h3 className="text-base font-bold">
                Xem trước dữ liệu import {TAB_META[tab].option}
              </h3>
              <button
                type="button"
                onClick={() => setImportPreviewOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
                aria-label="Đóng"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Info bar */}
            <div className="flex items-center justify-between border-b border-line bg-body px-6 py-2.5 text-[12.5px] text-[#4b5563]">
              <span>File nguồn: <strong className="text-ink">{importFileName}</strong></span>
              <span>Số dòng: <strong className="text-ink">{importRows.length}</strong></span>
            </div>

            {/* Scrollable table container */}
            <div className="flex-1 overflow-auto p-6">
              <div className="h-full overflow-auto rounded-lg border border-line">
                <table className="w-full border-collapse text-[13.5px]">
                  <thead className="sticky top-0 z-10 bg-[#f9fafb]">
                    <tr className="border-b border-line text-left font-semibold text-[#374151]">
                      <th className="w-14 px-3 py-2.5 text-center bg-[#f9fafb] sticky left-0 z-20">STT</th>
                      {tab === "factor" ? (
                        <>
                          <th className="px-3 py-2.5 min-w-[200px]">Mã yếu tố *</th>
                          <th className="px-3 py-2.5 min-w-[300px]">Tên yếu tố gây chấn thương *</th>
                          <th className="px-3 py-2.5 min-w-[150px]">Trạng thái</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2.5 min-w-[200px]">
                            {tab === "injuryType" ? "Mã số *" : "Mã nghề *"}
                          </th>
                          <th className="px-3 py-2.5 min-w-[300px]">
                            {tab === "injuryType" ? "Tên loại chấn thương *" : "Tên nghề nghiệp *"}
                          </th>
                          <th className="px-3 py-2.5 min-w-[120px]">Cấp *</th>
                          <th className="px-3 py-2.5 min-w-[200px]">Mã cha</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((row, idx) => {
                      const rowErrs = importErrors[idx] || {};
                      
                      if (tab === "factor") {
                        const hasMaError = !!rowErrs["Mã yếu tố"];
                        const hasTenError = !!rowErrs["Tên yếu tố gây chấn thương"];
                        return (
                          <tr key={idx} className="border-b border-line hover:bg-body/30">
                            <td className="px-3 py-2 text-center text-muted font-medium bg-[#f9fafb] sticky left-0 z-10">
                              {idx + 1}
                            </td>
                            <td className="p-2 relative align-top">
                              <input
                                type="text"
                                value={row["Mã yếu tố"] || ""}
                                onChange={(e) => handleCellChange(idx, "Mã yếu tố", e.target.value)}
                                className={`w-full h-8 px-2 rounded border text-[12.5px] outline-none transition-all ${
                                  hasMaError
                                    ? "border-danger bg-red-50/40 focus:border-danger focus:ring-2 focus:ring-danger/10"
                                    : "border-line focus:border-primary focus:ring-2 focus:ring-primary/10"
                                }`}
                              />
                              {hasMaError && (
                                <div className="text-[11px] text-danger font-medium mt-1 leading-tight">
                                  {rowErrs["Mã yếu tố"]}
                                </div>
                              )}
                            </td>
                            <td className="p-2 relative align-top">
                              <input
                                type="text"
                                value={row["Tên yếu tố gây chấn thương"] || ""}
                                onChange={(e) => handleCellChange(idx, "Tên yếu tố gây chấn thương", e.target.value)}
                                className={`w-full h-8 px-2 rounded border text-[12.5px] outline-none transition-all ${
                                  hasTenError
                                    ? "border-danger bg-red-50/40 focus:border-danger focus:ring-2 focus:ring-danger/10"
                                    : "border-line focus:border-primary focus:ring-2 focus:ring-primary/10"
                                }`}
                              />
                              {hasTenError && (
                                <div className="text-[11px] text-danger font-medium mt-1 leading-tight">
                                  {rowErrs["Tên yếu tố gây chấn thương"]}
                                </div>
                              )}
                            </td>
                            <td className="p-2 relative align-top">
                              <select
                                value={row["Trạng thái"] || "Sử dụng"}
                                onChange={(e) => handleCellChange(idx, "Trạng thái", e.target.value)}
                                className="w-full h-8 px-2 rounded border border-line text-[12.5px] outline-none focus:border-primary bg-white cursor-pointer"
                              >
                                <option value="Sử dụng">Sử dụng</option>
                                <option value="Ngừng">Ngừng</option>
                              </select>
                            </td>
                          </tr>
                        );
                      } else {
                        const codeKey = tab === "injuryType" ? "Mã số" : "Mã nghề";
                        const nameKey = tab === "injuryType" ? "Tên loại chấn thương" : "Tên nghề nghiệp";
                        const hasCodeError = !!rowErrs[codeKey];
                        const hasNameError = !!rowErrs[nameKey];
                        const hasCapError = !!rowErrs["Cấp"];

                        return (
                          <tr key={idx} className="border-b border-line hover:bg-body/30">
                            <td className="px-3 py-2 text-center text-muted font-medium bg-[#f9fafb] sticky left-0 z-10">
                              {idx + 1}
                            </td>
                            <td className="p-2 relative align-top">
                              <input
                                type="text"
                                value={row[codeKey] || ""}
                                onChange={(e) => handleCellChange(idx, codeKey, e.target.value)}
                                className={`w-full h-8 px-2 rounded border text-[12.5px] outline-none transition-all ${
                                  hasCodeError
                                    ? "border-danger bg-red-50/40 focus:border-danger focus:ring-2 focus:ring-danger/10"
                                    : "border-line focus:border-primary focus:ring-2 focus:ring-primary/10"
                                }`}
                              />
                              {hasCodeError && (
                                <div className="text-[11px] text-danger font-medium mt-1 leading-tight">
                                  {rowErrs[codeKey]}
                                </div>
                              )}
                            </td>
                            <td className="p-2 relative align-top">
                              <input
                                type="text"
                                value={row[nameKey] || ""}
                                onChange={(e) => handleCellChange(idx, nameKey, e.target.value)}
                                className={`w-full h-8 px-2 rounded border text-[12.5px] outline-none transition-all ${
                                  hasNameError
                                    ? "border-danger bg-red-50/40 focus:border-danger focus:ring-2 focus:ring-danger/10"
                                    : "border-line focus:border-primary focus:ring-2 focus:ring-primary/10"
                                }`}
                              />
                              {hasNameError && (
                                <div className="text-[11px] text-danger font-medium mt-1 leading-tight">
                                  {rowErrs[nameKey]}
                                </div>
                              )}
                            </td>
                            <td className="p-2 relative align-top">
                              <input
                                type="number"
                                min={1}
                                max={4}
                                value={row["Cấp"] || ""}
                                onKeyDown={(e) => {
                                  if (["-", "+", "e", "E", "."].includes(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                onChange={(e) => handleCellChange(idx, "Cấp", e.target.value.replace(/\D/g, ""))}
                                className={`w-full h-8 px-2 rounded border text-[12.5px] outline-none transition-all ${
                                  hasCapError
                                    ? "border-danger bg-red-50/40 focus:border-danger focus:ring-2 focus:ring-danger/10"
                                    : "border-line focus:border-primary focus:ring-2 focus:ring-primary/10"
                                }`}
                              />
                              {hasCapError && (
                                <div className="text-[11px] text-danger font-medium mt-1 leading-tight">
                                  {rowErrs["Cấp"]}
                                </div>
                              )}
                            </td>
                            <td className="p-2 relative align-top">
                              <input
                                type="text"
                                value={row["Mã cha"] || ""}
                                onChange={(e) => handleCellChange(idx, "Mã cha", e.target.value)}
                                className="w-full h-8 px-2 rounded border border-line text-[12.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                              />
                            </td>
                          </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-line bg-[#f8fafc] px-6 py-4">
              <div>
                {Object.keys(importErrors).length > 0 ? (
                  <span className="text-[13px] font-semibold text-danger flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Phát hiện lỗi ở {Object.keys(importErrors).length} dòng. Vui lòng sửa lỗi.
                  </span>
                ) : (
                  <span className="text-[13px] font-semibold text-success flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Tất cả dữ liệu đã hợp lệ.
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setImportPreviewOpen(false)}
                  disabled={isImportSubmitting}
                  className="h-9 rounded-md border border-line px-5 text-[13px] font-semibold text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 bg-white"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="button"
                  onClick={confirmImport}
                  disabled={isImportSubmitting || Object.keys(importErrors).length > 0}
                  className="h-9 rounded-md bg-primary px-6 text-[13px] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
