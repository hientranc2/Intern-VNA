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
import { PROVINCES, WARDS_BY_PROVINCE } from "@/libs/tts/location/locationData";
import { SearchableSelect } from "@/libs/shared/core/components/SearchableSelect/SearchableSelect";
import {
  getBusinessId,
  consumeLoginSuccess,
  ApiError,
  requestChangeEmailOtp,
  verifyChangeEmailOtp,
  changeEmail,
} from "@/libs/tts/auth/authApi";
import {
  getBusinessById,
  updateBusiness,
  type BusinessDetail,
} from "@/libs/tts/enterprise/enterpriseApi";
import { getEnterpriseTypeList } from "@/libs/tts/enterprise-type/enterpriseTypeApi";
import { getBusinessSectorList } from "@/libs/tts/business-sector/businessSectorApi";

type PageMode = "view" | "edit1" | "edit2";

type BusinessFormState = {
  mst: string;
  ten: string;
  tenNN: string;
  email: string;
  ngayCap: string;
  loai: string;
  nganh: string;
  tinh: string;
  phuong: string;
  diaChi: string;
  diaDiem: string;
  nguoiDD: string;
  sdtDD: string;
  sdt: string;
};

function emptyForm(): BusinessFormState {
  return {
    mst: "",
    ten: "",
    tenNN: "",
    email: "",
    ngayCap: "",
    loai: "",
    nganh: "",
    tinh: "",
    phuong: "",
    diaChi: "",
    diaDiem: "",
    nguoiDD: "",
    sdtDD: "",
    sdt: "",
  };
}

function toDateInput(val?: string | Date | null): string {
  if (!val) return "";
  const s = typeof val === "string" ? val : val.toISOString();
  return s.split("T")[0];
}

function fromDetail(b: BusinessDetail): BusinessFormState {
  return {
    mst: b.taxCode,
    ten: b.businessName,
    tenNN: b.foreignName ?? "",
    email: b.email ?? "",
    ngayCap: toDateInput(b.licenseDate),
    loai: b.businessType,
    nganh: b.mainIndustry,
    tinh: b.registeredProvince ?? "",
    phuong: b.registeredWard ?? "",
    diaChi: b.address ?? "",
    diaDiem: b.operatingAddress ?? "",
    nguoiDD: b.representative ?? "",
    sdtDD: b.representativePhone ?? "",
    sdt: b.officePhone ?? "",
  };
}

const FORM_CONTROL_CLASS =
  "h-[38px] rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-0 border-b border-[#e5e7eb] bg-white py-4">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[12px] font-bold ${step >= 1 ? "border-primary bg-primary text-white" : "border-[#d1d5db] bg-white text-[#9ca3af]"}`}
        >
          {step > 1 ? (
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
          ) : (
            "1"
          )}
        </div>
        <span
          className={`text-[13px] ${step >= 1 ? "font-medium text-ink" : "text-[#9ca3af]"}`}
        >
          Thông tin doanh nghiệp
        </span>
      </div>
      <div
        className={`mx-2 h-0.5 w-[60px] ${step >= 2 ? "bg-primary" : "bg-[#e5e7eb]"}`}
      />
      <div className="flex items-center gap-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[12px] font-bold ${step >= 2 ? "border-primary bg-white text-primary" : "border-[#d1d5db] bg-white text-[#9ca3af]"}`}
        >
          2
        </div>
        <span
          className={`text-[13px] ${step >= 2 ? "font-medium text-ink" : "text-[#9ca3af]"}`}
        >
          Xác nhận chỉnh sửa
        </span>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex border-b border-[#f3f4f6] py-3 last:border-b-0">
      <span className="w-[300px] shrink-0 text-[13.5px] font-semibold text-[#374151]">
        {label}
      </span>
      <span className="text-[13.5px] text-ink">{value}</span>
    </div>
  );
}

const FILE_NAMES = ["Giấy phép kinh doanh", "Giấy tờ khác"] as const;
type AttachedFile = { file: File | null; displayName: string; url?: string };

