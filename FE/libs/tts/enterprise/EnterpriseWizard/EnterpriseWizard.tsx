"use client";

import { useRef, useState } from "react";
import { FormHelperText } from "@mui/material";
import { EMPTY_BUSINESS_FORM, type BusinessFormData } from "../enterpriseData";
import { createBusiness, updateBusiness, type BusinessDetail } from "../enterpriseApi";
import { ApiError } from "@/libs/tts/auth/apiClient";
import { PROVINCES, WARDS_BY_PROVINCE } from "@/libs/tts/location/locationData";
import { SearchableSelect } from "@/libs/shared/core/components/SearchableSelect/SearchableSelect";
import { DateInput } from "@/libs/shared/core/components/DateInput/DateInput";
import { LoadingOverlay } from "@/libs/shared/core/components/LoadingOverlay/LoadingOverlay";
import { localISODate } from "@/libs/shared/core/utils/dateUtils";
import { isValidEmail, isValidPhone } from "@/libs/tts/auth/authValidation";

type WizardMode = "add" | "edit";
type Account = { username: string; password: string };

type WizardFieldErrors = {
  businessName?: string; taxCode?: string; businessType?: string;
  mainIndustry?: string; email?: string; registeredProvince?: string; registeredWard?: string;
  officePhone?: string; representativePhone?: string;
};

type EnterpriseWizardProps = {
  mode: WizardMode;
  detail?: BusinessDetail | null;
  loaiHinhOptions: string[];
  nganhCap4Options: string[];
  cancelLabel?: string;
  fullWidth?: boolean;
  onCancel: () => void;
  onCreated?: (account: Account) => void;
  onUpdated?: () => void;
  onError?: (message: string) => void;
};

const FORM_CONTROL_CLASS =
  "h-[38px] rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";

const FILE_NAMES = ["Giấy phép kinh doanh", "Giấy tờ khác"] as const;

type AttachedFile = { file: File | null; displayName: string; url?: string };

function filenameFromUrl(url?: string | null): string {
  if (!url) return "";
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || "File đã tải lên");
  } catch {
    return url.split("/").pop() || "File đã tải lên";
  }
}

// FILE_NAMES theo thứ tự [GPKD, giấy tờ khác].
function makeAttachments(licenseUrl?: string | null, otherUrl?: string | null): AttachedFile[] {
  return [
    { file: null, displayName: filenameFromUrl(licenseUrl), url: licenseUrl ?? undefined },
    { file: null, displayName: filenameFromUrl(otherUrl), url: otherUrl ?? undefined },
  ];
}

function FieldGroup({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12.5px] font-medium text-[#374151]">
        {label} {required ? <span className="text-danger">*</span> : null}
      </label>
      {children}
      {error && (
        <FormHelperText error sx={{ mt: 0, mx: 0, fontSize: "11px" }}>{error}</FormHelperText>
      )}
    </div>
  );
}

function formatLicenseDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

// Map thông điệp lỗi server về field bước 1 để hiện inline (không dùng toast).
function mapServerErrorToStep1Field(message: string): "taxCode" | "email" | null {
  const m = message.toLowerCase();
  if (m.includes("mã số thuế")) return "taxCode";
  if (m.includes("email")) return "email";
  return null;
}

function detailToForm(d: BusinessDetail): BusinessFormData {
  return {
    businessName: d.businessName ?? "",
    taxCode: d.taxCode ?? "",
    businessType: d.businessType ?? "",
    mainIndustry: d.mainIndustry ?? "",
    licenseDate: formatLicenseDate(d.licenseDate),
    registeredProvince: d.registeredProvince ?? "",
    registeredWard: d.registeredWard ?? "",
    address: d.address ?? "",
    foreignName: d.foreignName ?? "",
    email: d.email ?? "",
    officePhone: d.officePhone ?? "",
    operatingProvince: d.operatingProvince ?? "",
    operatingWard: d.operatingWard ?? "",
    operatingAddress: d.operatingAddress ?? "",
    representative: d.representative ?? "",
    representativePhone: d.representativePhone ?? "",
  };
}

