"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormHelperText } from "@mui/material";
import { Alert } from "@/libs/shared/core/components/Alert/Alert";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { useCountdown } from "@/libs/shared/core/hooks/useCountdown";
import { isValidEmail, isValidPhone } from "@/libs/tts/auth/authValidation";
import { localISODate } from "@/libs/shared/core/utils/dateUtils";
import { DateInput } from "@/libs/shared/core/components/DateInput/DateInput";
import { SearchableSelect } from "@/libs/shared/core/components/SearchableSelect/SearchableSelect";
import { type EnterpriseForm, EMPTY_ENTERPRISE_FORM } from "@/libs/tts/enterprise/enterpriseData";
import { PROVINCES, WARDS_BY_PROVINCE } from "@/libs/tts/location/locationData";
import { getEnterpriseTypeList } from "@/libs/tts/enterprise-type/enterpriseTypeApi";
import { getBusinessSectorList } from "@/libs/tts/business-sector/businessSectorApi";
import { sendRegisterOtp, verifyRegisterOtp } from "@/libs/tts/auth/authApi";
import { createBusiness, checkBusinessEmail, checkBusinessTaxCode } from "@/libs/tts/enterprise/enterpriseApi";

const FILE_NAMES = ["Giấy phép kinh doanh", "Giấy tờ khác"];

type WizardStep = 1 | 2;
type AttachedFile = { file: File | null; displayName: string };

const emptyAttachments = (): AttachedFile[] => FILE_NAMES.map(() => ({ file: null, displayName: "" }));

