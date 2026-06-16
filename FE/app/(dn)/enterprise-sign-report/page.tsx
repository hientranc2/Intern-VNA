"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
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
} from "@/libs/tts/accident-report/atvsldReportApi";

type PageView = "list" | "form";
type FormStep = "khaibao" | "xembaocao";

const FILTER_INPUT =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] text-ink outline-none focus:border-[#3b82f6]";
const FIELD =
  "h-[38px] w-full rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";
const YEAR_SELECT =
  "h-[34px] cursor-pointer appearance-none rounded-md border border-line bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat px-3 pr-8 text-[13px] outline-none";

const EDITABLE_STATUSES: ReportStatus[] = ["Chờ báo cáo", "Nhập liệu", "Từ chối"];

function StatusCell({ status }: { status: ReportStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${meta.text}`}>
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
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${field.fullWidth ? "col-span-3" : ""}`}>
      <label className="text-[12.5px] font-medium text-[#374151]">
        {field.label}
        {field.required ? <span className="text-danger"> *</span> : null}
      </label>
      <div className="relative">
        <input
          type={field.type === "number" || !field.type ? "number" : "text"}
          min={0}
          className={`${FIELD} ${field.unit ? "pr-24" : ""}${invalid ? " border-danger" : ""}`}
          value={value}
          placeholder={field.type === "month" ? "MM/YYYY" : undefined}
          onChange={(e) => onChange(e.target.value)}
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
  const [year, setYear] = useState("2022");

  const [reports, setReports] = useState<AtvsldReport[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [values, setValues] = useState<DeclarationValues>(EMPTY_DECLARATION);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fStatus, setFStatus] = useState("");
  const [fTen, setFTen] = useState("");
  const [fKy, setFKy] = useState("");
  const [fNguoi, setFNguoi] = useState("");

  const editingReport = useMemo(
    () => reports.find((r) => r.id === editingId),
    [reports, editingId],
  );

  const loadReports = useCallback(() => {
    getMyAtvsldReports({ nam: Number(year) })
      .then(setReports)
      .catch(() => setToast("Không tải được danh sách báo cáo"));
  }, [year]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filtered = useMemo(
    () =>
      reports.filter(
        (r) =>
          (!fStatus || r.status === fStatus) &&
          r.ten.toLowerCase().includes(fTen.toLowerCase()) &&
          (!fKy || r.ky === fKy) &&
          r.nguoiChinhSua.toLowerCase().includes(fNguoi.toLowerCase()),
      ),
    [reports, fStatus, fTen, fKy, fNguoi],
  );

  const openForm = (report: AtvsldReport, readonly: boolean) => {
    setEditingId(report.id);
    setValues(EMPTY_DECLARATION);
    setTriedSubmit(false);
    setStep(readonly ? "xembaocao" : "khaibao");
    setView("form");
    getAtvsldReportById(report.id)
      .then((detail) => setValues({ ...EMPTY_DECLARATION, ...detail.declaration }))
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

  const saveDraft = async () => {
    if (editingId == null) return;
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
      await updateAtvsldReport(editingId, { declaration: values });
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
            <h1 className="text-base font-semibold text-ink">Danh sách báo cáo ATVSLĐ</h1>
            <select className={YEAR_SELECT} value={year} onChange={(e) => setYear(e.target.value)}>
              <option>2022</option>
              <option>2023</option>
              <option>2024</option>
            </select>
          </div>

          <div className="px-6 py-5">
            <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr>
                      {["Thao tác", "Trạng thái", "Tên doanh nghiệp", "Ngày bắt đầu", "Ngày kết thúc", "Kỳ báo cáo", "Ngày cập nhật", "Người chỉnh sửa"].map((h) => (
                        <th key={h} className="whitespace-nowrap border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                          {h}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <select className={`${FILTER_INPUT} cursor-pointer bg-white`} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                          <option value="">Tất cả</option>
                          {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input className={FILTER_INPUT} value={fTen} onChange={(e) => setFTen(e.target.value)} />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input className={FILTER_INPUT} placeholder="dd/MM/yyyy" disabled />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input className={FILTER_INPUT} placeholder="dd/MM/yyyy" disabled />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <select className={`${FILTER_INPUT} cursor-pointer bg-white`} value={fKy} onChange={(e) => setFKy(e.target.value)}>
                          <option value="">Cả năm</option>
                          <option>6 tháng</option>
                          <option>Cả năm</option>
                        </select>
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input className={FILTER_INPUT} value={fNguoi} onChange={(e) => setFNguoi(e.target.value)} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={8} className="px-3.5 py-8 text-center text-[13.5px] text-muted">Không có dữ liệu</td></tr>
                    ) : (
                      filtered.map((r) => {
                        const canEdit = EDITABLE_STATUSES.includes(r.status);
                        return (
                          <tr key={r.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                            <td className="whitespace-nowrap px-3.5 py-2.5">
                              <div className="flex gap-1">
                                <button type="button" onClick={() => openForm(r, true)} title="Xem" className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                                  </svg>
                                </button>
                                {canEdit ? (
                                  <button type="button" onClick={() => openForm(r, false)} title="Nhập liệu" className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                  </button>
                                ) : null}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-2.5"><StatusCell status={r.status} /></td>
                            <td className="px-3.5 py-2.5 text-[#374151]">{r.ten}</td>
                            <td className="whitespace-nowrap px-3.5 py-2.5 text-[#374151]">{r.ngayBatDau}</td>
                            <td className="whitespace-nowrap px-3.5 py-2.5 text-[#374151]">{r.ngayKetThuc}</td>
                            <td className="whitespace-nowrap px-3.5 py-2.5 text-[#374151]">{r.ky}</td>
                            <td className="whitespace-nowrap px-3.5 py-2.5 text-[#374151]">{r.ngayCapNhat || "–"}</td>
                            <td className="whitespace-nowrap px-3.5 py-2.5 text-[#374151]">{r.nguoiChinhSua || "–"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-[#f3f4f6] px-4 py-3 text-[13px] text-[#6b7280]">
                <span>1 - {filtered.length} of {filtered.length}</span>
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
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold ${active ? "bg-primary text-white" : "bg-[#e5e7eb] text-[#6b7280]"}`}>{s.n}</span>
                    <span className={`text-[13.5px] ${active ? "font-semibold text-ink" : "text-muted"}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2.5">
              <button type="button" onClick={() => setView("list")} className="text-[13.5px] font-medium text-[#374151] hover:text-ink">Huỷ bỏ</button>
              {step === "khaibao" ? (
                <button type="button" onClick={() => { if (validateDeclaration()) setStep("xembaocao"); }} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]">
                  Tiếp tục <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => setStep("khaibao")} className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-[13px] font-medium text-[#374151] hover:bg-body">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg> Quay lại
                  </button>
                  <button type="button" onClick={saveDraft} disabled={saving} className="flex h-9 items-center gap-1.5 rounded-md border border-primary bg-white px-4 text-[13px] font-semibold text-primary hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-50">
                    Lưu nháp
                  </button>
                  <button type="button" onClick={sendReport} disabled={saving} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    Gửi báo cáo
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="px-6 py-5">
            {step === "khaibao" ? (
              <div className="space-y-4">
                {DECLARATION_SECTIONS.map((section) => (
                  <div key={section.no} className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div className="text-[14px] font-bold text-ink">{section.no}. {section.title}</div>
                      {section.note ? <div className="shrink-0 text-[12px] font-medium text-danger">{section.note}</div> : null}
                    </div>
                    <div className="grid grid-cols-3 gap-x-3.5 gap-y-3.5">
                      {section.fields.map((f) => (
                        <DeclarationField key={f.key} field={f} value={values[f.key] ?? ""} onChange={(v) => setField(f.key, v)} invalid={triedSubmit && !!f.required && !(values[f.key] ?? "").trim()} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-white p-8 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <PhuLucIIView values={values} report={editingReport} />
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