export function EnterpriseWizard({
  mode,
  detail,
  loaiHinhOptions,
  nganhCap4Options,
  cancelLabel = "Huỷ bỏ",
  fullWidth = false,
  onCancel,
  onCreated,
  onUpdated,
  onError,
}: EnterpriseWizardProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<BusinessFormData>(
    mode === "edit" && detail ? detailToForm(detail) : EMPTY_BUSINESS_FORM,
  );
  const [fieldErrors, setFieldErrors] = useState<WizardFieldErrors>({});
  const [attachments, setAttachments] = useState<AttachedFile[]>(
    mode === "edit" && detail ? makeAttachments(detail.licenseFile, detail.otherFile) : makeAttachments(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileRef0 = useRef<HTMLInputElement>(null);
  const fileRef1 = useRef<HTMLInputElement>(null);
  const fileRefs = [fileRef0, fileRef1];

  const setField = <K extends keyof BusinessFormData>(key: K, value: BusinessFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const phuongDKKDOptions = WARDS_BY_PROVINCE[form.registeredProvince] ?? [];
  const phuongHDOptions = WARDS_BY_PROVINCE[form.operatingProvince] ?? [];

  const goStep2 = () => {
    const errors: WizardFieldErrors = {};
    if (!form.businessName.trim()) errors.businessName = "Tên doanh nghiệp không được để trống";
    if (!form.taxCode.trim()) {
      errors.taxCode = "Mã số thuế không được để trống";
    } else if (!/^\d{10}$/.test(form.taxCode.trim())) {
      errors.taxCode = "Mã số thuế phải gồm đúng 10 chữ số";
    }
    if (!form.businessType) errors.businessType = "Vui lòng chọn loại hình kinh doanh";
    if (!form.mainIndustry) errors.mainIndustry = "Vui lòng chọn ngành nghề kinh doanh chính";
    if (!form.email.trim()) errors.email = "Email không được để trống";
    else if (!isValidEmail(form.email.trim())) errors.email = "Email không đúng định dạng";
    if (!form.registeredProvince) errors.registeredProvince = "Vui lòng chọn tỉnh/thành phố ĐKKD";
    if (!form.registeredWard) errors.registeredWard = "Vui lòng chọn phường/xã ĐKKD";
    if (form.officePhone.trim() && !isValidPhone(form.officePhone)) errors.officePhone = "Số điện thoại không hợp lệ";
    if (form.representativePhone.trim() && !isValidPhone(form.representativePhone)) errors.representativePhone = "Số điện thoại không hợp lệ";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setStep(2);
  };

  const buildFormData = (): FormData => {
    const fd = new FormData();
    fd.append("businessName", form.businessName);
    if (mode === "add") fd.append("taxCode", form.taxCode);
    fd.append("businessType", form.businessType);
    if (form.mainIndustry) fd.append("mainIndustry", form.mainIndustry);
    if (form.licenseDate) fd.append("licenseDate", form.licenseDate);
    fd.append("registeredProvince", form.registeredProvince);
    fd.append("registeredWard", form.registeredWard);
    if (form.address) fd.append("address", form.address);
    if (form.foreignName) fd.append("foreignName", form.foreignName);
    fd.append("email", form.email);
    if (form.officePhone) fd.append("officePhone", form.officePhone);
    if (form.operatingProvince) fd.append("operatingProvince", form.operatingProvince);
    if (form.operatingWard) fd.append("operatingWard", form.operatingWard);
    if (form.operatingAddress) fd.append("operatingAddress", form.operatingAddress);
    if (form.representative) fd.append("representative", form.representative);
    if (form.representativePhone) fd.append("representativePhone", form.representativePhone);
    if (attachments[0].file) fd.append("licenseFile", attachments[0].file);
    if (attachments[1].file) fd.append("otherFile", attachments[1].file);
    return fd;
  };

  const confirm = async () => {
    setIsSubmitting(true);
    try {
      if (mode === "add") {
        const res = await createBusiness(buildFormData());
        onCreated?.(res.account);
      } else {
        await updateBusiness(detail!.id, buildFormData());
        onUpdated?.();
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Đã có lỗi xảy ra";
      const field = mapServerErrorToStep1Field(message);
      // Lỗi thuộc field bước 1 (trùng mã số thuế / email...) → quay lại bước 1, hiện inline tại field.
      if (field) {
        setFieldErrors((p) => ({ ...p, [field]: message }));
        setStep(1);
      } else {
        onError?.(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      onError?.("Chỉ cho phép tải lên file PDF");
      e.target.value = "";
      return;
    }
    setAttachments((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], file, displayName: file.name };
      return next;
    });
    e.target.value = "";
  };

  const handleFileView = (idx: number) => {
    const att = attachments[idx];
    if (att.file) { window.open(URL.createObjectURL(att.file), "_blank"); return; }
    if (att.url) window.open(att.url, "_blank");
  };

  const handleFileDelete = (idx: number) => {
    setAttachments((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], file: null, displayName: filenameFromUrl(next[idx].url) };
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

  return (
    <div className={`overflow-hidden rounded-[10px] bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)] ${fullWidth ? "w-full" : "mx-auto w-[760px] max-w-full"}`}>
      {/* Stepper */}
      <div className="flex items-center justify-center gap-0 pb-4 pt-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-primary text-[13px] font-bold text-white">
            {step === 1 ? (
              "1"
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <span className="text-[13px] font-medium text-ink">Thông tin doanh nghiệp</span>
        </div>
        <div className={`mx-2 h-0.5 w-[60px] ${step === 2 ? "bg-primary" : "bg-[#e5e7eb]"}`} />
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[13px] font-bold ${
              step === 2 ? "border-primary bg-primary text-white" : "border-[#d1d5db] bg-white text-[#9ca3af]"
            }`}
          >
            2
          </div>
          <span className={`text-[13px] ${step === 2 ? "font-medium text-ink" : "text-[#9ca3af]"}`}>
            Xác nhận đăng ký
          </span>
        </div>
      </div>

      {step === 1 ? (
        <>
          <div className="px-7 pb-6">
            <div className="mb-4 text-[15px] font-bold text-ink">
              {mode === "add" ? "Thêm mới doanh nghiệp" : "Cập nhật doanh nghiệp"}
            </div>
            <div className="mb-4 rounded-lg border border-[#e5e7eb] p-5">
              <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                <FieldGroup label="Tên doanh nghiệp" required error={fieldErrors.businessName}>
                  <input
                    className={`${FORM_CONTROL_CLASS}${fieldErrors.businessName ? " border-danger" : ""}`}
                    value={form.businessName}
                    onChange={(e) => { setField("businessName", e.target.value); if (fieldErrors.businessName) setFieldErrors((p) => ({ ...p, businessName: undefined })); }}
                    placeholder="VD: Công ty cổ phần ABC"
                  />
                </FieldGroup>
                <FieldGroup label="Mã số thuế" required error={fieldErrors.taxCode}>
                  <input
                    className={`${FORM_CONTROL_CLASS}${fieldErrors.taxCode ? " border-danger" : ""} disabled:cursor-not-allowed disabled:bg-body disabled:text-muted`}
                    value={form.taxCode}
                    disabled={mode === "edit"}
                    maxLength={10}
                    onChange={(e) => { setField("taxCode", e.target.value); if (fieldErrors.taxCode) setFieldErrors((p) => ({ ...p, taxCode: undefined })); }}
                    placeholder="VD: 0310000888"
                  />
                </FieldGroup>
                <FieldGroup label="Loại hình kinh doanh" required error={fieldErrors.businessType}>
                  <SearchableSelect
                    options={loaiHinhOptions}
                    value={form.businessType}
                    placeholder="-- Chọn loại hình --"
                    error={!!fieldErrors.businessType}
                    onChange={(v) => { setField("businessType", v); if (fieldErrors.businessType) setFieldErrors((p) => ({ ...p, businessType: undefined })); }}
                  />
                </FieldGroup>
              </div>
              <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                <FieldGroup label="Ngành nghề kinh doanh, chính" required error={fieldErrors.mainIndustry}>
                  <SearchableSelect
                    options={nganhCap4Options}
                    value={form.mainIndustry}
                    placeholder="-- Chọn ngành nghề --"
                    error={!!fieldErrors.mainIndustry}
                    onChange={(v) => { setField("mainIndustry", v); if (fieldErrors.mainIndustry) setFieldErrors((p) => ({ ...p, mainIndustry: undefined })); }}
                  />
                </FieldGroup>
                <FieldGroup label="Ngày cấp GPKD">
                  <DateInput value={form.licenseDate} onChange={(v) => setField("licenseDate", v)} max={localISODate(new Date())} />
                </FieldGroup>
                <FieldGroup label="Tỉnh/Thành phố ĐKKD" required error={fieldErrors.registeredProvince}>
                  <SearchableSelect
                    options={PROVINCES}
                    value={form.registeredProvince}
                    placeholder="-- Chọn tỉnh/thành phố --"
                    error={!!fieldErrors.registeredProvince}
                    onChange={(v) => {
                      setField("registeredProvince", v);
                      setField("registeredWard", "");
                      if (fieldErrors.registeredProvince) setFieldErrors((p) => ({ ...p, registeredProvince: undefined }));
                    }}
                  />
                </FieldGroup>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <FieldGroup label="Phường/Xã ĐKKD" required error={fieldErrors.registeredWard}>
                  <SearchableSelect
                    options={phuongDKKDOptions}
                    value={form.registeredWard}
                    placeholder="-- Chọn phường/xã --"
                    disabled={!form.registeredProvince}
                    error={!!fieldErrors.registeredWard}
                    onChange={(v) => {
                      setField("registeredWard", v);
                      if (fieldErrors.registeredWard) setFieldErrors((p) => ({ ...p, registeredWard: undefined }));
                    }}
                  />
                </FieldGroup>
                <FieldGroup label="Địa chỉ">
                  <input className={FORM_CONTROL_CLASS} value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="VD: 162 đường số 2, khu đô thị Vạn Phúc" />
                </FieldGroup>
              </div>
            </div>

            <div className="my-3 text-[13.5px] font-semibold text-[#374151]">Thông tin liên hệ</div>
            <div className="mb-4 rounded-lg border border-[#e5e7eb] p-5">
              <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                <FieldGroup label="Tên viết bằng tiếng nước ngoài">
                  <input className={FORM_CONTROL_CLASS} value={form.foreignName} onChange={(e) => setField("foreignName", e.target.value)} placeholder="VD: VNA Group" />
                </FieldGroup>
                <FieldGroup label="Email" required error={fieldErrors.email}>
                  <input
                    type="email"
                    className={`${FORM_CONTROL_CLASS}${fieldErrors.email ? " border-danger" : ""}`}
                    value={form.email}
                    onChange={(e) => { setField("email", e.target.value); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined })); }}
                    placeholder="vna@gmail.com"
                  />
                </FieldGroup>
                <FieldGroup label="Số điện thoại cơ quan" error={fieldErrors.officePhone}>
                  <input
                    className={`${FORM_CONTROL_CLASS}${fieldErrors.officePhone ? " border-danger" : ""}`}
                    value={form.officePhone}
                    onChange={(e) => { setField("officePhone", e.target.value); if (fieldErrors.officePhone) setFieldErrors((p) => ({ ...p, officePhone: undefined })); }}
                    placeholder="VD: 0283xxxxxxx"
                  />
                </FieldGroup>
              </div>
              <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                <FieldGroup label="Tỉnh/TP hoạt động KD">
                  <SearchableSelect
                    options={PROVINCES}
                    value={form.operatingProvince}
                    placeholder="-- Chọn tỉnh --"
                    onChange={(v) => {
                      setField("operatingProvince", v);
                      setField("operatingWard", "");
                    }}
                  />
                </FieldGroup>
                <FieldGroup label="Phường/xã hoạt động KD">
                  <SearchableSelect
                    options={phuongHDOptions}
                    value={form.operatingWard}
                    placeholder="-- Chọn phường/xã --"
                    disabled={!form.operatingProvince}
                    onChange={(v) => setField("operatingWard", v)}
                  />
                </FieldGroup>
                <div />
              </div>
              <div className="grid grid-cols-3 gap-3.5">
                <FieldGroup label="Địa điểm kinh doanh">
                  <input className={FORM_CONTROL_CLASS} value={form.operatingAddress} onChange={(e) => setField("operatingAddress", e.target.value)} />
                </FieldGroup>
                <FieldGroup label="Người đứng đầu doanh nghiệp">
                  <input className={FORM_CONTROL_CLASS} value={form.representative} onChange={(e) => setField("representative", e.target.value)} />
                </FieldGroup>
                <FieldGroup label="SĐT liên hệ người đứng đầu" error={fieldErrors.representativePhone}>
                  <input
                    className={`${FORM_CONTROL_CLASS}${fieldErrors.representativePhone ? " border-danger" : ""}`}
                    value={form.representativePhone}
                    onChange={(e) => { setField("representativePhone", e.target.value); if (fieldErrors.representativePhone) setFieldErrors((p) => ({ ...p, representativePhone: undefined })); }}
                  />
                </FieldGroup>
              </div>
            </div>

            <div className="my-3 text-[13.5px] font-semibold text-[#374151]">File đính kèm</div>
            <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="w-[200px] border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Tên file</th>
                    <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Thông tin file</th>
                    <th className="w-[120px] border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {FILE_NAMES.map((name, idx) => (
                    <tr key={name} className="border-b border-[#f3f4f6] last:border-b-0">
                      <td className="px-3 py-2 text-[#374151]">{name}</td>
                      <td className="px-3 py-2 text-[13px] text-[#374151]">
                        {attachments[idx].file || attachments[idx].url ? (
                          attachments[idx].displayName
                        ) : (
                          <span className="text-muted">Chưa có file</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1.5 text-muted">
                          <button
                            type="button"
                            title="Xem"
                            onClick={() => handleFileView(idx)}
                            disabled={!attachments[idx].file && !attachments[idx].url}
                            className={attachments[idx].file || attachments[idx].url ? "hover:text-primary" : "cursor-not-allowed opacity-40"}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                            className={attachments[idx].file ? "hover:text-danger" : "cursor-not-allowed opacity-40"}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <button type="button" onClick={onCancel} className="h-[38px] rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb]">
              {cancelLabel}
            </button>
            <button type="button" onClick={goStep2} className="flex h-[38px] items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af]">
              Tiếp tục
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="px-7 pb-6">
            <div className="mb-4 text-[15px] font-bold text-ink">Thông tin về hồ sơ</div>
            <div className="rounded-lg border border-[#e5e7eb] p-5">
              {reviewRows.map(([label, value]) => (
                <div key={label} className="flex border-b border-[#f3f4f6] py-2.5 last:border-b-0">
                  <span className="w-[280px] shrink-0 text-[13.5px] font-semibold text-[#374151]">{label}</span>
                  <span className="text-[13.5px] text-ink">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-[#e5e7eb]">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="w-[200px] border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Tên file</th>
                    <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Thông tin file</th>
                    <th className="w-20 border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {FILE_NAMES.map((name, idx) => (
                    <tr key={name} className="border-b border-[#f3f4f6] last:border-b-0">
                      <td className="px-3 py-2 text-[#374151]">{name}</td>
                      <td className="px-3 py-2 text-[13px] text-[#374151]">
                        {attachments[idx].file || attachments[idx].url ? (
                          attachments[idx].displayName
                        ) : (
                          <span className="text-muted">Chưa có file</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          title="Xem"
                          onClick={() => handleFileView(idx)}
                          disabled={!attachments[idx].file && !attachments[idx].url}
                          className={attachments[idx].file || attachments[idx].url ? "text-muted hover:text-primary" : "cursor-not-allowed opacity-40"}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <button type="button" onClick={() => setStep(1)} className="h-[38px] rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb]">
              Trở về
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={isSubmitting}
              className="flex h-[38px] items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60"
            >
              {isSubmitting ? (
                "Đang xử lý..."
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Xác nhận
                </>
              )}
            </button>
          </div>
        </>
      )}

      <input ref={fileRef0} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handleFileSelect(0, e)} />
      <input ref={fileRef1} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handleFileSelect(1, e)} />

      <LoadingOverlay open={isSubmitting} message={mode === "add" ? "Đang thêm doanh nghiệp..." : "Đang cập nhật..."} />
    </div>
  );
}
