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
import { getBusinessId, ApiError } from "@/libs/tts/auth/authApi";
import { getBusinessById, updateBusiness, type BusinessDetail } from "@/libs/tts/enterprise/enterpriseApi";
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
  return { mst: "", ten: "", tenNN: "", email: "", ngayCap: "", loai: "", nganh: "", tinh: "", phuong: "", diaChi: "", diaDiem: "", nguoiDD: "", sdtDD: "", sdt: "" };
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            "1"
          )}
        </div>
        <span className={`text-[13px] ${step >= 1 ? "font-medium text-ink" : "text-[#9ca3af]"}`}>
          Thông tin doanh nghiệp
        </span>
      </div>
      <div className={`mx-2 h-0.5 w-[60px] ${step >= 2 ? "bg-primary" : "bg-[#e5e7eb]"}`} />
      <div className="flex items-center gap-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[12px] font-bold ${step >= 2 ? "border-primary bg-white text-primary" : "border-[#d1d5db] bg-white text-[#9ca3af]"}`}
        >
          2
        </div>
        <span className={`text-[13px] ${step >= 2 ? "font-medium text-ink" : "text-[#9ca3af]"}`}>
          Xác nhận chỉnh sửa
        </span>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex border-b border-[#f3f4f6] py-3 last:border-b-0">
      <span className="w-[300px] shrink-0 text-[13.5px] font-semibold text-[#374151]">{label}</span>
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

function makeAttachments(licenseUrl?: string | null, otherUrl?: string | null): AttachedFile[] {
  return [
    { file: null, displayName: filenameFromUrl(licenseUrl), url: licenseUrl ?? undefined },
    { file: null, displayName: filenameFromUrl(otherUrl), url: otherUrl ?? undefined },
  ];
}

export default function EnterpriseInfoPage() {
  const router = useRouter();
  const countdown = useCountdown(300);

  const [mode, setMode] = useState<PageMode>("view");
  const [info, setInfo] = useState<BusinessFormState>(emptyForm());
  const [editForm, setEditForm] = useState<BusinessFormState>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastVariant, setToastVariant] = useState<"success" | "error">("success");
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

  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<AttachedFile[]>(makeAttachments());
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
        setInfo(fromDetail(detail));
        setAttachments(makeAttachments(detail.licenseFile, detail.otherFile));
      })
      .catch((err) => {
        setFetchError(err instanceof ApiError ? err.message : "Không thể tải thông tin doanh nghiệp");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const phuongOptions = useMemo(
    () => WARDS_BY_PROVINCE[editForm.tinh] ?? [],
    [editForm.tinh],
  );

  const handleFileSelect = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
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
    if (att.url) { window.open(att.url, "_blank"); return; }
    if (att.file) window.open(URL.createObjectURL(att.file), "_blank");
  };

  const handleFileDelete = (idx: number) => {
    setAttachments((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], file: null, displayName: filenameFromUrl(next[idx].url) };
      return next;
    });
  };

  const setField = (key: keyof BusinessFormState, value: string) =>
    setEditForm((prev) => ({ ...prev, [key]: value }));

  const showToast = (message: string, variant: "success" | "error" = "success") => {
    setToastVariant(variant);
    setToast(message);
  };

  const goEdit1 = () => {
    setEditForm({ ...info });
    setEditErrors({});
    setAttachments(makeAttachments(detailRef.current?.licenseFile, detailRef.current?.otherFile));
    setMode("edit1");
  };

  const goEdit2 = () => {
    const errors: typeof editErrors = {};
    if (!editForm.ten.trim()) errors.ten = "Tên doanh nghiệp không được để trống";
    if (!editForm.email.trim()) errors.email = "Email không được để trống";
    else if (!isValidEmail(editForm.email.trim())) errors.email = "Email không đúng định dạng";
    if (!editForm.nganh) errors.nganh = "Vui lòng chọn ngành nghề kinh doanh";
    if (!editForm.tinh) errors.tinh = "Vui lòng chọn tỉnh/thành phố ĐKKD";
    if (!editForm.phuong) errors.phuong = "Vui lòng chọn phường/xã ĐKKD";
    if (editForm.sdt.trim() && !isValidPhone(editForm.sdt)) errors.sdt = "Số điện thoại không hợp lệ";
    if (editForm.sdtDD.trim() && !isValidPhone(editForm.sdtDD)) errors.sdtDD = "Số điện thoại không hợp lệ";
    if (Object.keys(errors).length > 0) { setEditErrors(errors); return; }
    setEditErrors({});
    setMode("edit2");
  };

  const doSave = async () => {
    if (!businessId.current) return;
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
      if (editForm.diaDiem) formData.append("operatingAddress", editForm.diaDiem);
      if (editForm.nguoiDD) formData.append("representative", editForm.nguoiDD);
      if (editForm.sdtDD) formData.append("representativePhone", editForm.sdtDD);
      if (attachments[0].file) formData.append("licenseFile", attachments[0].file);
      if (attachments[1].file) formData.append("otherFile", attachments[1].file);

      const updated = await updateBusiness(businessId.current, formData);
      detailRef.current = updated;
      setInfo(fromDetail(updated));
      setAttachments(makeAttachments(updated.licenseFile, updated.otherFile));
      setMode("view");
      showToast("Cập nhật thành công");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Đã có lỗi xảy ra. Vui lòng thử lại.", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmEdit2 = () => {
    if (editForm.email !== info.email) {
      setOtp("");
      setOtpError(null);
      setOtpOpen(true);
      countdown.start();
    } else {
      doSave();
    }
  };

  const confirmOtp = () => {
    if (!otp.trim()) { setOtpError("Vui lòng nhập mã OTP"); return; }
    setOtpOpen(false);
    countdown.stop();
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
    ["Địa chỉ đăng ký GPKD:", `${editForm.diaChi}, ${editForm.phuong}, ${editForm.tinh}`],
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
      <div className="px-6 py-5">
        <Alert variant="error" message={fetchError} onClose={() => setFetchError(null)} />
      </div>
    );
  }

  return (
    <>
      <>
        {mode === "view" ? (
          <>
            <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
              <h1 className="text-base font-semibold text-ink">Thông tin doanh nghiệp</h1>
              <button
                type="button"
                onClick={goEdit1}
                className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <ReviewRow label="Tên viết bằng tiếng nước ngoài :" value={info.tenNN} />
                <ReviewRow label="Email:" value={info.email} />
                <ReviewRow label="Ngày cấp GPKD:" value={info.ngayCap} />
                <ReviewRow label="Loại hình kinh doanh:" value={info.loai} />
                <ReviewRow label="Ngành nghề kinh doanh:" value={info.nganh} />
                <ReviewRow label="Địa chỉ đăng ký GPKD:" value={`${info.diaChi}, ${info.phuong}, ${info.tinh}`} />
                <ReviewRow label="Địa điểm kinh doanh:" value={info.diaDiem} />
                <ReviewRow label="Người đứng đầu doanh nghiệp:" value={info.nguoiDD} />
                <ReviewRow label="SĐT người đứng đầu:" value={info.sdtDD} />
              </div>

              <div className="mt-4 overflow-hidden rounded-lg bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr>
                      <th className="w-[200px] border-b border-[#e5e7eb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-primary">Tên file</th>
                      <th className="border-b border-[#e5e7eb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-primary">Thông tin file</th>
                      <th className="w-24 border-b border-[#e5e7eb] px-3.5 py-2.5 text-center text-[13px] font-semibold text-primary">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FILE_NAMES.map((name, idx) => (
                      <tr key={name} className="border-b border-[#f3f4f6] last:border-b-0">
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
                            disabled={!attachments[idx].file && !attachments[idx].url}
                            className={
                              attachments[idx].file || attachments[idx].url
                                ? "text-muted hover:text-primary"
                                : "cursor-not-allowed text-muted opacity-40"
                            }
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
          </>
        ) : mode === "edit1" ? (
          <>
            <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
              <h1 className="text-base font-semibold text-ink">Thông tin doanh nghiệp</h1>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode("view");
                    setEditErrors({});
                    setAttachments(makeAttachments(detailRef.current?.licenseFile, detailRef.current?.otherFile));
                  }}
                  className="h-9 rounded-md border border-line bg-white px-4 text-[13px] text-[#374151] hover:bg-[#f9fafb]"
                >
                  Trở về
                </button>
                <button
                  type="button"
                  onClick={goEdit2}
                  className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]"
                >
                  Tiếp tục{" "}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
            <Stepper step={1} />
            <div className="px-6 py-5">
              <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="mb-3.5 text-[13.5px] font-semibold text-[#374151]">Thông tin doanh nghiệp</div>
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  {(
                    [
                      { label: "Tên doanh nghiệp", key: "ten", required: true, error: editErrors.ten },
                      { label: "Mã số thuế", key: "mst", required: true, error: editErrors.mst },
                      { label: "Loại hình kinh doanh", key: "loai", required: true },
                    ] as { label: string; key: keyof BusinessFormState; required?: boolean; error?: string }[]
                  ).map(({ label, key, required, error }) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-[12.5px] font-medium text-[#374151]">
                        {label} {required ? <span className="text-danger">*</span> : null}
                      </label>
                      {key === "loai" ? (
                        <SearchableSelect
                          fixed
                          options={loaiHinhOptions}
                          value={editForm[key]}
                          placeholder="-- Chọn loại hình --"
                          onChange={(v) => setField(key, v)}
                        />
                      ) : (
                        <input
                          className={`${FORM_CONTROL_CLASS}${error ? " border-danger" : ""}${key === "mst" ? " cursor-not-allowed bg-[#f9fafb] text-muted" : ""}`}
                          value={editForm[key]}
                          disabled={key === "mst"}
                          onChange={(e) => {
                            setField(key, e.target.value);
                            if (error) setEditErrors((p) => ({ ...p, [key]: undefined }));
                          }}
                        />
                      )}
                      {error && (
                        <FormHelperText error sx={{ mt: 0, mx: 0, fontSize: "11px" }}>{error}</FormHelperText>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">
                      Ngành nghề kinh doanh chính <span className="text-danger">*</span>
                    </label>
                    <SearchableSelect
                      fixed
                      options={nganhCap4Options}
                      value={editForm.nganh}
                      placeholder="-- Chọn ngành nghề --"
                      error={!!editErrors.nganh}
                      onChange={(v) => {
                        setField("nganh", v);
                        if (editErrors.nganh) setEditErrors((p) => ({ ...p, nganh: undefined }));
                      }}
                    />
                    {editErrors.nganh && (
                      <FormHelperText error sx={{ mt: 0, mx: 0, fontSize: "11px" }}>{editErrors.nganh}</FormHelperText>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Ngày cấp GPKD</label>
                    <DateInput
                      value={editForm.ngayCap}
                      onChange={(v) => setField("ngayCap", v)}
                      max={localISODate(new Date())}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">
                      Tỉnh/Thành phố ĐKKD <span className="text-danger">*</span>
                    </label>
                    <SearchableSelect
                      fixed
                      options={PROVINCES}
                      value={editForm.tinh}
                      placeholder="-- Chọn tỉnh/thành phố --"
                      onChange={(v) => {
                        setField("tinh", v);
                        setField("phuong", "");
                        if (editErrors.tinh) setEditErrors((p) => ({ ...p, tinh: undefined }));
                      }}
                    />
                    {editErrors.tinh && (
                      <FormHelperText error sx={{ mt: 0, mx: 0, fontSize: "11px" }}>{editErrors.tinh}</FormHelperText>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">
                      Phường/Xã ĐKKD <span className="text-danger">*</span>
                    </label>
                    <SearchableSelect
                      fixed
                      options={phuongOptions}
                      value={editForm.phuong}
                      placeholder="-- Chọn phường/xã --"
                      disabled={!editForm.tinh}
                      onChange={(v) => {
                        setField("phuong", v);
                        if (editErrors.phuong) setEditErrors((p) => ({ ...p, phuong: undefined }));
                      }}
                    />
                    {editErrors.phuong && (
                      <FormHelperText error sx={{ mt: 0, mx: 0, fontSize: "11px" }}>{editErrors.phuong}</FormHelperText>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Địa chỉ</label>
                    <input
                      className={FORM_CONTROL_CLASS}
                      value={editForm.diaChi}
                      onChange={(e) => setField("diaChi", e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-4 mb-2 text-[13.5px] font-semibold text-[#374151]">Thông tin liên hệ</div>
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  {(
                    [
                      { label: "Tên tiếng nước ngoài", key: "tenNN" },
                      { label: "Email", key: "email", required: true, error: editErrors.email },
                      { label: "SĐT cơ quan", key: "sdt", error: editErrors.sdt },
                    ] as { label: string; key: keyof BusinessFormState; required?: boolean; error?: string }[]
                  ).map(({ label, key, required, error }) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-[12.5px] font-medium text-[#374151]">
                        {label} {required ? <span className="text-danger">*</span> : null}
                      </label>
                      <input
                        className={`${FORM_CONTROL_CLASS}${error ? " border-danger" : ""}`}
                        value={editForm[key]}
                        onChange={(e) => {
                          setField(key, e.target.value);
                          if (error) setEditErrors((p) => ({ ...p, [key]: undefined }));
                        }}
                      />
                      {error && (
                        <FormHelperText error sx={{ mt: 0, mx: 0, fontSize: "11px" }}>{error}</FormHelperText>
                      )}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3.5">
                  {[
                    ["Địa điểm kinh doanh", "diaDiem"],
                    ["Người đứng đầu DN", "nguoiDD"],
                    ["SĐT người đứng đầu", "sdtDD"],
                  ].map(([label, key]) => {
                    const err = key === "sdtDD" ? editErrors.sdtDD : undefined;
                    return (
                      <div key={key} className="flex flex-col gap-1.5">
                        <label className="text-[12.5px] font-medium text-[#374151]">{label}</label>
                        <input
                          className={`${FORM_CONTROL_CLASS}${err ? " border-danger" : ""}`}
                          value={editForm[key as keyof BusinessFormState]}
                          onChange={(e) => {
                            setField(key as keyof BusinessFormState, e.target.value);
                            if (err) setEditErrors((p) => ({ ...p, sdtDD: undefined }));
                          }}
                        />
                        {err && (
                          <FormHelperText error sx={{ mt: 0, mx: 0, fontSize: "11px" }}>{err}</FormHelperText>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 mb-2 text-[13.5px] font-semibold text-[#374151]">File đính kèm</div>
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
                              <span className="text-muted">Không có file</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1.5 text-muted">
                              <button
                                type="button"
                                title="Xem"
                                onClick={() => handleFileView(idx)}
                                disabled={!attachments[idx].file && !attachments[idx].url}
                                className={
                                  attachments[idx].file || attachments[idx].url
                                    ? "hover:text-primary"
                                    : "cursor-not-allowed opacity-40"
                                }
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
                                className={
                                  attachments[idx].file ? "hover:text-danger" : "cursor-not-allowed opacity-40"
                                }
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
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
              <h1 className="text-base font-semibold text-ink">Thông tin doanh nghiệp</h1>
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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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

      <input ref={fileRef0} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handleFileSelect(0, e)} />
      <input ref={fileRef1} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handleFileSelect(1, e)} />

      {/* OTP modal for email change */}
      <div
        className={`fixed inset-0 z-[300] flex items-center justify-center bg-black/50 transition-opacity duration-200 ${otpOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div
          className={`w-[340px] rounded-[12px] bg-white px-7 py-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-transform duration-200 ${otpOpen ? "translate-y-0" : "translate-y-2.5"}`}
        >
          <div className="mb-2 text-[16px] font-bold text-primary">XÁC THỰC EMAIL</div>
          <p className="mb-1 text-[13px] text-muted">Mã xác minh đã gửi về email</p>
          <p className="mb-4 text-[13.5px] font-bold text-ink">{info.email}</p>
          {otpError ? <Alert variant="error" message={otpError} /> : null}
          <label className="mb-1.5 block text-left text-[12.5px] font-medium text-[#374151]">
            OTP <span className="text-danger">*</span>
          </label>
          <input
            className="mb-2 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-[#3b82f6]"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Nhập mã OTP"
          />
          <div className="mb-1 text-sm font-bold text-primary">{countdown.formatted}</div>
          <div className="mb-4 text-[12.5px] text-muted">
            Chưa nhận được mã?{" "}
            <button type="button" onClick={() => countdown.start()} className="text-primary hover:underline">
              Gửi lại
            </button>
          </div>
          <button
            type="button"
            onClick={confirmOtp}
            disabled={saving}
            className="mb-2 h-[42px] w-full rounded-md bg-primary text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Xác nhận"}
          </button>
          <button
            type="button"
            onClick={() => { setOtpOpen(false); countdown.stop(); }}
            className="text-[13px] text-muted hover:text-[#374151]"
          >
            Huỷ bỏ
          </button>
        </div>
      </div>

      <Toast message={toast} variant={toastVariant} onDone={() => setToast(null)} />
    </>
  );
}
