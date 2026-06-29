"use client";

import * as XLSX from "xlsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Autocomplete, MenuItem, TextField } from "@mui/material";
import useDebounce from "@/libs/shared/core/hooks/useDebounce";
import { TriCheckbox } from "@/libs/shared/core/components/TriCheckbox/TriCheckbox";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { EnterpriseImportForm } from "@/libs/tts/enterprise/EnterpriseImportForm";
import {
  EMPTY_BUSINESS_FORM,
  type BusinessFormData,
} from "@/libs/tts/enterprise/enterpriseData";
import {
  type Business,
  type BusinessDetail,
  getBusinessList,
  getBusinessById,
  createBusiness,
  updateBusiness,
  toggleBusinessStatus,
  deleteBusiness,
  resetBusinessPassword,
  importBusinesses,
} from "@/libs/tts/enterprise/enterpriseApi";
import { ApiError } from "@/libs/tts/auth/apiClient";
import { getEnterpriseTypeList } from "@/libs/tts/enterprise-type/enterpriseTypeApi";
import { getBusinessSectorList } from "@/libs/tts/business-sector/businessSectorApi";
import { PROVINCES, WARDS_BY_PROVINCE } from "@/libs/tts/location/locationData";
import { Switch } from "@/libs/shared/core/components/Switch/Switch";
import { SearchableSelect } from "@/libs/shared/core/components/SearchableSelect/SearchableSelect";
import { localISODate } from "@/libs/shared/core/utils/dateUtils";
import { DateInput } from "@/libs/shared/core/components/DateInput/DateInput";
import {
  isValidEmail,
  isStrongPassword,
  PASSWORD_RULE_MESSAGE,
} from "@/libs/tts/auth/authValidation";
import { exportToExcel } from "@/libs/shared/core/utils/exportCsv";
import { useCan } from "@/libs/tts/auth/abilityContext";
import { LoadingOverlay } from "@/libs/shared/core/components/LoadingOverlay/LoadingOverlay";
import { PasswordField } from "@/libs/shared/core/components/PasswordField/PasswordField";
import { FormHelperText } from "@mui/material";

function filenameFromUrl(url?: string | null): string {
  if (!url) return "";
  try {
    return decodeURIComponent(
      new URL(url).pathname.split("/").pop() || "File đã tải lên",
    );
  } catch {
    return url.split("/").pop() || "File đã tải lên";
  }
}

const VIEW_FILE_ROWS = ["Giấy phép kinh doanh", "Giấy tờ khác"] as const;

type WizardMode = "add" | "edit";

const FILTER_INPUT_CLASS =
  "h-7 w-full rounded-[5px] border border-line px-1.5 text-xs font-normal text-ink outline-none focus:border-[#3b82f6]";
const FILTER_SELECT_CLASS = `${FILTER_INPUT_CLASS} cursor-pointer appearance-none bg-white bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_8px_center] bg-no-repeat pr-6`;

const FILE_NAMES = ["Giấy phép kinh doanh", "Giấy tờ khác"] as const;

type AttachedFile = { file: File | null; displayName: string };
const emptyAttachments = (): AttachedFile[] =>
  FILE_NAMES.map(() => ({ file: null, displayName: "" }));

function formatLicenseDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function normalizeIndustry(industryStr: string, options: string[]): string {
  if (!industryStr) return "";
  const trimmed = industryStr.trim();
  if (/^\d{4}\s*[-–]\s*/.test(trimmed)) {
    return trimmed;
  }
  const cleanName = trimmed.replace(/^[-–]\s*/, "").toLowerCase().trim();
  const found = options.find(
    (opt) =>
      opt.replace(/^\d{4}\s*[-–]\s*/, "").toLowerCase().trim() === cleanName
  );
  return found ?? trimmed.replace(/^[-–]\s*/, "");
}