type OutlinedTextFieldProps = {
  label: string;
  value: string;
  onChange?: (val: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  type?: string;
  maxLength?: number;
  placeholder?: string;
};

function OutlinedTextField({
  label,
  value,
  onChange,
  disabled,
  required,
  error,
  helperText,
  type = "text",
  maxLength,
  placeholder,
}: OutlinedTextFieldProps) {
  const [focused, setFocused] = useState(false);
  const isFloated = !!value || focused;

  return (
    <div className="flex flex-col w-full">
      <div className="relative group w-full" style={{ height: "40px" }}>
        <input
          type={type}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={maxLength}
          placeholder={focused ? placeholder : undefined}
          className={`w-full h-full rounded-md border-0 px-3 text-[13.5px] outline-none ${
            disabled
              ? "bg-[#f9fafb] text-muted cursor-not-allowed"
              : "bg-white text-ink"
          }`}
        />

        <fieldset
          className={`absolute inset-0 m-0 p-0 rounded-md border pointer-events-none transition-colors ${
            focused
              ? "border-[#1976d2] border-2"
              : error
                ? "border-danger border-2"
                : "border-line group-hover:border-ink"
          }`}
        >
          <legend className="ml-2 px-1 text-[0px] text-transparent transition-all">
            {label} {required ? " *" : ""}
          </legend>
        </fieldset>

        <label
          className={`absolute left-3 transition-all pointer-events-none px-1 ${
            isFloated
              ? "-top-2 text-[11px] z-10 bg-white " +
                (error
                  ? "text-danger"
                  : focused
                    ? "text-[#1976d2]"
                    : "text-muted")
              : "top-[10px] text-sm " + (error ? "text-danger" : "text-muted")
          }`}
        >
          {label} {required && <span className="text-danger">*</span>}
        </label>
      </div>

      {helperText && (
        <FormHelperText
          error={error}
          sx={{ mt: 0.5, mx: "14px", fontSize: "11px" }}
        >
          {helperText}
        </FormHelperText>
      )}
    </div>
  );
}

// Map thông điệp lỗi BE về field thuộc bước 1 → quay về bước 1 + bôi đỏ inline tại field.
// Khớp message BE: "Email đã được sử dụng cho doanh nghiệp khác", "Mã số thuế đã tồn tại".
function mapServerErrorToStep1Field(message: string): "email" | "mst" | null {
  const msg = message.toLowerCase();
  if (msg.includes("email")) return "email";
  if (msg.includes("mã số thuế") || msg.includes("thuế")) return "mst";
  return null;
}

export default function EnterpriseRegisterPage() {
  const router = useRouter();
  const countdown = useCountdown(300);

  const [wizardStep, setWizardStep] = useState<WizardStep>(1);

  const [loaiHinhOptions, setLoaiHinhOptions] = useState<string[]>([]);
  const [nganhCap4Options, setNganhCap4Options] = useState<string[]>([]);

  useEffect(() => {
    getEnterpriseTypeList()
      .then((types) => setLoaiHinhOptions(types.filter((t) => t.active).map((t) => t.ten)))
      .catch(() => {});
    getBusinessSectorList()
      .then((sectors) =>
        setNganhCap4Options(
          sectors.filter((s) => s.cap === 4).map((s) => `${s.ma} - ${s.ten.replace(/^[–-]\s*/, "")}`),
        ),
      )
      .catch(() => {});
  }, []);

  const [form, setForm] = useState<EnterpriseForm>(EMPTY_ENTERPRISE_FORM);
  const [wizardFieldErrors, setWizardFieldErrors] = useState<{
    ten?: string;
    mst?: string;
    loai?: string;
    nganh?: string;
    email?: string;
    tinh?: string;
    phuong?: string;
    sdt?: string;
    sdtDD?: string;
  }>({});

  const [attachments, setAttachments] = useState<AttachedFile[]>(emptyAttachments());
  const fileRef0 = useRef<HTMLInputElement>(null);
  const fileRef1 = useRef<HTMLInputElement>(null);
  const fileRefs = [fileRef0, fileRef1];

  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  const [accountPopup, setAccountPopup] = useState<{ username: string; password: string } | null>(null);

  const phuongDKKDOptions = useMemo(() => WARDS_BY_PROVINCE[form.tinh] ?? [], [form.tinh]);
  const phuongHDOptions = useMemo(() => WARDS_BY_PROVINCE[form.tinhHD] ?? [], [form.tinhHD]);

  const setField = <K extends keyof EnterpriseForm>(key: K, value: EnterpriseForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validateAndOtp = async () => {
    const errors: typeof wizardFieldErrors = {};
    if (!form.ten.trim()) errors.ten = "Tên doanh nghiệp không được để trống";
    if (!form.mst.trim()) errors.mst = "Mã số thuế không được để trống";
    else if (!/^\d{10}(-\d{1,5})?$/.test(form.mst.trim()))
      errors.mst = "Mã số thuế gồm 10 chữ số, hoặc 10 chữ số + dấu gạch + tối đa 5 số";
    if (!form.loai) errors.loai = "Vui lòng chọn loại hình kinh doanh";
    if (!form.nganh) errors.nganh = "Vui lòng chọn ngành nghề kinh doanh";
    if (!form.email.trim()) errors.email = "Email không được để trống";
    else if (!isValidEmail(form.email.trim())) errors.email = "Email không đúng định dạng";
    if (!form.tinh) errors.tinh = "Vui lòng chọn tỉnh/thành phố ĐKKD";
    if (!form.phuong) errors.phuong = "Vui lòng chọn phường/xã ĐKKD";
    if (form.sdt.trim() && !isValidPhone(form.sdt))
      errors.sdt = "Số điện thoại không hợp lệ";
    if (form.sdtDD.trim() && !isValidPhone(form.sdtDD))
      errors.sdtDD = "Số điện thoại không hợp lệ";
    if (Object.keys(errors).length > 0) {
      setWizardFieldErrors(errors);
      return;
    }
    setWizardFieldErrors({});
    setIsSendingOtp(true);
    try {
      // Check email + MST tồn tại trước khi gửi OTP (tránh lãng phí OTP).
      const [emailCheck, mstCheck] = await Promise.all([
        checkBusinessEmail(form.email.trim()),
        checkBusinessTaxCode(form.mst.trim()),
      ]);
      const preErrors: typeof wizardFieldErrors = {};
      if (emailCheck.exists) preErrors.email = "Email đã được sử dụng cho doanh nghiệp khác";
      if (mstCheck.exists) preErrors.mst = "Mã số thuế đã tồn tại";
      if (Object.keys(preErrors).length > 0) {
        setWizardFieldErrors(preErrors);
        setIsSendingOtp(false);
        return;
      }

      await sendRegisterOtp(form.email.trim());
      setOtp("");
      setOtpError(null);
      setOtpOpen(true);
      countdown.start();
    } catch (e) {
      setWizardFieldErrors((prev) => ({
        ...prev,
        email: e instanceof Error ? e.message : "Không thể gửi OTP, thử lại",
      }));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const confirmOtp = async () => {
    if (!otp.trim()) {
      setOtpError("Vui lòng nhập mã OTP");
      return;
    }
    setIsVerifyingOtp(true);
    try {
      await verifyRegisterOtp(form.email.trim(), otp.trim());
      setOtpOpen(false);
      countdown.stop();
      setWizardStep(2);
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Xác thực OTP thất bại", variant: "error" });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const confirmWizard = async () => {
    setToast(null);
    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append("businessName", form.ten.trim());
      fd.append("taxCode", form.mst.trim());
      fd.append("businessType", form.loai);
      fd.append("mainIndustry", form.nganh);
      if (form.ngayCap) fd.append("licenseDate", form.ngayCap);
      fd.append("registeredProvince", form.tinh);
      fd.append("registeredWard", form.phuong);
      if (form.diaChi.trim()) fd.append("address", form.diaChi.trim());
      if (form.tenNN.trim()) fd.append("foreignName", form.tenNN.trim());
      fd.append("email", form.email.trim());
      if (form.sdt.trim()) fd.append("officePhone", form.sdt.trim());
      if (form.tinhHD) fd.append("operatingProvince", form.tinhHD);
      if (form.phuongHD) fd.append("operatingWard", form.phuongHD);
      if (form.diaDiem.trim()) fd.append("operatingAddress", form.diaDiem.trim());
      if (form.nguoiDD.trim()) fd.append("representative", form.nguoiDD.trim());
      if (form.sdtDD.trim()) fd.append("representativePhone", form.sdtDD.trim());
      const licenseFile = attachments[0].file;
      const otherFile = attachments[1].file;
      if (licenseFile) fd.append("licenseFile", licenseFile);
      if (otherFile) fd.append("otherFile", otherFile);

      const result = await createBusiness(fd);
      setAccountPopup({ username: result.account.username, password: result.account.password });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Đã có lỗi xảy ra. Vui lòng thử lại.";
      const field = mapServerErrorToStep1Field(message);
      // Lỗi thuộc field bước 1 (trùng email/MST) → quay về bước 1, bôi đỏ inline tại field.
      if (field) {
        setWizardFieldErrors((prev) => ({ ...prev, [field]: message }));
        setWizardStep(1);
      } else {
        setToast({ message, variant: "error" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
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
    window.open(URL.createObjectURL(file), "_blank");
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
    ["Mã số thuế :", form.mst],
    ["Tên doanh nghiệp :", form.ten],
    ["Tên viết bằng tiếng nước ngoài :", form.tenNN],
    ["Email :", form.email],
    ["Ngày cấp GPKD:", form.ngayCap],
    ["Loại hình kinh doanh:", form.loai],
    ["Ngành nghề kinh doanh", form.nganh],
    ["Địa chỉ đăng ký giấy phép kinh doanh :", [form.phuong, form.tinh].filter(Boolean).join(", ")],
    ["Địa điểm kinh doanh :", form.diaDiem],
    ["Người đứng đầu doanh nghiệp", form.nguoiDD],
    ["SĐT người đứng đầu", form.sdtDD],
  ];

  return (
    <div className="min-h-screen overflow-y-auto bg-[#f0f4f8] py-12">
      <div className="mx-auto w-[940px] max-w-[96vw] rounded-xl bg-white shadow-[0_15px_45px_rgba(0,0,0,0.06)]">
        {/* Header with close button */}
        <div className="flex items-center justify-between px-7 pt-5 pb-1">
          <div />
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-muted hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-0 pb-3 pt-2">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-primary text-[13px] font-bold text-white"
            >
              {wizardStep === 1 ? (
                "1"
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className="text-[13px] font-medium text-ink">Thông tin doanh nghiệp</span>
          </div>
          <div className={`mx-2 h-0.5 w-15 ${wizardStep === 2 ? "bg-primary" : "bg-[#e5e7eb]"}`} />
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[13px] font-bold ${
                wizardStep === 2
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-white text-[#9ca3af]"
              }`}
            >
              2
            </div>
            <span className={`text-[13px] ${wizardStep === 2 ? "font-medium text-ink" : "text-[#9ca3af]"}`}>
              Xác nhận đăng ký
            </span>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileRef0}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFileSelect(0, e)}
        />
        <input
          ref={fileRef1}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFileSelect(1, e)}
        />

        {wizardStep === 1 ? (
          <>
            <div className="px-7 pb-6">
              <div className="mb-4 text-[15px] font-bold text-ink">Thêm mới doanh nghiệp</div>

              <div className="mb-4 rounded-lg border border-[#e5e7eb] p-5">
                <div className="mb-6 grid grid-cols-3 gap-3.5">
                  <OutlinedTextField
                    label="Tên doanh nghiệp"
                    value={form.ten}
                    onChange={(val) => {
                      setField("ten", val);
                      if (wizardFieldErrors.ten) setWizardFieldErrors((p) => ({ ...p, ten: undefined }));
                    }}
                    error={!!wizardFieldErrors.ten}
                    helperText={wizardFieldErrors.ten}
                    placeholder="VD: Công ty cổ phần ABC"
                    required
                  />
                  <OutlinedTextField
                    label="Mã số thuế"
                    value={form.mst}
                    maxLength={16}
                    onChange={(val) => {
                      setField("mst", val);
                      if (wizardFieldErrors.mst) setWizardFieldErrors((p) => ({ ...p, mst: undefined }));
                    }}
                    error={!!wizardFieldErrors.mst}
                    helperText={wizardFieldErrors.mst}
                    placeholder="VD: 0310000888"
                    required
                  />
                  <SearchableSelect
                    label="Loại hình kinh doanh"
                    options={loaiHinhOptions}
                    value={form.loai}
                    placeholder="-- Chọn loại hình --"
                    error={!!wizardFieldErrors.loai}
                    helperText={wizardFieldErrors.loai}
                    required
                    onChange={(v) => {
                      setField("loai", v);
                      if (wizardFieldErrors.loai) setWizardFieldErrors((p) => ({ ...p, loai: undefined }));
                    }}
                  />
                </div>
                <div className="mb-6 grid grid-cols-3 gap-3.5">
                  <SearchableSelect
                    label="Ngành nghề kinh doanh chính"
                    options={nganhCap4Options}
                    value={form.nganh}
                    placeholder="-- Chọn ngành nghề --"
                    error={!!wizardFieldErrors.nganh}
                    helperText={wizardFieldErrors.nganh}
                    required
                    onChange={(v) => {
                      setField("nganh", v);
                      if (wizardFieldErrors.nganh) setWizardFieldErrors((p) => ({ ...p, nganh: undefined }));
                    }}
                  />
                  <DateInput
                    label="Ngày cấp GPKD"
                    value={form.ngayCap}
                    onChange={(v) => setField("ngayCap", v)}
                    max={localISODate(new Date())}
                  />
                  <SearchableSelect
                    label="Tỉnh/Thành phố ĐKKD"
                    options={PROVINCES}
                    value={form.tinh}
                    placeholder="-- Chọn tỉnh/thành phố --"
                    error={!!wizardFieldErrors.tinh}
                    helperText={wizardFieldErrors.tinh}
                    required
                    onChange={(v) => {
                      setField("tinh", v);
                      setField("phuong", "");
                      if (wizardFieldErrors.tinh) setWizardFieldErrors((p) => ({ ...p, tinh: undefined }));
                    }}
                  />
                </div>
                <div className="mb-6 grid grid-cols-2 gap-3.5">
                  <SearchableSelect
                    label="Phường/Xã ĐKKD"
                    options={phuongDKKDOptions}
                    value={form.phuong}
                    placeholder="-- Chọn phường/xã --"
                    disabled={!form.tinh}
                    error={!!wizardFieldErrors.phuong}
                    helperText={wizardFieldErrors.phuong}
                    required
                    onChange={(v) => {
                      setField("phuong", v);
                      if (wizardFieldErrors.phuong) setWizardFieldErrors((p) => ({ ...p, phuong: undefined }));
                    }}
                  />
                  <OutlinedTextField
                    label="Địa chỉ"
                    value={form.diaChi}
                    onChange={(val) => setField("diaChi", val)}
                    placeholder="VD: 162 đường số 2, khu đô thị Vạn Phúc"
                  />
                </div>
              </div>

              {/* Contact info */}
              <div className="my-3 text-[13.5px] font-semibold text-[#374151]">Thông tin liên hệ</div>
              <div className="mb-4 rounded-lg border border-[#e5e7eb] p-5">
                <div className="mb-6 grid grid-cols-3 gap-3.5">
                  <OutlinedTextField
                    label="Tên viết bằng tiếng nước ngoài"
                    value={form.tenNN}
                    onChange={(val) => setField("tenNN", val)}
                    placeholder="VD: VNA Group"
                  />
                  <OutlinedTextField
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(val) => {
                      setField("email", val);
                      if (wizardFieldErrors.email) setWizardFieldErrors((p) => ({ ...p, email: undefined }));
                    }}
                    error={!!wizardFieldErrors.email}
                    helperText={wizardFieldErrors.email}
                    placeholder="vna@gmail.com"
                    required
                  />
                  <OutlinedTextField
                    label="Số điện thoại cơ quan"
                    value={form.sdt}
                    onChange={(val) => {
                      setField("sdt", val);
                      if (wizardFieldErrors.sdt) setWizardFieldErrors((p) => ({ ...p, sdt: undefined }));
                    }}
                    error={!!wizardFieldErrors.sdt}
                    helperText={wizardFieldErrors.sdt}
                    placeholder="VD: 0283xxxxxxx"
                  />
                </div>
                <div className="mb-6 grid grid-cols-3 gap-3.5">
                  <OutlinedTextField
                    label="Người đứng đầu doanh nghiệp"
                    value={form.nguoiDD}
                    onChange={(val) => setField("nguoiDD", val)}
                  />
                  <OutlinedTextField
                    label="SĐT liên hệ người đứng đầu"
                    value={form.sdtDD}
                    onChange={(val) => {
                      setField("sdtDD", val);
                      if (wizardFieldErrors.sdtDD) setWizardFieldErrors((p) => ({ ...p, sdtDD: undefined }));
                    }}
                    error={!!wizardFieldErrors.sdtDD}
                    helperText={wizardFieldErrors.sdtDD}
                  />
                  <SearchableSelect
                    label="Tỉnh/TP hoạt động KD"
                    options={PROVINCES}
                    value={form.tinhHD}
                    placeholder="-- Chọn tỉnh --"
                    onChange={(v) => {
                      setField("tinhHD", v);
                      setField("phuongHD", "");
                    }}
                  />
                </div>
                <div className="mb-6 grid grid-cols-3 gap-3.5">
                  <SearchableSelect
                    label="Phường/xã hoạt động KD"
                    options={phuongHDOptions}
                    value={form.phuongHD}
                    placeholder="-- Chọn phường/xã --"
                    disabled={!form.tinhHD}
                    onChange={(v) => setField("phuongHD", v)}
                  />
                  <OutlinedTextField
                    label="Địa điểm kinh doanh"
                    value={form.diaDiem}
                    onChange={(val) => setField("diaDiem", val)}
                  />
                  <div />
                </div>
              </div>

              {/* File attachments */}
              <div className="my-3 text-[13.5px] font-semibold text-[#374151]">File đính kèm</div>
              <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="w-50 border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Tên file</th>
                      <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Thông tin file</th>
                      <th className="w-[120px] border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FILE_NAMES.map((name, idx) => (
                      <tr key={name} className="border-b border-body last:border-b-0">
                        <td className="px-3 py-2 text-[#374151]">{name}</td>
                        <td className="px-3 py-2 text-[#374151]">
                          {attachments[idx].displayName || <span className="text-muted">Chưa có file</span>}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1.5 text-muted">
                            <button
                              type="button"
                              title="Xem"
                              onClick={() => handleFileView(idx)}
                              disabled={!attachments[idx].file}
                              className={attachments[idx].file ? "hover:text-primary" : "cursor-not-allowed opacity-40"}
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
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="h-[38px] rounded-md border border-line px-4.5 text-[13.5px] text-[#374151] hover:bg-[#f9fafb]"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={validateAndOtp}
                disabled={isSendingOtp}
                className="flex h-[38px] items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60"
              >
                {isSendingOtp ? "Đang gửi OTP..." : "Tiếp tục"}
                {!isSendingOtp && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-7 pb-6">
              <div className="mb-4 text-[15px] font-bold text-ink">Thông tin về hồ sơ</div>
              <div className="rounded-lg border border-[#e5e7eb] p-5">
                {reviewRows.map(([label, value]) => (
                  <div key={label} className="flex border-b border-body py-2.5 last:border-b-0">
                    <span className="w-70 shrink-0 text-[13.5px] font-semibold text-[#374151]">{label}</span>
                    <span className="text-[13.5px] text-ink">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 overflow-hidden rounded-lg border border-[#e5e7eb]">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="w-50 border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Tên file</th>
                      <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Thông tin file</th>
                      <th className="w-20 border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FILE_NAMES.map((name, idx) => (
                      <tr key={name} className="border-b border-body last:border-b-0">
                        <td className="px-3 py-2 text-[#374151]">{name}</td>
                        <td className="px-3 py-2 text-[#374151]">
                          {attachments[idx].displayName || <span className="text-muted">Chưa có file</span>}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            title="Xem"
                            onClick={() => handleFileView(idx)}
                            disabled={!attachments[idx].file}
                            className={attachments[idx].file ? "text-muted hover:text-primary" : "cursor-not-allowed opacity-40"}
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
              <button
                type="button"
                onClick={() => { setWizardStep(1); setToast(null); }}
                disabled={isSaving}
                className="h-[38px] rounded-md border border-line px-4.5 text-[13.5px] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
              >
                Trở về
              </button>
              <button
                type="button"
                onClick={confirmWizard}
                disabled={isSaving}
                className="flex h-[38px] items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {isSaving ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* OTP modal */}
      <div
        className={`fixed inset-0 z-400 flex items-center justify-center bg-black/50 transition-opacity duration-200 ${otpOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div
          className={`w-85 rounded-xl bg-white px-7 py-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-transform duration-200 ${otpOpen ? "translate-y-0" : "translate-y-2.5"}`}
        >
          <div className="mb-2 text-[16px] font-bold text-primary">XÁC THỰC EMAIL</div>
          <p className="mb-1 text-[13px] text-muted">Chúng tôi đã gửi mã xác minh qua số email</p>
          <p className="mb-4 text-[13.5px] font-bold text-ink">{form.email}</p>
          <p className="mb-4 text-[13px] text-muted">Bạn vui lòng kiểm tra và điền mã xác thực</p>
          {otpError ? <Alert variant="error" message={otpError} /> : null}
          <label className="mb-1.5 block text-left text-[12.5px] font-medium text-[#374151]">
            OTP <span className="text-danger">*</span>
          </label>
          <input
            className="mb-2 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-[#3b82f6]"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmOtp()}
            placeholder="Nhập mã OTP"
          />
          <div className="mb-1 text-center text-sm font-bold text-primary">{countdown.formatted}</div>
          <div className="mb-4 text-[12.5px] text-muted">
            Chưa nhận được mã?{" "}
            <button
              type="button"
              disabled={isSendingOtp || countdown.seconds > 0}
              onClick={async () => {
                setIsSendingOtp(true);
                try {
                  await sendRegisterOtp(form.email.trim());
                  countdown.start();
                  setOtpError(null);
                  setToast({ message: "Đã gửi lại mã OTP", variant: "success" });
                } catch (e) {
                  setToast({ message: e instanceof Error ? e.message : "Không thể gửi lại OTP", variant: "error" });
                } finally {
                  setIsSendingOtp(false);
                }
              }}
              className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingOtp ? "Đang gửi..." : "Gửi lại"}
            </button>
          </div>
          <button
            type="button"
            onClick={confirmOtp}
            disabled={isVerifyingOtp}
            className="mb-2 h-10.5 w-full rounded-md bg-primary text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60"
          >
            {isVerifyingOtp ? "Đang xác thực..." : "Xác nhận"}
          </button>
          <button
            type="button"
            onClick={() => { setOtpOpen(false); countdown.stop(); setOtp(""); setOtpError(null); }}
            className="text-[13px] text-muted hover:text-[#374151]"
          >
            Huỷ bỏ
          </button>
        </div>
      </div>

      {/* Account popup */}
      {accountPopup ? (
        <>
          <div
            className="fixed inset-0 z-500 bg-black/50"
            onClick={() => {
              setAccountPopup(null);
              router.push("/enterprise-login");
            }}
          />
          <div className="fixed left-1/2 top-1/2 z-501 w-75 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="bg-primary px-5 py-3.5 text-center">
              <h3 className="text-[15px] font-bold text-white">Thông tin tài khoản</h3>
            </div>
            <div className="px-5 pb-3 pt-4">
              <p className="mb-2 text-[13.5px] text-ink">
                • Tài khoản: <strong>{accountPopup?.username}</strong>
              </p>
              <p className="mb-2 text-[13.5px] text-ink">
                • Mật khẩu: <strong>{accountPopup?.password}</strong>
              </p>
            </div>
            <div className="px-5 pb-3.5 text-right">
              <button
                type="button"
                onClick={() => {
                  setAccountPopup(null);
                  router.push("/enterprise-login");
                }}
                className="text-[13px] text-muted hover:text-[#374151]"
              >
                Huỷ bỏ
              </button>
            </div>
          </div>
        </>
      ) : null}

      {/* Thông báo kết quả (lỗi xác nhận/OTP, gửi lại OTP...) → Toast góc phải trên */}
      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant ?? "error"}
        duration={4000}
        onDone={() => setToast(null)}
      />
    </div>
  );
}