function filenameFromUrl(url?: string | null): string {
  if (!url) return "Không có file";
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.split("/").pop() || "File đã tải lên");
  } catch {
    return url.split("/").pop() || "File đã tải lên";
  }
}

function makeAttachments(
  licenseUrl?: string | null,
  otherUrl?: string | null,
): AttachedFile[] {
  return [
    {
      file: null,
      displayName: filenameFromUrl(licenseUrl),
      url: licenseUrl ?? undefined,
    },
    {
      file: null,
      displayName: filenameFromUrl(otherUrl),
      url: otherUrl ?? undefined,
    },
  ];
}

type OutlinedTextFieldProps = {
  label: string;
  value: string;
  onChange?: (val: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  type?: string;
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

export default function EnterpriseInfoPage() {
  const router = useRouter();
  const countdown = useCountdown(300);

  const [mode, setMode] = useState<PageMode>("edit1");
  const [info, setInfo] = useState<BusinessFormState>(emptyForm());
  const [editForm, setEditForm] = useState<BusinessFormState>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastVariant, setToastVariant] = useState<"success" | "error">(
    "success",
  );
  const [editErrors, setEditErrors] = useState<{
    ten?: string;
    mst?: string;
    email?: string;
    nganh?: string;
    tinh?: string;
    phuong?: string;
    sdt?: string;
    sdtDD?: string;
  }>({});
  const [toast, setToast] = useState<string | null>(null);

  const [loaiHinhOptions, setLoaiHinhOptions] = useState<string[]>([]);
  const [nganhCap4Options, setNganhCap4Options] = useState<string[]>([]);

  useEffect(() => {
    getEnterpriseTypeList()
      .then((types) =>
        setLoaiHinhOptions(types.filter((t) => t.active).map((t) => t.ten)),
      )
      .catch(() => {});
    getBusinessSectorList()
      .then((sectors) =>
        setNganhCap4Options(
          sectors
            .filter((s) => s.cap === 4)
            .map((s) => `${s.ma} - ${s.ten.replace(/^[–-]\s*/, "")}`),
        ),
      )
      .catch(() => {});
  }, []);

  // Hiển thị toast "Đăng nhập thành công" khi vừa điều hướng từ trang login sang.
  useEffect(() => {
    if (consumeLoginSuccess()) {
      setToastVariant("success");
      setToast("Đăng nhập thành công!");
    }
  }, []);

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpStep, setOtpStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newEmailError, setNewEmailError] = useState<string | null>(null);

  const [attachments, setAttachments] =
    useState<AttachedFile[]>(makeAttachments());
  const fileRef0 = useRef<HTMLInputElement>(null);
  const fileRef1 = useRef<HTMLInputElement>(null);
  const fileRefs = [fileRef0, fileRef1];

  const detailRef = useRef<BusinessDetail | null>(null);
  const businessId = useRef<string | null>(getBusinessId());

  useEffect(() => {
    if (!businessId.current) {
      router.replace("/enterprise-login");
      return;
    }
    getBusinessById(businessId.current)
      .then((detail) => {
        detailRef.current = detail;
        const parsed = fromDetail(detail);
        setInfo(parsed);
        setEditForm(parsed);
        setAttachments(makeAttachments(detail.licenseFile, detail.otherFile));
      })
      .catch((err) => {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Không thể tải thông tin doanh nghiệp";
        setFetchError(msg);
        setToastVariant("error");
        setToast(msg);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const phuongOptions = useMemo(
    () => WARDS_BY_PROVINCE[editForm.tinh] ?? [],
    [editForm.tinh],
  );

  const handleFileSelect = (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      showToast("Chỉ cho phép tải lên file PDF", "error");
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
    if (att.url) {
      window.open(att.url, "_blank");
      return;
    }
    if (att.file) window.open(URL.createObjectURL(att.file), "_blank");
  };

  const handleFileDelete = (idx: number) => {
    setAttachments((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        file: null,
        url: undefined,
        displayName: "Không có file",
      };
      return next;
    });
  };

  const setField = (key: keyof BusinessFormState, value: string) =>
    setEditForm((prev) => ({ ...prev, [key]: value }));

  const showToast = (
    message: string,
    variant: "success" | "error" = "success",
  ) => {
    setToastVariant(variant);
    setToast(message);
  };

  const goEdit1 = () => {
    setEditForm({ ...info });
    setEditErrors({});
    setAttachments(
      makeAttachments(
        detailRef.current?.licenseFile,
        detailRef.current?.otherFile,
      ),
    );
    setMode("edit1");
  };

  const goEdit2 = () => {
    const errors: typeof editErrors = {};
    if (!editForm.ten.trim())
      errors.ten = "Tên doanh nghiệp không được để trống";
    if (!editForm.email.trim()) errors.email = "Email không được để trống";
    else if (!isValidEmail(editForm.email.trim()))
      errors.email = "Email không đúng định dạng";
    if (!editForm.nganh) errors.nganh = "Vui lòng chọn ngành nghề kinh doanh";
    if (!editForm.tinh) errors.tinh = "Vui lòng chọn tỉnh/thành phố ĐKKD";
    if (!editForm.phuong) errors.phuong = "Vui lòng chọn phường/xã ĐKKD";
    if (editForm.sdt.trim() && !isValidPhone(editForm.sdt))
      errors.sdt = "Số điện thoại không hợp lệ";
    if (editForm.sdtDD.trim() && !isValidPhone(editForm.sdtDD))
      errors.sdtDD = "Số điện thoại không hợp lệ";
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }
    setEditErrors({});
    setMode("edit2");
  };

  const doSave = async () => {
    if (!businessId.current) return;

    const isFormChanged = () => {
      const textFieldsChanged = (Object.keys(info) as Array<keyof BusinessFormState>).some(
        (key) => info[key] !== editForm[key]
      );
      if (textFieldsChanged) return true;

      const originalLicenseUrl = detailRef.current?.licenseFile ?? undefined;
      const licenseChanged = !!attachments[0].file || (attachments[0].url !== originalLicenseUrl);

      const originalOtherUrl = detailRef.current?.otherFile ?? undefined;
      const otherChanged = !!attachments[1].file || (attachments[1].url !== originalOtherUrl);

      return licenseChanged || otherChanged;
    };

    if (!isFormChanged()) {
      showToast("Không có thay đổi nào cần cập nhật");
      setMode("edit1");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("businessName", editForm.ten);
      formData.append("businessType", editForm.loai);
      formData.append("mainIndustry", editForm.nganh);
      if (editForm.ngayCap) formData.append("licenseDate", editForm.ngayCap);
      if (editForm.tinh) formData.append("registeredProvince", editForm.tinh);
      if (editForm.phuong) formData.append("registeredWard", editForm.phuong);
      if (editForm.diaChi) formData.append("address", editForm.diaChi);
      if (editForm.tenNN) formData.append("foreignName", editForm.tenNN);
      formData.append("email", editForm.email);
      if (editForm.sdt) formData.append("officePhone", editForm.sdt);
      if (editForm.diaDiem)
        formData.append("operatingAddress", editForm.diaDiem);
      if (editForm.nguoiDD) formData.append("representative", editForm.nguoiDD);
      if (editForm.sdtDD)
        formData.append("representativePhone", editForm.sdtDD);
      if (attachments[0].file) {
        formData.append("licenseFile", attachments[0].file);
      } else if (!attachments[0].url && detailRef.current?.licenseFile) {
        formData.append("deleteLicenseFile", "true");
      }

      if (attachments[1].file) {
        formData.append("otherFile", attachments[1].file);
      } else if (!attachments[1].url && detailRef.current?.otherFile) {
        formData.append("deleteOtherFile", "true");
      }

      const updated = await updateBusiness(businessId.current, formData);
      detailRef.current = updated;
      const parsed = fromDetail(updated);
      setInfo(parsed);
      setEditForm(parsed);
      setAttachments(makeAttachments(updated.licenseFile, updated.otherFile));
      setMode("edit1");
      showToast("Cập nhật thành công");
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? err.message
          : "Đã có lỗi xảy ra. Vui lòng thử lại.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChangeEmailModal = async () => {
    setOtp("");
    setOtpError(null);
    setNewEmail("");
    setNewEmailError(null);
    setOtpStep(1);
    setSaving(true);
    try {
      await requestChangeEmailOtp();
      setOtpOpen(true);
      countdown.start();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Không thể gửi OTP đổi email",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError(null);
    try {
      await requestChangeEmailOtp();
      countdown.start();
      showToast("Đã gửi lại mã OTP thành công");
    } catch (err) {
      setOtpError(
        err instanceof ApiError ? err.message : "Không thể gửi lại mã OTP",
      );
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setOtpError("Vui lòng nhập mã OTP");
      return;
    }
    setSaving(true);
    setOtpError(null);
    try {
      await verifyChangeEmailOtp(otp);
      setOtpStep(2);
    } catch (err) {
      setOtpError(
        err instanceof ApiError ? err.message : "Mã OTP không chính xác",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNewEmail = async () => {
    if (!newEmail.trim()) {
      setNewEmailError("Vui lòng nhập email mới");
      return;
    }
    if (!isValidEmail(newEmail)) {
      setNewEmailError("Email không đúng định dạng");
      return;
    }
    if (newEmail === info.email) {
      setNewEmailError("Email mới phải khác email hiện tại");
      return;
    }
    setSaving(true);
    setNewEmailError(null);
    try {
      await changeEmail({ otpCode: otp, newEmail });
      setEditForm((prev) => ({ ...prev, email: newEmail }));
      setInfo((prev) => ({ ...prev, email: newEmail }));
      setOtpOpen(false);
      countdown.stop();
      showToast("Thay đổi Email thành công!");
    } catch (err) {
      setNewEmailError(
        err instanceof ApiError ? err.message : "Không thể lưu email mới",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmEdit2 = () => {
    doSave();
  };

  const reviewRows: [string, string][] = [
    ["Mã số thuế :", editForm.mst],
    ["Tên doanh nghiệp :", editForm.ten],
    ["Tên viết bằng tiếng nước ngoài :", editForm.tenNN],
    ["Email:", editForm.email],
    ["Ngày cấp GPKD:", editForm.ngayCap],
    ["Loại hình kinh doanh:", editForm.loai],
    ["Ngành nghề kinh doanh:", editForm.nganh],
    [
      "Địa chỉ đăng ký GPKD:",
      `${editForm.diaChi}, ${editForm.phuong}, ${editForm.tinh}`,
    ],
    ["Địa điểm kinh doanh:", editForm.diaDiem],
    ["Người đứng đầu doanh nghiệp:", editForm.nguoiDD],
    ["SĐT người đứng đầu:", editForm.sdtDD],
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-[13px] text-muted">Đang tải thông tin...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center px-6 text-center">
          <span className="text-[13px] text-muted">{fetchError}</span>
        </div>
        <Toast
          message={toast}
          variant={toastVariant}
          onDone={() => setToast(null)}
        />
      </>
    );
  }

  return (
    <>
      <>
        {mode === "view" ? (
          <>
            <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
              <h1 className="text-base font-semibold text-ink">
                Thông tin doanh nghiệp
              </h1>
              <button
                type="button"
                onClick={goEdit1}
                className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]"
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
                Chỉnh sửa
              </button>
            </div>
            <Stepper step={1} />
            <div className="px-6 py-5">
              <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="mb-4 border-b border-[#f3f4f6] pb-3.5 text-[14px] font-semibold text-[#374151]">
                  Thông tin về hồ sơ
                </div>
                <ReviewRow label="Mã số thuế :" value={info.mst} />
                <ReviewRow label="Tên doanh nghiệp :" value={info.ten} />
                <ReviewRow
                  label="Tên viết bằng tiếng nước ngoài :"
                  value={info.tenNN}
                />
                <ReviewRow label="Email:" value={info.email} />
                <ReviewRow label="Ngày cấp GPKD:" value={info.ngayCap} />
                <ReviewRow label="Loại hình kinh doanh:" value={info.loai} />
                <ReviewRow label="Ngành nghề kinh doanh:" value={info.nganh} />
                <ReviewRow
                  label="Địa chỉ đăng ký GPKD:"
                  value={`${info.diaChi}, ${info.phuong}, ${info.tinh}`}
                />
                <ReviewRow label="Địa điểm kinh doanh:" value={info.diaDiem} />
                <ReviewRow
                  label="Người đứng đầu doanh nghiệp:"
                  value={info.nguoiDD}
                />
                <ReviewRow label="SĐT người đứng đầu:" value={info.sdtDD} />
              </div>

              <div className="mt-4 overflow-hidden rounded-lg bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr>
                      <th className="w-[200px] border-b border-[#e5e7eb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-primary">
                        Tên file
                      </th>
                      <th className="border-b border-[#e5e7eb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-primary">
                        Thông tin file
                      </th>
                      <th className="w-24 border-b border-[#e5e7eb] px-3.5 py-2.5 text-center text-[13px] font-semibold text-primary">
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
                        <td className="px-3.5 py-2.5 text-[#374151]">{name}</td>
                        <td className="px-3.5 py-2.5 text-[#374151]">
                          {attachments[idx].file || attachments[idx].url ? (
                            attachments[idx].displayName
                          ) : (
                            <span className="text-muted">Không có file</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <button
                            type="button"
                            title="Xem"
                            onClick={() => handleFileView(idx)}
                            disabled={
                              !attachments[idx].file && !attachments[idx].url
                            }
                            className={
                              attachments[idx].file || attachments[idx].url
                                ? "text-muted hover:text-primary"
                                : "cursor-not-allowed text-muted opacity-40"
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
          </>
        ) : mode === "edit1" ? (
          <>
            <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
              <h1 className="text-base font-semibold text-ink">
                Thông tin doanh nghiệp
              </h1>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditErrors({});
                    setEditForm({ ...info });
                    setAttachments(
                      makeAttachments(
                        detailRef.current?.licenseFile,
                        detailRef.current?.otherFile,
                      ),
                    );
                  }}
                  className="h-9 rounded-md border border-line bg-white px-4 text-[13px] text-[#374151] hover:bg-[#f9fafb]"
                >
                  Hủy thay đổi
                </button>
                <button
                  type="button"
                  onClick={goEdit2}
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
              </div>
            </div>
            <Stepper step={1} />
            <div className="px-6 py-5">
              <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="mb-3.5 text-[13.5px] font-semibold text-[#374151]">
                  Thông tin doanh nghiệp
                </div>
                <div className="mb-6 grid grid-cols-3 gap-3.5 pt-2">
                  <OutlinedTextField
                    label="Tên doanh nghiệp"
                    required
                    value={editForm.ten}
                    error={!!editErrors.ten}
                    helperText={editErrors.ten}
                    onChange={(v) => {
                      setField("ten", v);
                      if (editErrors.ten)
                        setEditErrors((p) => ({ ...p, ten: undefined }));
                    }}
                  />
                  <OutlinedTextField
                    label="Mã số thuế"
                    required
                    disabled
                    value={editForm.mst}
                    error={!!editErrors.mst}
                    helperText={editErrors.mst}
                  />
                  <SearchableSelect
                    fixed
                    label="Loại hình kinh doanh"
                    required
                    options={loaiHinhOptions}
                    value={editForm.loai}
                    onChange={(v) => setField("loai", v)}
                  />
                </div>
                <div className="mb-6 grid grid-cols-3 gap-3.5 pt-2">
                  <SearchableSelect
                    fixed
                    label="Ngành nghề kinh doanh chính"
                    required
                    options={nganhCap4Options}
                    value={editForm.nganh}
                    error={!!editErrors.nganh}
                    helperText={editErrors.nganh}
                    onChange={(v) => {
                      setField("nganh", v);
                      if (editErrors.nganh)
                        setEditErrors((p) => ({ ...p, nganh: undefined }));
                    }}
                  />
                  <DateInput
                    label="Ngày cấp GPKD"
                    value={editForm.ngayCap}
                    onChange={(v) => setField("ngayCap", v)}
                    max={localISODate(new Date())}
                  />
                  <SearchableSelect
                    fixed
                    label="Tỉnh/Thành phố ĐKKD"
                    required
                    options={PROVINCES}
                    value={editForm.tinh}
                    error={!!editErrors.tinh}
                    helperText={editErrors.tinh}
                    onChange={(v) => {
                      setField("tinh", v);
                      setField("phuong", "");
                      if (editErrors.tinh)
                        setEditErrors((p) => ({ ...p, tinh: undefined }));
                    }}
                  />
                </div>
                <div className="mb-6 grid grid-cols-2 gap-3.5 pt-2">
                  <SearchableSelect
                    fixed
                    label="Phường/Xã ĐKKD"
                    required
                    options={phuongOptions}
                    value={editForm.phuong}
                    disabled={!editForm.tinh}
                    error={!!editErrors.phuong}
                    helperText={editErrors.phuong}
                    onChange={(v) => {
                      setField("phuong", v);
                      if (editErrors.phuong)
                        setEditErrors((p) => ({ ...p, phuong: undefined }));
                    }}
                  />
                  <OutlinedTextField
                    label="Địa chỉ"
                    value={editForm.diaChi}
                    onChange={(v) => setField("diaChi", v)}
                  />
                </div>

                <div className="mt-7 mb-4 text-[13.5px] font-semibold text-[#374151]">
                  Thông tin liên hệ
                </div>
                <div className="mb-6 grid grid-cols-3 gap-3.5 pt-2">
                  <OutlinedTextField
                    label="Tên tiếng nước ngoài"
                    value={editForm.tenNN}
                    onChange={(v) => setField("tenNN", v)}
                  />

                  <div className="flex items-center gap-3">
                    <div
                      className="relative flex-1 group"
                      style={{ height: "40px" }}
                    >
                      <input
                        className="w-full h-full rounded-md border-0 bg-[#f9fafb] text-muted cursor-not-allowed px-3 text-[13.5px] outline-none"
                        value={editForm.email}
                        readOnly
                        disabled
                        style={{ height: "40px" }}
                      />
                      <fieldset className="absolute inset-0 m-0 p-0 rounded-md border pointer-events-none transition-colors border-line group-hover:border-ink">
                        <legend className="ml-2 px-1 text-[0px] text-transparent transition-all text-muted">
                          Email <span className="text-danger">*</span>
                        </legend>
                      </fieldset>
                      <label className="absolute left-3 -top-2 text-[11px] z-10 bg-white px-1 text-muted pointer-events-none">
                        Email <span className="text-danger">*</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenChangeEmailModal}
                      disabled={saving}
                      className="text-[13.5px] font-bold text-primary hover:text-blue-700 disabled:opacity-50 shrink-0"
                    >
                      Thay đổi
                    </button>
                  </div>

                  <OutlinedTextField
                    label="SĐT cơ quan"
                    value={editForm.sdt}
                    error={!!editErrors.sdt}
                    helperText={editErrors.sdt}
                    onChange={(v) => {
                      setField("sdt", v);
                      if (editErrors.sdt)
                        setEditErrors((p) => ({ ...p, sdt: undefined }));
                    }}
                  />
                </div>
                <div className="mb-6 grid grid-cols-3 gap-3.5 pt-2">
                  <OutlinedTextField
                    label="Địa điểm kinh doanh"
                    value={editForm.diaDiem}
                    onChange={(v) => setField("diaDiem", v)}
                  />
                  <OutlinedTextField
                    label="Người đứng đầu DN"
                    value={editForm.nguoiDD}
                    onChange={(v) => setField("nguoiDD", v)}
                  />
                  <OutlinedTextField
                    label="SĐT người đứng đầu"
                    value={editForm.sdtDD}
                    error={!!editErrors.sdtDD}
                    helperText={editErrors.sdtDD}
                    onChange={(v) => {
                      setField("sdtDD", v);
                      if (editErrors.sdtDD)
                        setEditErrors((p) => ({ ...p, sdtDD: undefined }));
                    }}
                  />
                </div>

                <div className="mt-7 mb-4 text-[13.5px] font-semibold text-[#374151]">
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
                            {attachments[idx].file || attachments[idx].url ? (
                              attachments[idx].displayName
                            ) : (
                              <span className="text-muted">Không có file</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1.5 text-muted">
                              <button
                                type="button"
                                title="Xem"
                                onClick={() => handleFileView(idx)}
                                disabled={
                                  !attachments[idx].file &&
                                  !attachments[idx].url
                                }
                                className={
                                  attachments[idx].file || attachments[idx].url
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
                                disabled={!attachments[idx].file && !attachments[idx].url}
                                className={
                                  attachments[idx].file || attachments[idx].url
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
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
              <h1 className="text-base font-semibold text-ink">
                Thông tin doanh nghiệp
              </h1>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode("edit1")}
                  className="h-9 rounded-md border border-line bg-white px-4 text-[13px] text-[#374151] hover:bg-[#f9fafb]"
                >
                  Trở về
                </button>
                <button
                  type="button"
                  onClick={confirmEdit2}
                  disabled={saving}
                  className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    "Đang lưu..."
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
            </div>
            <Stepper step={2} />
            <div className="px-6 py-5">
              <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                {reviewRows.map(([label, value]) => (
                  <ReviewRow key={label} label={label} value={value} />
                ))}
              </div>
            </div>
          </>
        )}
      </>

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

      {/* OTP modal for email change */}
      <div
        className={`fixed inset-0 z-[300] flex items-center justify-center bg-black/50 transition-opacity duration-200 ${otpOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div
          className={`w-[360px] rounded-[12px] bg-white px-7 py-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-transform duration-200 ${otpOpen ? "translate-y-0" : "translate-y-2.5"}`}
        >
          <div className="mb-2 text-[16px] font-bold text-primary">
            THAY ĐỔI EMAIL
          </div>

          {otpStep === 1 ? (
            <>
              <p className="mb-1 text-[13px] text-muted">
                Chúng tôi đã gửi mã xác minh qua số email cũ
              </p>
              <p className="mb-1 text-[13.5px] font-bold text-ink">
                {info.email}
              </p>
              <p className="mb-4 text-[13px] text-muted">
                Bạn vui lòng kiểm tra và điền mã xác thực
              </p>

              {otpError ? <Alert variant="error" message={otpError} /> : null}

              <div className="mb-4 text-left">
                <label className="mb-1.5 block text-[12.5px] font-medium text-[#374151]">
                  OTP <span className="text-danger">*</span>
                </label>
                <input
                  className="h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-[#3b82f6]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>

              <div className="mb-1 text-sm font-bold text-primary">
                {countdown.formatted}
              </div>
              <div className="mb-4 text-[12.5px] text-muted">
                Chưa nhận được mã?{" "}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-primary hover:underline font-medium"
                >
                  Gửi lại
                </button>
              </div>

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={saving}
                className="mb-2 h-[42px] w-full rounded-md bg-primary text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60"
              >
                {saving ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </>
          ) : (
            <>
              <p className="mb-4 text-[13px] text-muted">
                Vui lòng nhập email mới
              </p>

              {newEmailError ? (
                <Alert variant="error" message={newEmailError} />
              ) : null}

              <div className="mb-5 text-left">
                <label className="mb-1.5 block text-[12.5px] font-medium text-[#374151]">
                  Email <span className="text-danger">*</span>
                </label>
                <input
                  className="h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-[#3b82f6]"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  type="email"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveNewEmail}
                disabled={saving}
                className="mb-2 h-[42px] w-full rounded-md bg-primary text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setOtpOpen(false);
              countdown.stop();
            }}
            className="text-[13px] text-muted hover:text-[#374151]"
          >
            Hủy bỏ
          </button>
        </div>
      </div>

      <Toast
        message={toast}
        variant={toastVariant}
        onDone={() => setToast(null)}
      />
    </>
  );
}