export default function EnterprisePage() {
  const router = useRouter();
  const canCreate = useCan("create", "ENTERPRISE");
  const canUpdate = useCan("update", "ENTERPRISE");
  const canDelete = useCan("delete", "ENTERPRISE");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  const [loaiHinhOptions, setLoaiHinhOptions] = useState<string[]>([]);
  const [nganhCap4Options, setNganhCap4Options] = useState<string[]>([]);
  const [wardOptions, setWardOptions] = useState<string[]>([]);

  useEffect(() => {
    getEnterpriseTypeList()
      .then((types) =>
        setLoaiHinhOptions(types.filter((t) => t.active).map((t) => t.ten)),
      )
      .catch(() => {});
    getBusinessSectorList()
      .then((sectors) => {
        const cap4 = sectors
          .filter((s) => s.cap === 4)
          .map((s) => `${s.ma} - ${s.ten.replace(/^[–-]\s*/, "")}`);
        setNganhCap4Options(cap4);
      })
      .catch(() => {});
    // Options phường lấy từ phường có thật trong dữ liệu DN (tên phường cũ/mới
    // đều có) thay vì master list — vì master list sau sáp nhập 2025 thiếu nhiều.
    getBusinessList({ limit: 999 })
      .then((res) => {
        const wards = Array.from(
          new Set(res.data.map((b) => b.registeredWard).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b, "vi"));
        setWardOptions(wards);
      })
      .catch(() => {});
  }, []);

  const [fBusinessName, setFBusinessName] = useState("");
  const [fTaxCode, setFTaxCode] = useState("");
  const [fBusinessType, setFBusinessType] = useState("");
  const [fMainIndustry, setFMainIndustry] = useState("");
  const [fWard, setFWard] = useState("");
  const [fStatus, setFStatus] = useState("");

  const [searchBusinessName, setSearchBusinessName] = useState("");
  const [searchTaxCode, setSearchTaxCode] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const hasActiveFilters = Boolean(
    fBusinessName ||
      searchBusinessName ||
      fTaxCode ||
      searchTaxCode ||
      fBusinessType ||
      fMainIndustry ||
      fWard ||
      fStatus
  );

  const handleClearFilters = () => {
    setFBusinessName("");
    setSearchBusinessName("");
    setFTaxCode("");
    setSearchTaxCode("");
    setFBusinessType("");
    setFMainIndustry("");
    setFWard("");
    setFStatus("");
    setCurrentPage(1);
  };

  const hasTextFilter = Boolean(searchBusinessName || fMainIndustry);
  const filteredByText = useMemo(() => {
    if (!searchBusinessName && !fMainIndustry) return businesses;
    const normName = searchBusinessName.normalize("NFC").toLowerCase();
    // Option ngành là "<mã> - <tên>" còn DB lưu "– <tên>". So khớp theo phần tên:
    // bỏ tiền tố mã ở option và gạch đầu ở giá trị lưu rồi mới so.
    const normIndustry = fMainIndustry
      .replace(/^\d+\s*[-–]\s*/, "")
      .normalize("NFC")
      .toLowerCase()
      .trim();
    return businesses.filter((b) => {
      const nameOk =
        !normName ||
        b.businessName.normalize("NFC").toLowerCase().includes(normName);
      const storedIndustry = (b.mainIndustry ?? "")
        .replace(/^[-–]\s*/, "")
        .normalize("NFC")
        .toLowerCase();
      const industryOk = !normIndustry || storedIndustry.includes(normIndustry);
      return nameOk && industryOk;
    });
  }, [businesses, searchBusinessName, fMainIndustry]);
  const displayTotal = hasTextFilter ? filteredByText.length : total;
  const displayedRows = hasTextFilter
    ? filteredByText.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : businesses;

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<WizardMode>("add");
  const [wizardStep, setWizardStep] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const loadedBusinessDetailRef = useRef<any>(null);
  const [isWizardLoading, setIsWizardLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<BusinessFormData>(EMPTY_BUSINESS_FORM);
  const [wizardFieldErrors, setWizardFieldErrors] = useState<{
    businessName?: string;
    taxCode?: string;
    businessType?: string;
    email?: string;
    registeredProvince?: string;
    registeredWard?: string;
  }>({});
  const [attachments, setAttachments] =
    useState<AttachedFile[]>(emptyAttachments());
  const fileRef0 = useRef<HTMLInputElement>(null);
  const fileRef1 = useRef<HTMLInputElement>(null);
  const fileRefs = [fileRef0, fileRef1];
  const importRef = useRef<HTMLInputElement>(null);

  const [accountInfo, setAccountInfo] = useState<{
    username: string;
    password: string;
  } | null>(null);



  const [resetTarget, setResetTarget] = useState<Business | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetPwdError, setResetPwdError] = useState<string | null>(null);
  const [isResettingPwd, setIsResettingPwd] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Import preview states
  const [importFileName, setImportFileName] = useState("");
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<
    Record<number, Record<string, string>>
  >({});
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const setField = <K extends keyof BusinessFormData>(
    key: K,
    value: BusinessFormData[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const phuongDKKDOptions = useMemo(
    () => WARDS_BY_PROVINCE[form.registeredProvince] ?? [],
    [form.registeredProvince],
  );
  const phuongHDOptions = useMemo(
    () => WARDS_BY_PROVINCE[form.operatingProvince] ?? [],
    [form.operatingProvince],
  );

  const lastPage = Math.max(1, Math.ceil(displayTotal / pageSize));
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, displayTotal);
  const allPageChecked =
    displayedRows.length > 0 &&
    displayedRows.every((b) => selectedIds.has(b.id));

  const fetchList = useCallback(async () => {
    const isTextFilter = Boolean(searchBusinessName || fMainIndustry);
    setIsLoading(true);
    try {
      const res = await getBusinessList({
        taxCode: searchTaxCode || undefined,
        businessType: fBusinessType || undefined,
        registeredWard: fWard || undefined,
        isActive: fStatus === "" ? undefined : fStatus === "1",
        page: isTextFilter ? 1 : currentPage,
        limit: isTextFilter ? 999 : pageSize,
      });
      setBusinesses(res.data);
      setTotal(res.total);
    } catch (err) {
      setToast({
        message:
          err instanceof ApiError
            ? err.message
            : "Không thể tải danh sách doanh nghiệp",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    searchBusinessName,
    searchTaxCode,
    fBusinessType,
    fMainIndustry,
    fWard,
    fStatus,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const toggleRow = (id: string, checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      displayedRows.forEach((b) =>
        checked ? next.add(b.id) : next.delete(b.id),
      );
      return next;
    });

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      await toggleBusinessStatus(id, isActive);
      setBusinesses((prev) =>
        prev.map((b) => (b.id === id ? { ...b, isActive } : b)),
      );
    } catch (err) {
      setToast({
        message:
          err instanceof ApiError
            ? err.message
            : "Không thể cập nhật trạng thái",
        variant: "error",
      });
    }
  };

  const normalizeBusinessRows = (rawRows: any[]) => {
    return rawRows.map((row) => {
      const normalizedRow: Record<string, string> = {};
      for (const k of Object.keys(row)) {
        const cleanKey = k.replace(/\s*\*\s*$/, "").trim();
        normalizedRow[cleanKey] = String(row[k] ?? "").trim();
      }
      return {
        "Tên doanh nghiệp":      normalizedRow["Tên doanh nghiệp"]      || normalizedRow["Tên công ty"]          || "",
        "Mã số thuế":            normalizedRow["Mã số thuế"]            || normalizedRow["MST"]                  || "",
        "Loại hình kinh doanh":  normalizedRow["Loại hình kinh doanh"]  || normalizedRow["Loại hình KD"]         || "",
        "Ngành nghề kinh doanh": normalizedRow["Ngành nghề kinh doanh"] || normalizedRow["Ngành nghề KD"]        || "",
        "Ngày cấp GPKD":         normalizedRow["Ngày cấp GPKD"]                                                 || "",
        "Tỉnh ĐKKD":             normalizedRow["Tỉnh ĐKKD"]             || normalizedRow["Tỉnh/Thành ĐKKD"]      || "",
        "Phường ĐKKD":           normalizedRow["Phường ĐKKD"]           || normalizedRow["Phường/Xã ĐKKD"]       || "",
        "Địa chỉ":               normalizedRow["Địa chỉ"]                                                       || "",
        "Tên tiếng nước ngoài":  normalizedRow["Tên tiếng nước ngoài"]                                          || "",
        "Email":                 normalizedRow["Email"]                  || normalizedRow["E-mail"]               || "",
        "SĐT văn phòng":         normalizedRow["SĐT văn phòng"]         || normalizedRow["Điện thoại văn phòng"] || "",
        "Tỉnh hoạt động":        normalizedRow["Tỉnh hoạt động"]        || normalizedRow["Tỉnh/Thành hoạt động"] || "",
        "Phường hoạt động":      normalizedRow["Phường hoạt động"]      || normalizedRow["Phường/Xã hoạt động"]  || "",
        "Địa chỉ hoạt động":     normalizedRow["Địa chỉ hoạt động"]                                             || "",
        "Người đại diện":        normalizedRow["Người đại diện"]                                                 || "",
        "SĐT đại diện":          normalizedRow["SĐT đại diện"]          || normalizedRow["Điện thoại đại diện"]  || "",
      };
    });
  };
  
  const validateBusinessImport = (rows: any[]) => {
    const errs: Record<number, Record<string, string>> = {};
    const seenTaxCodes = new Set<string>();
    const seenEmails = new Set<string>();

    rows.forEach((row, idx) => {
      const rowErrs: Record<string, string> = {};
      const businessName = (row["Tên doanh nghiệp"] || "").toString().trim();
      let taxCode = (row["Mã số thuế"] || "").toString().trim();
      // Người dùng nhập liền 11-15 số thì tự thêm dấu "-"
      if (/^\d{11,15}$/.test(taxCode)) {
        taxCode = `${taxCode.slice(0, 10)}-${taxCode.slice(10)}`;
        // Cập nhật lại dữ liệu để lúc import lưu luôn giá trị đã chuẩn hóa
        row["Mã số thuế"] = taxCode;
      }
      const businessType = (row["Loại hình kinh doanh"] || "")
        .toString()
        .trim();
      const mainIndustry = (row["Ngành nghề kinh doanh"] || "")
        .toString()
        .trim();
      const registeredProvince = (row["Tỉnh ĐKKD"] || "").toString().trim();
      const registeredWard = (row["Phường ĐKKD"] || "").toString().trim();
      const email = (row["Email"] || "").toString().trim().toLowerCase();
      const officePhone = (row["SĐT văn phòng"] || "").toString().trim();
      const representativePhone = (row["SĐT đại diện"] || "").toString().trim();

      if (!businessName) rowErrs["Tên doanh nghiệp"] = "Thiếu tên doanh nghiệp";

      if (!taxCode) {
        rowErrs["Mã số thuế"] = "Thiếu mã số thuế";
      } else if (!/^\d{10}(-\d{1,5})?$/.test(taxCode.trim())) {
        rowErrs["Mã số thuế"] =
          "Mã số thuế gồm 10 chữ số, hoặc 10 chữ số + dấu gạch + tối đa 5 số";
      }

      if (!businessType)
        rowErrs["Loại hình kinh doanh"] = "Thiếu loại hình kinh doanh";
      if (!mainIndustry) rowErrs["Ngành nghề kinh doanh"] = "Thiếu ngành nghề";
      if (!registeredProvince) rowErrs["Tỉnh ĐKKD"] = "Thiếu tỉnh ĐKKD";
      if (!registeredWard) rowErrs["Phường ĐKKD"] = "Thiếu phường ĐKKD";

      if (!email) {
        rowErrs["Email"] = "Thiếu email";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrs["Email"] = "Email không hợp lệ";
      } else if (seenEmails.has(email)) {
        rowErrs["Email"] = "Trùng email trong file";
      } else {
        seenEmails.add(email);
      }

      if (officePhone && !/^0\d{9,10}$/.test(officePhone)) {
        rowErrs["SĐT văn phòng"] = "SĐT không hợp lệ";
      }
      if (representativePhone && !/^0\d{9,10}$/.test(representativePhone)) {
        rowErrs["SĐT đại diện"] = "SĐT không hợp lệ";
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
        const sheetName = workbook.SheetNames.find(name => name === "Doanh nghiệp") ?? workbook.SheetNames[0];
        if (!sheetName) throw new Error("File không có sheet nào");
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "", blankrows: false });
        if (rawRows.length === 0) throw new Error("File không có dòng dữ liệu nào");

        const dataRows = rawRows.filter((row) => {
          // Các cột quan trọng - phải có ít nhất 1 cột có dữ liệu thật
          const importantKeys = [
            "Tên doanh nghiệp *", "Tên doanh nghiệp",
            "Mã số thuế *", "Mã số thuế",
            "Email *", "Email",
          ];
          const hasRealValue = importantKeys.some(
            (k) => String(row[k] ?? "").trim() !== ""
          );
          if (!hasRealValue) return false;

          // Bỏ qua dòng ví dụ
          const mst = String(row["Mã số thuế *"] || row["Mã số thuế"] || "").trim();
          const ten = String(row["Tên doanh nghiệp *"] || row["Tên doanh nghiệp"] || "").trim();
          return !(mst === "0123456789" && ten === "Công ty TNHH Ví Dụ");
        });

        if (dataRows.length === 0) throw new Error("File không có dòng dữ liệu nào");
        const normalized = normalizeBusinessRows(dataRows);
        const errs = validateBusinessImport(normalized);
        setImportRows(normalized);
        setImportErrors(errs);
        setImportPreviewOpen(true);
      } catch (err) {
        setToast({
          message: err instanceof Error ? err.message : "Đọc file Excel thất bại",
          variant: "error",
        });
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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileDrop(file, file.name);
  };

  const handleCellChange = (rowIdx: number, field: string, val: string) => {
    const updated = [...importRows];
    updated[rowIdx] = { ...updated[rowIdx], [field]: val };
    setImportRows(updated);

    const clientErrs = validateBusinessImport(updated);
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
    const errs = validateBusinessImport(importRows);
    if (Object.keys(errs).length > 0) {
      setImportErrors(errs);
      setToast({
        message: "Vui lòng sửa hết lỗi trước khi import!",
        variant: "error",
      });
      return;
    }

    setIsImportSubmitting(true);
    try {
      const worksheet = XLSX.utils.json_to_sheet(importRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const file = new File([blob], importFileName || "businesses.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const res = await importBusinesses(file);
      setToast({
        message: res.message || "Import thành công doanh nghiệp",
        variant: "success",
      });
      setImportPreviewOpen(false);
      fetchList();
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
          setToast({
            message:
              "Phát hiện một số lỗi dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra các ô màu đỏ.",
            variant: "error",
          });
          return;
        }
      }
      setToast({
        message: err instanceof ApiError ? err.message : "Import thất bại",
        variant: "error",
      });
    } finally {
      setIsImportSubmitting(false);
    }
  };

  const openWizard = async (mode: WizardMode, b?: Business) => {
    setWizardMode(mode);
    setWizardStep(1);
    setWizardFieldErrors({});
    setAttachments(emptyAttachments());

    if (mode === "edit" && b) {
      setEditingId(b.id);
      setIsWizardLoading(true);
      setWizardOpen(true);
      try {
        const detail = await getBusinessById(b.id);
        loadedBusinessDetailRef.current = detail;
        setForm({
          businessName: detail.businessName ?? "",
          taxCode: detail.taxCode ?? "",
          businessType: detail.businessType ?? "",
          mainIndustry: normalizeIndustry(detail.mainIndustry ?? "", nganhCap4Options),
          licenseDate: formatLicenseDate(detail.licenseDate),
          registeredProvince: detail.registeredProvince ?? "",
          registeredWard: detail.registeredWard ?? "",
          address: detail.address ?? "",
          foreignName: detail.foreignName ?? "",
          email: detail.email ?? "",
          officePhone: detail.officePhone ?? "",
          operatingProvince: detail.operatingProvince ?? "",
          operatingWard: detail.operatingWard ?? "",
          operatingAddress: detail.operatingAddress ?? "",
          representative: detail.representative ?? "",
          representativePhone: detail.representativePhone ?? "",
        });
      } catch (err) {
        setToast({
          message:
            err instanceof ApiError
              ? err.message
              : "Không thể tải thông tin doanh nghiệp",
          variant: "error",
        });
        setWizardOpen(false);
      } finally {
        setIsWizardLoading(false);
      }
    } else {
      setEditingId(null);
      setForm(EMPTY_BUSINESS_FORM);
      setWizardOpen(true);
    }
  };

  const goStep2 = () => {
    const errors: typeof wizardFieldErrors = {};
    if (!form.businessName.trim())
      errors.businessName = "Tên doanh nghiệp không được để trống";
    if (!form.taxCode.trim()) {
      errors.taxCode = "Mã số thuế không được để trống";
    } else if (!/^\d{10}(-\d{1,5})?$/.test(form.taxCode.trim())) {
      errors.taxCode =
        "Mã số thuế gồm 10 chữ số, hoặc 10 chữ số + dấu gạch + tối đa 5 số";
    }
    if (!form.businessType)
      errors.businessType = "Vui lòng chọn loại hình kinh doanh";
    if (!form.email.trim()) errors.email = "Email không được để trống";
    else if (!isValidEmail(form.email.trim()))
      errors.email = "Email không đúng định dạng";
    if (!form.registeredProvince)
      errors.registeredProvince = "Vui lòng chọn tỉnh/thành phố ĐKKD";
    if (!form.registeredWard)
      errors.registeredWard = "Vui lòng chọn phường/xã ĐKKD";
    if (Object.keys(errors).length > 0) {
      setWizardFieldErrors(errors);
      return;
    }
    setWizardFieldErrors({});
    setWizardStep(2);
  };

  const buildFormData = (): FormData => {
    const fd = new FormData();
    fd.append("businessName", form.businessName);
    if (wizardMode === "add") fd.append("taxCode", form.taxCode);
    fd.append("businessType", form.businessType);
    if (form.mainIndustry) fd.append("mainIndustry", form.mainIndustry);
    if (form.licenseDate) fd.append("licenseDate", form.licenseDate);
    fd.append("registeredProvince", form.registeredProvince);
    fd.append("registeredWard", form.registeredWard);
    if (form.address) fd.append("address", form.address);
    if (form.foreignName) fd.append("foreignName", form.foreignName);
    fd.append("email", form.email);
    if (form.officePhone) fd.append("officePhone", form.officePhone);
    if (form.operatingProvince)
      fd.append("operatingProvince", form.operatingProvince);
    if (form.operatingWard) fd.append("operatingWard", form.operatingWard);
    if (form.operatingAddress)
      fd.append("operatingAddress", form.operatingAddress);
    if (form.representative) fd.append("representative", form.representative);
    if (form.representativePhone)
      fd.append("representativePhone", form.representativePhone);
    if (attachments[0].file) fd.append("licenseFile", attachments[0].file);
    if (attachments[1].file) fd.append("otherFile", attachments[1].file);
    return fd;
  };

  const isBusinessFormChanged = () => {
    if (!loadedBusinessDetailRef.current) return true;
    const detail = loadedBusinessDetailRef.current;
    const formFields = [
      { formVal: form.businessName, dbVal: detail.businessName },
      { formVal: form.businessType, dbVal: detail.businessType },
      { formVal: form.mainIndustry, dbVal: detail.mainIndustry },
      { formVal: form.licenseDate, dbVal: formatLicenseDate(detail.licenseDate) },
      { formVal: form.registeredProvince, dbVal: detail.registeredProvince },
      { formVal: form.registeredWard, dbVal: detail.registeredWard },
      { formVal: form.address, dbVal: detail.address },
      { formVal: form.foreignName, dbVal: detail.foreignName },
      { formVal: form.email, dbVal: detail.email },
      { formVal: form.officePhone, dbVal: detail.officePhone },
      { formVal: form.operatingProvince, dbVal: detail.operatingProvince },
      { formVal: form.operatingWard, dbVal: detail.operatingWard },
      { formVal: form.operatingAddress, dbVal: detail.operatingAddress },
      { formVal: form.representative, dbVal: detail.representative },
      { formVal: form.representativePhone, dbVal: detail.representativePhone },
    ];
    for (const f of formFields) {
      if ((f.formVal ?? "").trim() !== (f.dbVal ?? "").trim()) {
        return true;
      }
    }
    if (attachments[0].file || attachments[1].file) {
      return true;
    }
    return false;
  };

  const confirmWizard = async () => {
    if (wizardMode === "edit" && !isBusinessFormChanged()) {
      setToast({ message: "Không có thay đổi nào cần cập nhật", variant: "success" });
      setWizardOpen(false);
      return;
    }
    setIsSubmitting(true);
    try {
      if (wizardMode === "add") {
        const res = await createBusiness(buildFormData());
        setWizardOpen(false);
        setAccountInfo(res.account);
        setToast({
          message: "Thêm mới doanh nghiệp thành công",
          variant: "success",
        });
      } else {
        await updateBusiness(editingId!, buildFormData());
        setWizardOpen(false);
        setToast({ message: "Cập nhật thành công", variant: "success" });
      }
      fetchList();
    } catch (err) {
      setToast({
        message: err instanceof ApiError ? err.message : "Đã có lỗi xảy ra",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmResetPwd = async () => {
    const pwd = resetPwd.trim();
    if (!pwd) {
      setResetPwdError("Vui lòng nhập mật khẩu mới");
      return;
    }
    if (!isStrongPassword(pwd)) {
      setResetPwdError(PASSWORD_RULE_MESSAGE);
      return;
    }
    if (!resetTarget) return;
    setIsResettingPwd(true);
    setResetPwdError(null);
    try {
      await resetBusinessPassword(resetTarget.id, pwd);
      setResetTarget(null);
      setResetPwd("");
      setResetPwdError(null);
      setToast({
        message:
          "Đặt lại mật khẩu thành công. Doanh nghiệp sẽ phải đăng nhập lại.",
        variant: "success",
      });
    } catch (err) {
      // Hiển thị lỗi inline trong modal thay vì toast (để user thấy được lỗi)
      setResetPwdError(
        err instanceof ApiError ? err.message : "Đặt lại mật khẩu thất bại",
      );
    } finally {
      setIsResettingPwd(false);
    }
  };

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    setIsDeleting(true);
    try {
      await Promise.all(ids.map((id) => deleteBusiness(id)));
      setSelectedIds(new Set());
      setDeleteConfirmOpen(false);
      setToast({
        message: `Đã xóa ${ids.length} doanh nghiệp`,
        variant: "success",
      });
      fetchList();
    } catch (err) {
      setToast({
        message:
          err instanceof ApiError ? err.message : "Không thể xóa doanh nghiệp",
        variant: "error",
      });
      setDeleteConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileSelect = (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setAttachments((prev) => {
      const next = [...prev];
      next[idx] = { file, displayName: file.name };
      return next;
    });
  };

  const handleFileView = (idx: number) => {
    const { file } = attachments[idx];
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
  };

  const handleFileDelete = (idx: number) => {
    setAttachments((prev) => {
      const next = [...prev];
      next[idx] = { file: null, displayName: "" };
      return next;
    });
    const ref = fileRefs[idx];
    if (ref?.current) ref.current.value = "";
  };

  const reviewRows: [string, string][] = [
    ["Mã số thuế :", form.taxCode],
    ["Tên doanh nghiệp :", form.businessName],
    ["Tên viết bằng tiếng nước ngoài :", form.foreignName],
    ["Email :", form.email],
    ["Ngày cấp GPKD :", form.licenseDate],
    ["Loại hình kinh doanh :", form.businessType],
    ["Ngành nghề kinh doanh :", form.mainIndustry],
    ["Tỉnh/Thành phố ĐKKD :", form.registeredProvince],
    ["Phường/Xã ĐKKD :", form.registeredWard],
    ["Địa chỉ ĐKKD :", form.address],
    ["Địa điểm kinh doanh :", form.operatingAddress],
    ["Người đứng đầu doanh nghiệp :", form.representative],
    ["SĐT người đứng đầu :", form.representativePhone],
  ];

  const thBase =
    "whitespace-nowrap border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2.5 text-left text-[12.5px] font-semibold text-[#374151]";

  return (
    <>
      <>
        <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
          <h1 className="text-base font-semibold text-ink">
            Danh sách doanh nghiệp
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
            <input
              ref={importRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleImport}
            />
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              disabled={!canCreate}
              title={
                canCreate
                  ? undefined
                  : "Bạn không có quyền thêm mới doanh nghiệp"
              }
              className="flex h-9 items-center gap-1.5 rounded-md border border-primary bg-white px-4 text-[13px] font-medium text-primary hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
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
              onClick={() => router.push("/enterprise/create")}
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="w-11 border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2.5 text-left">
                      <TriCheckbox
                        checked={allPageChecked}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className={`${thBase} w-24`} />
                    <th className={thBase}>Tên doanh nghiệp</th>
                    <th className={thBase}>Mã số thuế</th>
                    <th className={thBase}>Loại hình kinh doanh</th>
                    <th className={thBase}>Ngành nghề kinh doanh</th>
                    <th className={thBase}>Phường/ xã</th>
                    <th className={`${thBase} text-center`}>Trạng thái</th>
                  </tr>
                  <tr>
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5" />
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5" />
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5">
                      <input
                        className={FILTER_INPUT_CLASS}
                        value={fBusinessName}
                        onChange={(e) => {
                          setFBusinessName(e.target.value);
                          if (e.target.value === "") {
                            setSearchBusinessName("");
                            setCurrentPage(1);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setSearchBusinessName(fBusinessName);
                            setCurrentPage(1);
                          }
                        }}
                      />
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5">
                      <input
                        className={FILTER_INPUT_CLASS}
                        value={fTaxCode}
                        onChange={(e) => {
                          setFTaxCode(e.target.value);
                          if (e.target.value === "") {
                            setSearchTaxCode("");
                            setCurrentPage(1);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setSearchTaxCode(fTaxCode);
                            setCurrentPage(1);
                          }
                        }}
                      />
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5">
                      <SearchableSelect
                        fixed
                        compact
                        options={loaiHinhOptions}
                        value={fBusinessType}
                        onChange={(v) => {
                          setFBusinessType(v);
                          setCurrentPage(1);
                        }}
                      />
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5">
                      <SearchableSelect
                        fixed
                        compact
                        options={nganhCap4Options}
                        value={fMainIndustry}
                        onChange={(v) => {
                          setFMainIndustry(v);
                          setCurrentPage(1);
                        }}
                      />
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5">
                      <SearchableSelect
                        fixed
                        compact
                        options={wardOptions}
                        value={fWard}
                        onChange={(v) => {
                          setFWard(v);
                          setCurrentPage(1);
                        }}
                      />
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5">
                      <select
                        className={FILTER_SELECT_CLASS}
                        value={fStatus}
                        onChange={(e) => {
                          setFStatus(e.target.value);
                          setCurrentPage(1);
                        }}
                        style={{ color: fStatus === "" ? "transparent" : "inherit" }}
                      >
                        <option value="" className="text-ink bg-white">Bỏ chọn</option>
                        <option value="1" className="text-ink bg-white">Hoạt động</option>
                        <option value="0" className="text-ink bg-white">Ngừng</option>
                      </select>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-8 text-center text-[13px] text-muted"
                      >
                        Đang tải...
                      </td>
                    </tr>
                  ) : displayedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-8 text-center text-[13px] text-muted"
                      >
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    displayedRows.map((b) => {
                      const selected = selectedIds.has(b.id);
                      return (
                        <tr
                          key={b.id}
                          className={`border-b border-[#f3f4f6] ${selected ? "bg-[#eff6ff]" : "hover:bg-[#f9fafb]"}`}
                        >
                          <td className="px-3 py-2.5">
                            <TriCheckbox
                              checked={selected}
                              onChange={(c) => toggleRow(b.id, c)}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(`/enterprise/view/${b.id}`)
                                }
                                title="Xem"
                                className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(`/enterprise/edit/${b.id}`)
                                }
                                disabled={!canUpdate}
                                title={
                                  canUpdate
                                    ? "Chỉnh sửa"
                                    : "Bạn không có quyền sửa"
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
                              <button
                                type="button"
                                onClick={() => {
                                  setResetTarget(b);
                                  setResetPwd("");
                                  setResetPwdError(null);
                                }}
                                disabled={!canUpdate}
                                title={
                                  canUpdate
                                    ? "Đặt lại mật khẩu"
                                    : "Bạn không có quyền sửa"
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
                                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-[#374151]">
                            {b.businessName}
                          </td>
                          <td className="px-3 py-2.5 text-[#374151]">
                            {b.taxCode}
                          </td>
                          <td className="px-3 py-2.5 text-[#374151]">
                            {b.businessType}
                          </td>
                          <td className="px-3 py-2.5 text-[#374151]">
                            {normalizeIndustry(b.mainIndustry ?? "", nganhCap4Options) || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-[#374151]">
                            {b.registeredWard}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex justify-center">
                              <Switch
                                checked={b.isActive}
                                onChange={(c) => handleToggleStatus(b.id, c)}
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
            </div>

            <div className="flex items-center gap-3 border-t border-[#f3f4f6] px-4 py-3 text-[13px] text-[#374151]">
              <button
                type="button"
                onClick={() => {
                  exportToExcel(
                    "danh-sach-doanh-nghiep.xlsx",
                    [
                      "Tên doanh nghiệp",
                      "Mã số thuế",
                      "Loại hình kinh doanh",
                      "Ngành nghề kinh doanh",
                      "Phường/xã",
                      "Trạng thái",
                    ],
                    businesses.map((b) => [
                      b.businessName,
                      b.taxCode,
                      b.businessType,
                      b.mainIndustry,
                      b.registeredWard,
                      b.isActive ? "Hoạt động" : "Ngừng",
                    ]),
                  );
                }}
                className="flex items-center gap-1.5 text-muted hover:text-primary"
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
                Export Data
              </button>
              <div className="ml-auto flex items-center gap-3">
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
                  {displayTotal === 0
                    ? "0 of 0"
                    : `${start + 1} - ${end} of ${displayTotal}`}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
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
                    onClick={() =>
                      setCurrentPage((p) => Math.min(lastPage, p + 1))
                    }
                    disabled={currentPage >= lastPage}
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
        </div>
      </>

      {/* Wizard */}
      <div
        className={`fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-black/50 pt-10 transition-opacity duration-200 ${
          wizardOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`mb-10 w-[760px] max-w-[96vw] rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)] transition-transform duration-200 ${
            wizardOpen ? "translate-y-0" : "translate-y-3"
          }`}
        >
          {/* Stepper */}
          <div className="flex items-center justify-center gap-0 pb-4 pt-6">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white"
              >
                {wizardStep === 1 ? (
                  "1"
                ) : (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span
                className="text-[13px] font-semibold text-ink"
              >
                Thông tin doanh nghiệp
              </span>
            </div>
            <div className="mx-2 h-0.5 w-[60px] bg-[#e5e7eb]" />
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${
                  wizardStep === 2
                    ? "bg-primary text-white"
                    : "bg-[#9ca3af] text-white"
                }`}
              >
                2
              </div>
              <span
                className={`text-[13px] ${
                  wizardStep === 2 ? "font-semibold text-ink" : "font-medium text-[#9ca3af]"
                }`}
              >
                Xác nhận đăng ký
              </span>
            </div>
            <div className="mx-2 h-0.5 w-[60px] bg-[#e5e7eb]" />
          </div>

          {isWizardLoading ? (
            <div className="flex items-center justify-center py-16 text-[13px] text-muted">
              Đang tải...
            </div>
          ) : wizardStep === 1 ? (
            <>
              <div className="px-7 pb-6">
                <div className="mb-4 text-[15px] font-bold text-ink">
                  {wizardMode === "add"
                    ? "Thêm mới doanh nghiệp"
                    : "Cập nhật doanh nghiệp"}
                </div>
                <div className="mb-4 rounded-lg border border-[#e5e7eb] p-5">
                  <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                    <TextField
                      label="Tên doanh nghiệp"
                      required
                      value={form.businessName}
                      onChange={(e) => {
                        setField("businessName", e.target.value);
                        if (wizardFieldErrors.businessName)
                          setWizardFieldErrors((p) => ({
                            ...p,
                            businessName: undefined,
                          }));
                      }}
                      error={!!wizardFieldErrors.businessName}
                      helperText={wizardFieldErrors.businessName}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Mã số thuế"
                      required
                      value={form.taxCode}
                      disabled={wizardMode === "edit"}
                      onChange={(e) => {
                        setField("taxCode", e.target.value);
                        if (wizardFieldErrors.taxCode)
                          setWizardFieldErrors((p) => ({
                            ...p,
                            taxCode: undefined,
                          }));
                      }}
                      error={!!wizardFieldErrors.taxCode}
                      helperText={wizardFieldErrors.taxCode}
                      size="small"
                      fullWidth
                      slotProps={{ htmlInput: { maxLength: 16 } }}
                    />

                    <Autocomplete
                      options={loaiHinhOptions}
                      value={form.businessType || null}
                      isOptionEqualToValue={(option, value) =>
                        option.trim().toLowerCase() ===
                        (value ?? "").trim().toLowerCase()
                      }
                      onChange={(_, v) => {
                        setField("businessType", v ?? "");
                        if (wizardFieldErrors.businessType)
                          setWizardFieldErrors((p) => ({
                            ...p,
                            businessType: undefined,
                          }));
                      }}
                      slotProps={{
                        popper: {
                          modifiers: [
                            { name: "offset", options: { offset: [0, 8] } },
                          ],
                        },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Loại hình kinh doanh"
                          required
                          error={!!wizardFieldErrors.businessType}
                          helperText={wizardFieldErrors.businessType}
                          size="small"
                          fullWidth
                        />
                      )}
                    />
                  </div>
                  <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                    <Autocomplete
                      options={nganhCap4Options}
                      value={form.mainIndustry || null}
                      onChange={(_, v) => setField("mainIndustry", v ?? "")}
                      slotProps={{
                        popper: {
                          modifiers: [
                            { name: "offset", options: { offset: [0, 8] } },
                          ],
                        },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Ngành nghề kinh doanh, chính"
                          required
                          size="small"
                          fullWidth
                        />
                      )}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12.5px] font-medium text-[#374151]">
                        Ngày cấp GPKD
                      </label>
                      <DateInput
                        value={form.licenseDate}
                        onChange={(v) => setField("licenseDate", v)}
                        max={localISODate(new Date())}
                      />
                    </div>
                    <Autocomplete
                      options={PROVINCES}
                      value={form.registeredProvince || null}
                      onChange={(_, v) => {
                        setField("registeredProvince", v ?? "");
                        setField("registeredWard", "");
                        if (wizardFieldErrors.registeredProvince)
                          setWizardFieldErrors((p) => ({
                            ...p,
                            registeredProvince: undefined,
                          }));
                      }}
                      slotProps={{
                        popper: {
                          modifiers: [
                            { name: "offset", options: { offset: [0, 8] } },
                          ],
                        },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Tỉnh/Thành phố ĐKKD"
                          required
                          error={!!wizardFieldErrors.registeredProvince}
                          helperText={wizardFieldErrors.registeredProvince}
                          size="small"
                          fullWidth
                        />
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <Autocomplete
                      options={phuongDKKDOptions}
                      value={form.registeredWard || null}
                      disabled={!form.registeredProvince}
                      onChange={(_, v) => {
                        setField("registeredWard", v ?? "");
                        if (wizardFieldErrors.registeredWard)
                          setWizardFieldErrors((p) => ({
                            ...p,
                            registeredWard: undefined,
                          }));
                      }}
                      slotProps={{
                        popper: {
                          modifiers: [
                            { name: "offset", options: { offset: [0, 8] } },
                          ],
                        },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Phường/Xã ĐKKD"
                          required
                          error={!!wizardFieldErrors.registeredWard}
                          helperText={wizardFieldErrors.registeredWard}
                          size="small"
                          fullWidth
                        />
                      )}
                    />
                    <TextField
                      label="Địa chỉ"
                      value={form.address}
                      onChange={(e) => setField("address", e.target.value)}
                      size="small"
                      fullWidth
                    />
                  </div>
                </div>

                <div className="my-3 text-[13.5px] font-semibold text-[#374151]">
                  Thông tin liên hệ
                </div>
                <div className="mb-4 rounded-lg border border-[#e5e7eb] p-5">
                  <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                    <TextField
                      label="Tên viết bằng tiếng nước ngoài"
                      value={form.foreignName}
                      onChange={(e) => setField("foreignName", e.target.value)}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Email"
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => {
                        setField("email", e.target.value);
                        if (wizardFieldErrors.email)
                          setWizardFieldErrors((p) => ({
                            ...p,
                            email: undefined,
                          }));
                      }}
                      error={!!wizardFieldErrors.email}
                      helperText={wizardFieldErrors.email}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Số điện thoại cơ quan"
                      value={form.officePhone}
                      onChange={(e) => setField("officePhone", e.target.value)}
                      size="small"
                      fullWidth
                    />
                  </div>
                  <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                    <Autocomplete
                      options={PROVINCES}
                      value={form.operatingProvince || null}
                      onChange={(_, v) => {
                        setField("operatingProvince", v ?? "");
                        setField("operatingWard", "");
                      }}
                      slotProps={{
                        popper: {
                          modifiers: [
                            { name: "offset", options: { offset: [0, 8] } },
                          ],
                        },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Tỉnh/TP hoạt động KD"
                          size="small"
                          fullWidth
                        />
                      )}
                    />
                    <Autocomplete
                      options={phuongHDOptions}
                      value={form.operatingWard || null}
                      disabled={!form.operatingProvince}
                      onChange={(_, v) => setField("operatingWard", v ?? "")}
                      slotProps={{
                        popper: {
                          modifiers: [
                            { name: "offset", options: { offset: [0, 8] } },
                          ],
                        },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Phường/xã hoạt động KD"
                          size="small"
                          fullWidth
                        />
                      )}
                    />
                    <div />
                  </div>
                  <div className="grid grid-cols-3 gap-3.5">
                    <TextField
                      label="Địa điểm kinh doanh"
                      value={form.operatingAddress}
                      onChange={(e) =>
                        setField("operatingAddress", e.target.value)
                      }
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Người đứng đầu doanh nghiệp"
                      value={form.representative}
                      onChange={(e) =>
                        setField("representative", e.target.value)
                      }
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="SĐT liên hệ người đứng đầu"
                      value={form.representativePhone}
                      onChange={(e) =>
                        setField("representativePhone", e.target.value)
                      }
                      size="small"
                      fullWidth
                    />
                  </div>
                </div>

                <div className="my-3 text-[13.5px] font-semibold text-[#374151]">
                  File đính kèm
                </div>
                <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        <th className="w-[200px] border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">
                          Tên file
                        </th>
                        <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">
                          Thông tin file
                        </th>
                        <th className="w-[120px] border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {FILE_NAMES.map((name, idx) => (
                        <tr
                          key={name}
                          className="border-b border-[#f3f4f6] last:border-b-0"
                        >
                          <td className="px-3 py-2 text-[#374151]">{name}</td>
                          <td className="px-3 py-2 text-[13px] text-[#374151]">
                            {attachments[idx].displayName || (
                              <span className="text-muted">Chưa có file</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1.5 text-muted">
                              <button
                                type="button"
                                title="Xem"
                                onClick={() => handleFileView(idx)}
                                disabled={!attachments[idx].file}
                                className={
                                  attachments[idx].file
                                    ? "hover:text-primary"
                                    : "cursor-not-allowed opacity-40"
                                }
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                title="Tải lên"
                                onClick={() => fileRefs[idx]?.current?.click()}
                                className="hover:text-primary"
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
                              </button>
                              <button
                                type="button"
                                title="Xóa"
                                onClick={() => handleFileDelete(idx)}
                                disabled={!attachments[idx].file}
                                className={
                                  attachments[idx].file
                                    ? "hover:text-danger"
                                    : "cursor-not-allowed opacity-40"
                                }
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
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4h6v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 border-t border-[#e5e7eb] px-7 py-4">
                <button
                  type="button"
                  onClick={() => setWizardOpen(false)}
                  className="h-[38px] rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb]"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="button"
                  onClick={goStep2}
                  className="flex h-[38px] items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af]"
                >
                  Tiếp tục
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="px-7 pb-6">
                <div className="mb-4 text-[15px] font-bold text-ink">
                  Thông tin về hồ sơ
                </div>
                <div className="rounded-lg border border-[#e5e7eb] p-5">
                  {reviewRows.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex border-b border-[#f3f4f6] py-2.5 last:border-b-0"
                    >
                      <span className="w-[280px] shrink-0 text-[13.5px] font-semibold text-[#374151]">
                        {label}
                      </span>
                      <span className="text-[13.5px] text-ink">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 overflow-hidden rounded-lg border border-[#e5e7eb]">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        <th className="w-[200px] border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">
                          Tên file
                        </th>
                        <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">
                          Thông tin file
                        </th>
                        <th className="w-20 border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {FILE_NAMES.map((name, idx) => (
                        <tr
                          key={name}
                          className="border-b border-[#f3f4f6] last:border-b-0"
                        >
                          <td className="px-3 py-2 text-[#374151]">{name}</td>
                          <td className="px-3 py-2 text-[13px] text-[#374151]">
                            {attachments[idx].displayName || (
                              <span className="text-muted">Chưa có file</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              title="Xem"
                              onClick={() => handleFileView(idx)}
                              disabled={!attachments[idx].file}
                              className={
                                attachments[idx].file
                                  ? "text-muted hover:text-primary"
                                  : "cursor-not-allowed opacity-40"
                              }
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 border-t border-[#e5e7eb] px-7 py-4">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="h-[38px] rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb]"
                >
                  Trở về
                </button>
                <button
                  type="button"
                  onClick={confirmWizard}
                  disabled={
                    isSubmitting ||
                    (wizardMode === "add" ? !canCreate : (!canUpdate || !isBusinessFormChanged()))
                  }
                  className="flex h-[38px] items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    "Đang xử lý..."
                  ) : (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Xác nhận
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>


      {/* Account popup */}
      {accountInfo ? (
        <>
          <div className="fixed inset-0 z-[399] bg-black/50" />
          <div className="fixed left-1/2 top-1/2 z-[400] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="rounded-t-[10px] bg-primary px-5 py-3.5">
              <h3 className="text-center text-[15px] font-bold text-white">
                Thông tin tài khoản
              </h3>
            </div>
            <div className="px-5 pb-3 pt-4">
              <p className="mb-2 text-[13.5px] text-ink">
                • Tài khoản: <strong>{accountInfo.username}</strong>
              </p>
              <p className="mb-2 text-[13.5px] text-ink">
                • Mật khẩu: <strong>{accountInfo.password}</strong>
              </p>
            </div>
            <div className="px-5 pb-3.5 text-right">
              <button
                type="button"
                onClick={() => setAccountInfo(null)}
                className="text-[13px] text-muted hover:text-[#374151]"
              >
                Huỷ bỏ
              </button>
            </div>
          </div>
        </>
      ) : null}

      {/* Modal đặt lại mật khẩu */}
      <div
        className={`fixed inset-0 z-[300] flex items-center justify-center bg-black/45 transition-opacity duration-200 ${
          resetTarget ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`w-[400px] overflow-hidden rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
            resetTarget ? "translate-y-0" : "translate-y-3"
          }`}
        >
          <div className="bg-primary px-5 py-4 text-center">
            <h3 className="text-base font-semibold text-white">Xác nhận</h3>
          </div>
          <div className="px-6 py-5">
            <p className="mb-3.5 text-[13.5px] text-[#374151]">
              Khởi tạo mật khẩu cho tài khoản{" "}
              <strong>{resetTarget?.taxCode}</strong>
            </p>
            <PasswordField
              label="Mật khẩu mới"
              value={resetPwd}
              onChange={(v) => {
                setResetPwd(v);
                if (resetPwdError) setResetPwdError(null);
              }}
              autoComplete="new-password"
              hasError={!!resetPwdError}
              helperText={resetPwdError ?? undefined}
            />
          </div>
          <div className="flex justify-end gap-3 px-6 pb-5">
            <button
              type="button"
              onClick={() => setResetTarget(null)}
              className="h-[38px] rounded-md px-5 text-sm font-medium text-muted hover:bg-[#f9fafb] hover:text-[#374151]"
            >
              Huỷ bỏ
            </button>
            <button
              type="button"
              onClick={confirmResetPwd}
              disabled={isResettingPwd}
              className="flex h-[38px] items-center gap-1.5 rounded-md bg-primary px-6 text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {isResettingPwd ? "Đang xử lý..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>

      {/* Floating bulk-action bar */}
      {selectedIds.size > 0 ? (
        <div className="fixed bottom-6 left-1/2 z-[300] -translate-x-1/2">
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
      <div
        className={`fixed inset-0 z-[400] flex items-center justify-center bg-black/45 transition-opacity duration-200 ${
          deleteConfirmOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`w-[400px] overflow-hidden rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
            deleteConfirmOpen ? "translate-y-0" : "translate-y-3"
          }`}
        >
          <div className="bg-primary px-5 py-4 text-center">
            <h3 className="text-base font-semibold text-white">Xác nhận xóa</h3>
          </div>
          <div className="px-6 py-5">
            <p className="text-[13.5px] text-[#374151]">
              Bạn có chắc muốn xóa <strong>{selectedIds.size}</strong> doanh
              nghiệp đã chọn? Hành động này không thể hoàn tác.
            </p>
          </div>
          <div className="flex justify-end gap-3 px-6 pb-5">
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              className="h-[38px] rounded-md px-5 text-sm font-medium text-muted hover:bg-[#f9fafb] hover:text-[#374151]"
            >
              Huỷ bỏ
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              className="h-[38px] rounded-md bg-danger px-6 text-sm font-semibold text-white hover:bg-[#dc2626]"
            >
              Xóa
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileRef0}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => handleFileSelect(0, e)}
      />
      <input
        ref={fileRef1}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => handleFileSelect(1, e)}
      />

      <LoadingOverlay open={isDeleting} message="Đang xóa..." />
      {importModalOpen && (
        <EnterpriseImportForm
          onClose={() => setImportModalOpen(false)}
          onFileReady={(file, fileName) => {
            setImportModalOpen(false);
            handleFileDrop(file, fileName);
          }}
        />
      )}
      {/* Modal Preview & Sửa lỗi Import */}
      {importPreviewOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/45 transition-opacity duration-200">
          <div className="w-11/12 max-w-7xl h-[85vh] flex flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="bg-primary px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                Kiểm tra dữ liệu Import Doanh nghiệp: {importFileName}
              </h3>
              <button
                type="button"
                onClick={() => setImportPreviewOpen(false)}
                className="text-white hover:text-white/80 transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="bg-[#f8fafc] px-6 py-3 border-b border-line flex items-center justify-between text-[13px] text-ink font-medium">
              <div className="flex gap-4">
                <span>
                  Tổng số dòng:{" "}
                  <strong className="text-primary">{importRows.length}</strong>
                </span>
                <span>
                  Hợp lệ:{" "}
                  <strong className="text-success">
                    {importRows.length - Object.keys(importErrors).length}
                  </strong>
                </span>
                <span>
                  Lỗi:{" "}
                  <strong className="text-danger">
                    {Object.keys(importErrors).length}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-body">
              <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-sm">
                <table className="w-full border-collapse text-[13px] min-w-[2000px]">
                  <thead>
                    <tr className="bg-[#f9fafb] border-b border-line">
                      <th className="border-r border-line px-3 py-2.5 text-center text-ink font-semibold w-12 sticky left-0 bg-[#f9fafb] z-10">
                        STT
                      </th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-64">
                        Tên doanh nghiệp *
                      </th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-36">
                        Mã số thuế *
                      </th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-48">
                        Loại hình kinh doanh *
                      </th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-56">
                        Ngành nghề KD *
                      </th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-36">
                        Ngày cấp GPKD
                      </th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-36">
                        Tỉnh ĐKKD *
                      </th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-36">
                        Phường ĐKKD *
                      </th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-48">
                        Địa chỉ ĐKKD
                      </th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-48">
                        Tên nước ngoài
                      </th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-48">
                        Email *
                      </th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-36">
                        SĐT văn phòng
                      </th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-36">
                        Tỉnh hoạt động
                      </th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-36">
                        Phường hoạt động
                      </th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-48">
                        Địa chỉ hoạt động
                      </th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-40">
                        Người đại diện
                      </th>
                      <th className="px-3 py-2.5 text-left text-ink font-semibold w-36">
                        SĐT đại diện
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((row, idx) => {
                      const rowErrs = importErrors[idx] || {};
                      const hasErr = Object.keys(rowErrs).length > 0;
                      return (
                        <tr
                          key={idx}
                          className={`border-b border-line ${hasErr ? "bg-red-50/20" : "hover:bg-[#f9fafb]"}`}
                        >
                          <td className="border-r border-line px-3 py-3 text-center text-muted font-medium bg-[#f9fafb] sticky left-0 z-10">
                            {idx + 1}
                          </td>
                          {[
                            "Tên doanh nghiệp",
                            "Mã số thuế",
                            "Loại hình kinh doanh",
                            "Ngành nghề kinh doanh",
                            "Ngày cấp GPKD",
                            "Tỉnh ĐKKD",
                            "Phường ĐKKD",
                            "Địa chỉ",
                            "Tên tiếng nước ngoài",
                            "Email",
                            "SĐT văn phòng",
                            "Tỉnh hoạt động",
                            "Phường hoạt động",
                            "Địa chỉ hoạt động",
                            "Người đại diện",
                            "SĐT đại diện",
                          ].map((col, colIdx) => {
                            const err = rowErrs[col];
                            const isLast = colIdx === 15;
                            return (
                              <td
                                key={col}
                                className={`p-2 relative align-top ${isLast ? "" : "border-r border-line"}`}
                              >
                                <input
                                  type="text"
                                  value={row[col] || ""}
                                  onChange={(e) =>
                                    handleCellChange(idx, col, e.target.value)
                                  }
                                  className={`w-full h-8 px-2 rounded border text-[12.5px] outline-none transition-all ${
                                    err
                                      ? "border-danger bg-red-50/40 focus:border-danger focus:ring-2 focus:ring-danger/10"
                                      : "border-line focus:border-primary focus:ring-2 focus:ring-primary/10"
                                  }`}
                                />
                                {err && (
                                  <div className="text-[11px] text-danger font-medium mt-1.5 leading-tight">
                                    {err}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-line bg-[#f8fafc]">
              <button
                type="button"
                onClick={() => setImportPreviewOpen(false)}
                className="h-[38px] rounded-md px-5 text-sm font-medium text-muted hover:bg-white hover:text-ink border border-line transition-colors bg-white"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={
                  isImportSubmitting || Object.keys(importErrors).length > 0
                }
                className="h-[38px] rounded-md bg-primary px-6 text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isImportSubmitting ? "Đang import..." : "Xác nhận & Gửi"}
              </button>
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
