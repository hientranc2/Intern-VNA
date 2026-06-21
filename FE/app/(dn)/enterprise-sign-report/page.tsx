"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { Modal } from "@/libs/shared/core/components/Modal/Modal";
import { PhuLucIIView } from "@/libs/tts/accident-report/PhuLucIIView";
import {
  DECLARATION_SECTIONS,
  EMPTY_DECLARATION,
  STATUS_META,
  STATUS_OPTIONS,
  type AtvsldReport,
  type DeclarationValues,
  type FieldDef,
  type ReportStatus,
} from "@/libs/tts/accident-report/atvsldReportData";
import {
  getMyAtvsldReports,
  getAtvsldReportById,
  updateAtvsldReport,
  submitAtvsldReport,
  createAtvsldReport,
} from "@/libs/tts/accident-report/atvsldReportApi";
import {
  BusinessDetail,
  getBusinessById,
} from "@/libs/tts/enterprise/enterpriseApi";
import { getBusinessId } from "@/libs/tts/auth/authApi";

type PageView = "list" | "form";
type FormStep = "khaibao" | "xembaocao";

const FILTER_INPUT =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] text-ink outline-none focus:border-[#3b82f6]";
const FIELD =
  "h-[38px] w-full rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";
const SELECT_FIELD =
  "h-[38px] w-full cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8 rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";
const YEAR_SELECT =
  "h-[34px] cursor-pointer appearance-none rounded-md border border-line bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat px-3 pr-8 text-[13px] outline-none";

// "dd/MM/yyyy" -> số yyyymmdd để so sánh khoảng ngày; null nếu chưa đủ/không hợp lệ.
const toDateNum = (s: string): number | null => {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? Number(m[3] + m[2] + m[1]) : null;
};

const dmyToYmd = (dmy: string): string => {
  if (!dmy || dmy === "–") return "";
  const parts = dmy.split("/");
  if (parts.length === 3) {
    const d = parts[0].trim().padStart(2, "0");
    const m = parts[1].trim().padStart(2, "0");
    const y = parts[2].trim();
    return `${y}-${m}-${d}`;
  }
  return "";
};

const ymdToDmy = (ymd: string): string => {
  if (!ymd) return "";
  const parts = ymd.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return "";
};

function MiniDateFilter({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const formatted = value ? ymdToDmy(value) : "dd/mm/yyyy";

  return (
    <div
      className={`relative flex items-center justify-between h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] select-none ${disabled ? "bg-[#f3f4f6] cursor-not-allowed opacity-60" : "bg-white cursor-pointer"}`}
    >
      <span
        className={
          disabled ? "text-[#9ca3af]" : value ? "text-ink" : "text-muted"
        }
      >
        {formatted}
      </span>
      {value && !disabled ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="clear-btn p-0.5 text-muted hover:text-ink z-10 relative"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      ) : (
        <svg
          className="text-muted"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-0 disabled:cursor-not-allowed"
      />
    </div>
  );
}

const EDITABLE_STATUSES: ReportStatus[] = [
  "Chờ báo cáo",
  "Nhập liệu",
  "Từ chối",
];

function StatusCell({ status }: { status: ReportStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${meta.text}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${meta.dot}`} />
      {status}
    </span>
  );
}

function DeclarationField({
  field,
  value,
  onChange,
  invalid,
  disabled,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 ${field.fullWidth ? "col-span-3" : ""}`}
    >
      <label className="text-[12.5px] font-medium text-[#374151]">
        {field.label}
        {field.required ? <span className="text-danger"> *</span> : null}
      </label>
      <div className="relative">
        <input
          type={field.type === "number" || !field.type ? "number" : "text"}
          min={0}
          className={`${FIELD} ${field.unit ? "pr-24" : ""}${invalid ? " border-danger" : ""}${disabled ? " bg-[#f3f4f6] cursor-not-allowed text-[#9ca3af] border-[#e5e7eb]" : ""}`}
          value={value}
          placeholder={field.type === "month" ? "MM/YYYY" : undefined}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        {field.unit ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11.5px] text-muted">
            {field.unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function EnterpriseSignReportPage() {
  const [view, setView] = useState<PageView>("list");
  const [step, setStep] = useState<FormStep>("khaibao");
  const [toast, setToast] = useState<string | null>(null);
  const [year, setYear] = useState("Tất cả");

  const [reports, setReports] = useState<AtvsldReport[]>([]);
  const [businessDetail, setBusinessDetail] = useState<BusinessDetail | null>(
    null,
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [values, setValues] = useState<DeclarationValues>(EMPTY_DECLARATION);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [saving, setSaving] = useState(false);
  const originalDeclarationRef = useRef<DeclarationValues | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createYear, setCreateYear] = useState("");
  const [createKy, setCreateKy] = useState("6 tháng");
  const [creating, setCreating] = useState(false);

  const isAlreadyCreated = useMemo(() => {
    return reports.some(
      (r) => r.nam === Number(createYear) && r.ky === createKy,
    );
  }, [reports, createYear, createKy]);

  const openCreateModal = () => {
    setCreateYear(String(new Date().getFullYear()));
    setCreateKy("6 tháng");
    setCreateModalOpen(true);
  };

  const confirmCreateReport = async () => {
    if (isAlreadyCreated) {
      setToast("Bạn đã tạo báo cáo cho kỳ này rồi");
      return;
    }
    setCreating(true);
    try {
      const created = await createAtvsldReport({
        nam: Number(createYear),
        ky: createKy as AtvsldReport["ky"],
        declaration: EMPTY_DECLARATION,
      });
      setCreateModalOpen(false);
      setToast("Tạo báo cáo thành công");
      loadReports();
      openForm(created, false);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Tạo báo cáo thất bại");
    } finally {
      setCreating(false);
    }
  };

  const [fStatus, setFStatus] = useState("");
  const [fTen, setFTen] = useState("");
  const [fKy, setFKy] = useState("");
  const [fNam, setFNam] = useState("");
  const [fNguoi, setFNguoi] = useState("");
  const [fNgayBatDau, setFNgayBatDau] = useState("");
  const [fNgayCapNhat, setFNgayCapNhat] = useState("");
  const [fNgayKetThuc, setFNgayKetThuc] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyReport, setHistoryReport] = useState<AtvsldReport | null>(null);

  const editingReport = useMemo(
    () => reports.find((r) => r.id === editingId),
    [reports, editingId],
  );

  const parseDate = (dStr: string) => {
    if (!dStr) return new Date();
    const parts = dStr.split("/");
    if (parts.length === 3) {
      return new Date(
        Number(parts[2]),
        Number(parts[1]) - 1,
        Number(parts[0]),
        8,
        0,
      );
    }
    return new Date();
  };

  const displayHistory = useMemo(() => {
    if (!historyReport) return [];

    const list = historyReport.history ? [...historyReport.history] : [];

    // 1. Tự động thêm sự kiện tạo bản nháp nếu thiếu
    const hasCreate = list.some((h) => h.action === "đã tạo bản nháp báo cáo");
    if (!hasCreate) {
      const createdDate = parseDate(historyReport.ngayCapNhat);
      list.unshift({
        timestamp: createdDate.toISOString(),
        actor: historyReport.ten,
        action: "đã tạo bản nháp báo cáo",
      });
    }

    // 2. Tự động thêm sự kiện nộp báo cáo nếu thiếu và đã nộp
    const hasSubmit = list.some((h) => h.action === "đã gửi báo cáo");
    if (
      !hasSubmit &&
      historyReport.ngayNop &&
      historyReport.ngayNop !== "–" &&
      historyReport.ngayNop !== ""
    ) {
      const nopDate = parseDate(historyReport.ngayNop);
      list.splice(1, 0, {
        timestamp: nopDate.toISOString(),
        actor: historyReport.ten,
        action: "đã gửi báo cáo",
      });
    }

    return list;
  }, [historyReport]);

  const loadReports = useCallback(() => {
    getMyAtvsldReports({ nam: year ? Number(year) : undefined })
      .then(setReports)
      .catch(() => setToast("Không tải được danh sách báo cáo"));
  }, [year]);

  const openHistory = (report: AtvsldReport) => {
    setHistoryReport(report);
    setHistoryOpen(true);
    getAtvsldReportById(report.id)
      .then((detail) => {
        setHistoryReport(detail);
        setReports((prev) =>
          prev.map((r) => (r.id === report.id ? detail : r)),
        );
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    const bizId = getBusinessId();
    if (bizId) {
      getBusinessById(bizId)
        .then(setBusinessDetail)
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (fNgayBatDau && fNgayCapNhat) {
      setFNgayKetThuc("");
    }
  }, [fNgayBatDau, fNgayCapNhat]);

  const filtered = useMemo(() => {
    const bothFilled = !!(fNgayBatDau && fNgayCapNhat);
    return reports.filter((r) => {
      if (fStatus && r.status !== fStatus) return false;
      if (fTen && !(r.ten || "").toLowerCase().includes(fTen.toLowerCase()))
        return false;
      if (fKy && r.ky !== fKy) return false;
      if (fNam && String(r.nam) !== fNam) return false;
      if (
        fNguoi &&
        !(r.nguoiChinhSua || "").toLowerCase().includes(fNguoi.toLowerCase())
      )
        return false;

      if (bothFilled) {
        // Lọc khoảng thời gian của Ngày bắt đầu: fNgayBatDau <= r.ngayBatDau <= fNgayCapNhat
        const startYmd = dmyToYmd(r.ngayBatDau);
        if (startYmd < fNgayBatDau || startYmd > fNgayCapNhat) return false;
      } else {
        // Lọc riêng lẻ: lấy từ ngày chọn trở đi (on or after / >=)
        if (fNgayBatDau) {
          const startYmd = dmyToYmd(r.ngayBatDau);
          if (startYmd < fNgayBatDau) return false;
        }
        if (fNgayCapNhat) {
          const updateYmd = dmyToYmd(r.ngayCapNhat);
          if (updateYmd < fNgayCapNhat) return false;
        }
      }

      // Lọc Ngày kết thúc: khớp chính xác (chỉ áp dụng khi không điền đồng thời cả 2 bộ lọc trên)
      if (!bothFilled && fNgayKetThuc) {
        if (dmyToYmd(r.ngayKetThuc) !== fNgayKetThuc) return false;
      }
      return true;
    });
  }, [
    reports,
    fStatus,
    fTen,
    fNgayBatDau,
    fNgayCapNhat,
    fNgayKetThuc,
    fKy,
    fNam,
    fNguoi,
  ]);

  const openForm = (report: AtvsldReport, readonly: boolean) => {
    setEditingId(report.id);
    setValues(EMPTY_DECLARATION);
    setTriedSubmit(false);
    setIsReadOnly(readonly);
    setStep(readonly ? "xembaocao" : "khaibao");
    setView("form");
    getAtvsldReportById(report.id)
      .then((detail) => {
        const loadedDec = { ...EMPTY_DECLARATION, ...detail.declaration };
        setValues(loadedDec);
        originalDeclarationRef.current = loadedDec;
        setReports((prev) =>
          prev.map((r) => (r.id === report.id ? detail : r)),
        );
      })
      .catch(() => setToast("Không tải được nội dung báo cáo"));
  };

  const setField = (key: string, v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const validateDeclaration = (): boolean => {
    const missing = DECLARATION_SECTIONS.flatMap((s) => s.fields).filter(
      (f) => f.required && !(values[f.key] ?? "").trim(),
    );
    if (missing.length > 0) {
      setTriedSubmit(true);
      setToast(`Vui lòng nhập: ${missing.map((f) => f.label).join(", ")}`);
      setStep("khaibao");
      return false;
    }
    return true;
  };

  const isDeclarationChanged = () => {
    if (!originalDeclarationRef.current) return true;
    const orig = originalDeclarationRef.current;
    const allKeys = Object.keys(EMPTY_DECLARATION) as Array<
      keyof DeclarationValues
    >;
    for (const key of allKeys) {
      if ((values[key] ?? "") !== (orig[key] ?? "")) {
        return true;
      }
    }
    return false;
  };

  const saveDraft = async () => {
    if (editingId == null) return;
    if (!isDeclarationChanged()) {
      setToast("Không có thay đổi nào cần lưu");
      setView("list");
      return;
    }
    setSaving(true);
    try {
      await updateAtvsldReport(editingId, { declaration: values });
      setView("list");
      setToast("Lưu báo cáo thành công");
      loadReports();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Lưu báo cáo thất bại");
    } finally {
      setSaving(false);
    }
  };

  const sendReport = async () => {
    if (!validateDeclaration()) return;
    if (editingId == null) return;
    setSaving(true);
    try {
      if (isDeclarationChanged()) {
        await updateAtvsldReport(editingId, { declaration: values });
      }
      await submitAtvsldReport(editingId);
      setView("list");
      setToast("Gửi báo cáo thành công");
      loadReports();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Gửi báo cáo thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Toast message={toast} onDone={() => setToast(null)} />

      {view === "list" ? (
        <>
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <h1 className="text-base font-semibold text-ink">
              Danh sách báo cáo ATVSLĐ
            </h1>
            <div className="flex items-center gap-3">
              <select
                className={YEAR_SELECT}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="2022">2022</option>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
              <button
                type="button"
                onClick={openCreateModal}
                className="flex h-[34px] items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]"
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
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr>
                      {[
                        { name: "Thao tác", width: "w-[85px]" },
                        { name: "Trạng thái", width: "w-[120px]" },
                        { name: "Tên doanh nghiệp", width: "" },
                        { name: "Ngày bắt đầu", width: "w-[110px]" },
                        { name: "Ngày cập nhật", width: "w-[125px]" },
                        { name: "Năm", width: "w-[80px]" },
                        { name: "Kỳ báo cáo", width: "w-[110px]" },
                        { name: "Ngày kết thúc", width: "w-[125px]" },
                        {
                          name: "Người chỉnh sửa",
                          width: "w-[150px] max-w-[150px]",
                        },
                      ].map((col) => (
                        <th
                          key={col.name}
                          className={`whitespace-nowrap border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151] ${col.width}`}
                        >
                          {col.name}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <select
                          className={`${FILTER_INPUT} cursor-pointer bg-white`}
                          value={fStatus}
                          onChange={(e) => setFStatus(e.target.value)}
                        >
                          <option value="">Tất cả</option>
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input
                          className={FILTER_INPUT}
                          value={fTen}
                          onChange={(e) => setFTen(e.target.value)}
                        />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <MiniDateFilter
                          value={fNgayBatDau}
                          onChange={setFNgayBatDau}
                        />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <MiniDateFilter
                          value={fNgayCapNhat}
                          onChange={setFNgayCapNhat}
                        />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input
                          className={FILTER_INPUT}
                          value={fNam}
                          onChange={(e) => setFNam(e.target.value)}
                        />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <select
                          className={`${FILTER_INPUT} cursor-pointer bg-white`}
                          value={fKy}
                          onChange={(e) => setFKy(e.target.value)}
                        >
                          <option value="">Tất cả</option>
                          <option>6 tháng</option>
                          <option>Cả năm</option>
                        </select>
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <MiniDateFilter
                          value={fNgayKetThuc}
                          onChange={setFNgayKetThuc}
                          disabled={!!(fNgayBatDau && fNgayCapNhat)}
                        />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input
                          className={FILTER_INPUT}
                          value={fNguoi}
                          onChange={(e) => setFNguoi(e.target.value)}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-3.5 py-8 text-center text-[13.5px] text-muted"
                        >
                          Không có dữ liệu
                        </td>
                      </tr>
                    ) : (
                      filtered.map((r) => {
                        const canEdit = EDITABLE_STATUSES.includes(r.status);
                        return (
                          <tr
                            key={r.id}
                            className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]"
                          >
                            <td className="whitespace-nowrap px-3.5 py-2.5">
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => openForm(r, true)}
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
                                  onClick={() => openHistory(r)}
                                  title="Lịch sử xử lý"
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
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                  </svg>
                                </button>
                                {canEdit ? (
                                  <button
                                    type="button"
                                    onClick={() => openForm(r, false)}
                                    title="Nhập liệu"
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
                                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                  </button>
                                ) : null}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-2.5">
                              <StatusCell status={r.status} />
                            </td>
                            <td className="px-3.5 py-2.5 text-[#374151]">
                              {r.ten}
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-2.5 text-[#374151]">
                              {r.ngayBatDau}
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-2.5 text-[#374151]">
                              {r.ngayCapNhat || "–"}
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-2.5 text-[#374151]">
                              {r.nam}
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-2.5 text-[#374151]">
                              {r.ky}
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-2.5 text-[#374151]">
                              {r.ngayKetThuc || "–"}
                            </td>
                            <td
                              className="whitespace-nowrap px-3.5 py-2.5 text-[#374151] max-w-[150px] truncate"
                              title={r.nguoiChinhSua || "–"}
                            >
                              {r.nguoiChinhSua || "–"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-[#f3f4f6] px-4 py-3 text-[13px] text-[#6b7280]">
                <span>
                  1 - {filtered.length} of {filtered.length}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <div className="flex items-center gap-5">
              {[
                { id: "khaibao", n: 1, label: "Khai báo" },
                { id: "xembaocao", n: 2, label: "Xem báo cáo" },
              ].map((s) => {
                const active = step === s.id;
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold ${active ? "bg-primary text-white" : "bg-[#e5e7eb] text-[#6b7280]"}`}
                    >
                      {s.n}
                    </span>
                    <span
                      className={`text-[13.5px] ${active ? "font-semibold text-ink" : "text-muted"}`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setView("list")}
                className="text-[13.5px] font-medium text-[#374151] hover:text-ink"
              >
                Huỷ bỏ
              </button>
              {step === "khaibao" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (validateDeclaration()) setStep("xembaocao");
                  }}
                  className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]"
                >
                  Tiếp tục{" "}
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
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setStep("khaibao")}
                    className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-[13px] font-medium text-[#374151] hover:bg-body"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>{" "}
                    Quay lại
                  </button>
                  {!isReadOnly && (
                    <>
                      <button
                        type="button"
                        onClick={saveDraft}
                        disabled={saving}
                        className="flex h-9 items-center gap-1.5 rounded-md border border-primary bg-white px-4 text-[13px] font-semibold text-primary hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Lưu nháp
                      </button>
                      <button
                        type="button"
                        onClick={sendReport}
                        disabled={saving}
                        className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                        Gửi báo cáo
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="px-6 py-5">
            {step === "khaibao" ? (
              <div className="space-y-4">
                {DECLARATION_SECTIONS.map((section) => (
                  <div
                    key={section.no}
                    className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]"
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div className="text-[14px] font-bold text-ink">
                        {section.no}. {section.title}
                      </div>
                      {section.note ? (
                        <div className="shrink-0 text-[12px] font-medium text-danger">
                          {section.note}
                        </div>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-3 gap-x-3.5 gap-y-3.5">
                      {section.fields.map((f) => (
                        <DeclarationField
                          key={f.key}
                          field={f}
                          value={values[f.key] ?? ""}
                          onChange={(v) => setField(f.key, v)}
                          invalid={
                            triedSubmit &&
                            !!f.required &&
                            !(values[f.key] ?? "").trim()
                          }
                          disabled={isReadOnly}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-white p-8 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <PhuLucIIView
                  values={values}
                  report={editingReport}
                  nganhNghe={businessDetail?.mainIndustry}
                  loaiHinh={businessDetail?.businessType}
                  diaChi={
                    businessDetail
                      ? `${businessDetail.address ?? ""}, ${businessDetail.registeredWard ?? ""}, ${businessDetail.registeredProvince ?? ""}`.replace(
                          /^,\s*/,
                          "",
                        )
                      : undefined
                  }
                  dienThoai={businessDetail?.officePhone}
                />
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        open={historyOpen}
        title="Tiến độ xử lý"
        onClose={() => setHistoryOpen(false)}
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="h-9.5 rounded-md border border-line bg-white px-5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
            >
              Đóng
            </button>
          </div>
        }
      >
        <div className="relative bg-white min-h-[100px] py-2">
          {displayHistory.length > 0 ? (
            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-[6px] top-[10px] bottom-[10px] w-[1.5px] bg-[#e2e8f0]" />

              <div className="space-y-6">
                {[...displayHistory].reverse().map((h, i) => {
                  const dateObj = new Date(h.timestamp);
                  const day = String(dateObj.getDate()).padStart(2, "0");
                  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
                  const year = dateObj.getFullYear();
                  const hours = String(dateObj.getHours()).padStart(2, "0");
                  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
                  const formattedTime = `${day}/${month}/${year} ${hours}:${minutes}`;

                  return (
                    <div key={i} className="relative pl-7 text-[13.5px]">
                      {/* Timeline circle node */}
                      <div className="absolute left-0 top-[4px] h-3.5 w-3.5 rounded-full border-2 border-[#cbd5e1] bg-white z-10" />

                      <div className="text-[#6b7280] text-[12.5px] mb-1">
                        {formattedTime}
                      </div>
                      <div className="text-ink">
                        <span className="font-bold text-[#1f2937]">
                          {h.actor}
                        </span>{" "}
                        <span className="text-[#4b5563]">{h.action}</span>
                      </div>
                      {h.lyDo && (
                        <div className="mt-1 text-[13.5px]">
                          <span className="font-bold text-danger">Lý do: </span>
                          <span className="text-[#1f2937]">{h.lyDo}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-[#6b7280] py-4">
              Chưa có lịch sử xử lý
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={createModalOpen}
        title="Thêm mới báo cáo định kỳ ATVSLĐ"
        onClose={() => setCreateModalOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              disabled={creating}
              className="h-9 rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={confirmCreateReport}
              disabled={creating || isAlreadyCreated}
              className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Đang tạo..." : "Bắt đầu khai báo"}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-[#374151]">
              Năm báo cáo <span className="text-danger">*</span>
            </label>
            <select
              className={SELECT_FIELD}
              value={createYear}
              onChange={(e) => setCreateYear(e.target.value)}
            >
              {(() => {
                const maxYear = new Date().getFullYear() + 2;
                const years = [];
                for (let y = maxYear; y >= 2022; y--) {
                  years.push(String(y));
                }
                return years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ));
              })()}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-[#374151]">
              Kỳ báo cáo <span className="text-danger">*</span>
            </label>
            <select
              className={SELECT_FIELD}
              value={createKy}
              onChange={(e) => setCreateKy(e.target.value)}
            >
              <option value="6 tháng">6 tháng</option>
              <option value="Cả năm">Cả năm</option>
            </select>
          </div>

          {isAlreadyCreated && (
            <p className="text-[12.5px] text-danger font-medium">
              Bạn đã tạo báo cáo cho năm {createYear} ({createKy}) rồi.
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
