"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormHelperText } from "@mui/material";
import { AuthShell } from "@/libs/shared/core/components/AuthShell/AuthShell";
import { GovSeal } from "@/libs/shared/core/components/GovSeal/GovSeal";
import { Alert } from "@/libs/shared/core/components/Alert/Alert";
import { PasswordField } from "@/libs/shared/core/components/PasswordField/PasswordField";
import { useCountdown } from "@/libs/shared/core/hooks/useCountdown";
import { isValidEmail, isValidPhone } from "@/libs/tts/auth/authValidation";
import { localISODate } from "@/libs/shared/core/utils/dateUtils";
import { type EnterpriseForm, EMPTY_ENTERPRISE_FORM } from "@/libs/tts/enterprise/enterpriseData";
import { PROVINCES, WARDS_BY_PROVINCE } from "@/libs/tts/location/locationData";
import { getEnterpriseTypeList } from "@/libs/tts/enterprise-type/enterpriseTypeApi";
import { getBusinessSectorList } from "@/libs/tts/business-sector/businessSectorApi";

const FILE_NAMES = ["Giấy phép kinh doanh", "Giấy tờ khác"];

type AppView = "login" | "wizard";
type WizardStep = 1 | 2;
type AttachedFile = { file: File | null; displayName: string };

const emptyAttachments = (): AttachedFile[] => FILE_NAMES.map(() => ({ file: null, displayName: "" }));

const FORM_CONTROL_CLASS =
  "h-[38px] rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";
const SELECT_CONTROL_CLASS = `${FORM_CONTROL_CLASS} cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8`;

function FieldGroup({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12.5px] font-medium text-[#374151]">
        {label} {required ? <span className="text-danger">*</span> : null}
      </label>
      {children}
      {error && (
        <FormHelperText error sx={{ mt: 0, mx: 0, fontSize: "11px" }}>
          {error}
        </FormHelperText>
      )}
    </div>
  );
}

export default function EnterpriseRegisterPage() {
  const router = useRouter();
  const countdown = useCountdown(300);

  const [appView, setAppView] = useState<AppView>("login");
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginFieldErrors, setLoginFieldErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

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

  const [accountPopup, setAccountPopup] = useState<string | null>(null);

  const phuongDKKDOptions = useMemo(() => WARDS_BY_PROVINCE[form.tinh] ?? [], [form.tinh]);
  const phuongHDOptions = useMemo(() => WARDS_BY_PROVINCE[form.tinhHD] ?? [], [form.tinhHD]);

  const setField = <K extends keyof EnterpriseForm>(key: K, value: EnterpriseForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleLogin = () => {
    const errors: { username?: string; password?: string } = {};
    if (!loginUsername.trim()) errors.username = "Vui lòng nhập tên đăng nhập";
    if (!loginPassword.trim()) errors.password = "Vui lòng nhập mật khẩu";
    if (Object.keys(errors).length > 0) {
      setLoginFieldErrors(errors);
      return;
    }
    setLoginFieldErrors({});
    setAppView("wizard");
    setWizardStep(1);
  };

  const validateAndOtp = () => {
    const errors: typeof wizardFieldErrors = {};
    if (!form.ten.trim()) errors.ten = "Tên doanh nghiệp không được để trống";
    if (!form.mst.trim()) errors.mst = "Mã số thuế không được để trống";
    else if (!/^\d{10}(-\d{3})?$/.test(form.mst.trim()))
      errors.mst = "Mã số thuế phải có 10 chữ số hoặc định dạng XXXXXXXXXX-XXX";
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
    setOtp("");
    setOtpError(null);
    setOtpOpen(true);
    countdown.start();
  };

  const confirmOtp = () => {
    if (!otp.trim()) {
      setOtpError("Vui lòng nhập mã OTP");
      return;
    }
    setOtpOpen(false);
    countdown.stop();
    setWizardStep(2);
  };

  const confirmWizard = () => {
    setAccountPopup(form.mst);
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
    ["Tên đăng nhập :", form.mst],
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

  if (appView === "login") {
    return (
      <AuthShell>
        <GovSeal size={72} className="mb-4" />
        <h1 className="mb-7 text-center text-[15px] font-bold leading-relaxed text-dark">
          Phần Mềm Quản Lý - Tạo Lập Cơ Sở Dữ Liệu
          <br />
          An Toàn Vệ Sinh Lao Động
        </h1>
        <div className="mb-3.5 w-full text-[13px] font-bold uppercase tracking-widest text-primary">
          Đăng nhập
        </div>

        <div className="mb-3.5 w-full">
          <label className="mb-1 block text-xs text-muted">Tên đăng nhập *</label>
          <input
            type="text"
            value={loginUsername}
            onChange={(e) => {
              setLoginUsername(e.target.value);
              if (loginFieldErrors.username)
                setLoginFieldErrors((p) => ({ ...p, username: undefined }));
            }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoComplete="username"
            className={`h-10 w-full rounded-md border bg-white px-3 text-sm text-ink outline-none transition-colors ${loginFieldErrors.username ? "border-danger" : "border-line focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"}`}
          />
          {loginFieldErrors.username && (
            <FormHelperText error sx={{ mt: 0.5, mx: 0, fontSize: "11px" }}>
              {loginFieldErrors.username}
            </FormHelperText>
          )}
        </div>
        <div className="mb-3.5 w-full">
          <label className="mb-1 block text-xs text-muted">Mật khẩu *</label>
          <PasswordField
            value={loginPassword}
            onChange={(v) => {
              setLoginPassword(v);
              if (loginFieldErrors.password)
                setLoginFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            hasError={!!loginFieldErrors.password}
          />
          {loginFieldErrors.password && (
            <FormHelperText error sx={{ mt: 0.5, mx: 0, fontSize: "11px" }}>
              {loginFieldErrors.password}
            </FormHelperText>
          )}
        </div>

        <div className="mb-5 flex w-full items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#374151]">
            <input type="checkbox" className="h-4 w-4 cursor-pointer accent-primary" defaultChecked />
            Nhớ đăng nhập
          </label>
          <a href="/forgot-password" className="text-[13px] font-medium text-primary hover:underline">
            Quên mật khẩu
          </a>
        </div>

        <button
          type="button"
          onClick={handleLogin}
          className="mb-3 h-11 w-full rounded-md bg-primary text-[14.5px] font-semibold text-white hover:bg-[#1e40af]"
        >
          Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => {
            setAppView("wizard");
            setWizardStep(1);
            setForm(EMPTY_ENTERPRISE_FORM);
            setAttachments(emptyAttachments());
            setWizardFieldErrors({});
          }}
          className="h-11 w-full rounded-md border border-line bg-white text-[14px] font-medium text-[#374151] hover:bg-[#f9fafb]"
        >
          Đăng ký tài khoản doanh nghiệp
        </button>
      </AuthShell>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-black/50 pb-10 pt-8">
      <div className="mx-auto w-[780px] max-w-[96vw] rounded-xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        {/* Header with close button */}
        <div className="flex items-center justify-between px-7 pt-5 pb-1">
          <div />
          <button
            type="button"
            onClick={() => setAppView("login")}
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
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[13px] font-bold ${
                wizardStep === 1 ? "border-primary bg-white text-primary" : "border-primary bg-primary text-white"
              }`}
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
                  ? "border-primary bg-white text-primary"
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

              {/* Enterprise info */}
              <div className="mb-4 rounded-lg border border-[#e5e7eb] p-5">
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  <FieldGroup label="Tên doanh nghiệp" required error={wizardFieldErrors.ten}>
                    <input
                      className={`${FORM_CONTROL_CLASS}${wizardFieldErrors.ten ? " border-danger" : ""}`}
                      value={form.ten}
                      onChange={(e) => {
                        setField("ten", e.target.value);
                        if (wizardFieldErrors.ten) setWizardFieldErrors((p) => ({ ...p, ten: undefined }));
                      }}
                      placeholder="VD: Công ty cổ phần ABC"
                    />
                  </FieldGroup>
                  <FieldGroup label="Mã số thuế" required error={wizardFieldErrors.mst}>
                    <input
                      className={`${FORM_CONTROL_CLASS}${wizardFieldErrors.mst ? " border-danger" : ""}`}
                      value={form.mst}
                      maxLength={14}
                      onChange={(e) => {
                        setField("mst", e.target.value);
                        if (wizardFieldErrors.mst) setWizardFieldErrors((p) => ({ ...p, mst: undefined }));
                      }}
                      placeholder="VD: 0310000888"
                    />
                  </FieldGroup>
                  <FieldGroup label="Loại hình kinh doanh" required error={wizardFieldErrors.loai}>
                    <select
                      className={`${SELECT_CONTROL_CLASS}${wizardFieldErrors.loai ? " border-danger" : ""}`}
                      value={form.loai}
                      onChange={(e) => {
                        setField("loai", e.target.value);
                        if (wizardFieldErrors.loai) setWizardFieldErrors((p) => ({ ...p, loai: undefined }));
                      }}
                    >
                      <option value="">-- Chọn loại hình --</option>
                      {loaiHinhOptions.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </FieldGroup>
                </div>
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  <FieldGroup label="Ngành nghề kinh doanh chính" required error={wizardFieldErrors.nganh}>
                    <select
                      className={`${SELECT_CONTROL_CLASS}${wizardFieldErrors.nganh ? " border-danger" : ""}`}
                      value={form.nganh}
                      onChange={(e) => {
                        setField("nganh", e.target.value);
                        if (wizardFieldErrors.nganh) setWizardFieldErrors((p) => ({ ...p, nganh: undefined }));
                      }}
                    >
                      <option value="">-- Chọn ngành nghề --</option>
                      {nganhCap4Options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </FieldGroup>
                  <FieldGroup label="Ngày cấp GPKD">
                    <input
                      type="date"
                      className={FORM_CONTROL_CLASS}
                      value={form.ngayCap}
                      max={localISODate(new Date())}
                      onChange={(e) => setField("ngayCap", e.target.value)}
                    />
                  </FieldGroup>
                  <FieldGroup label="Tỉnh/Thành phố ĐKKD" required error={wizardFieldErrors.tinh}>
                    <select
                      className={`${SELECT_CONTROL_CLASS}${wizardFieldErrors.tinh ? " border-danger" : ""}`}
                      value={form.tinh}
                      onChange={(e) => {
                        setField("tinh", e.target.value);
                        setField("phuong", "");
                        if (wizardFieldErrors.tinh) setWizardFieldErrors((p) => ({ ...p, tinh: undefined }));
                      }}
                    >
                      <option value="">-- Chọn tỉnh/thành phố --</option>
                      {PROVINCES.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </FieldGroup>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <FieldGroup label="Phường/Xã ĐKKD" required error={wizardFieldErrors.phuong}>
                    <select
                      className={`${SELECT_CONTROL_CLASS}${wizardFieldErrors.phuong ? " border-danger" : ""}`}
                      value={form.phuong}
                      onChange={(e) => {
                        setField("phuong", e.target.value);
                        if (wizardFieldErrors.phuong) setWizardFieldErrors((p) => ({ ...p, phuong: undefined }));
                      }}
                    >
                      <option value="">-- Chọn phường/xã --</option>
                      {phuongDKKDOptions.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </FieldGroup>
                  <FieldGroup label="Địa chỉ">
                    <input
                      className={FORM_CONTROL_CLASS}
                      value={form.diaChi}
                      onChange={(e) => setField("diaChi", e.target.value)}
                      placeholder="VD: 162 đường số 2, khu đô thị Vạn Phúc"
                    />
                  </FieldGroup>
                </div>
              </div>

              {/* Contact info */}
              <div className="my-3 text-[13.5px] font-semibold text-[#374151]">Thông tin liên hệ</div>
              <div className="mb-4 rounded-lg border border-[#e5e7eb] p-5">
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  <FieldGroup label="Tên viết bằng tiếng nước ngoài">
                    <input
                      className={FORM_CONTROL_CLASS}
                      value={form.tenNN}
                      onChange={(e) => setField("tenNN", e.target.value)}
                      placeholder="VD: VNA Group"
                    />
                  </FieldGroup>
                  <FieldGroup label="Email" required error={wizardFieldErrors.email}>
                    <input
                      type="email"
                      className={`${FORM_CONTROL_CLASS}${wizardFieldErrors.email ? " border-danger" : ""}`}
                      value={form.email}
                      onChange={(e) => {
                        setField("email", e.target.value);
                        if (wizardFieldErrors.email) setWizardFieldErrors((p) => ({ ...p, email: undefined }));
                      }}
                      placeholder="vna@gmail.com"
                    />
                  </FieldGroup>
                  <FieldGroup label="Số điện thoại cơ quan" error={wizardFieldErrors.sdt}>
                    <input
                      className={`${FORM_CONTROL_CLASS}${wizardFieldErrors.sdt ? " border-danger" : ""}`}
                      value={form.sdt}
                      onChange={(e) => {
                        setField("sdt", e.target.value);
                        if (wizardFieldErrors.sdt) setWizardFieldErrors((p) => ({ ...p, sdt: undefined }));
                      }}
                      placeholder="VD: 0283xxxxxxx"
                    />
                  </FieldGroup>
                </div>
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  <FieldGroup label="Người đứng đầu doanh nghiệp">
                    <input
                      className={FORM_CONTROL_CLASS}
                      value={form.nguoiDD}
                      onChange={(e) => setField("nguoiDD", e.target.value)}
                    />
                  </FieldGroup>
                  <FieldGroup label="SĐT liên hệ người đứng đầu" error={wizardFieldErrors.sdtDD}>
                    <input
                      className={`${FORM_CONTROL_CLASS}${wizardFieldErrors.sdtDD ? " border-danger" : ""}`}
                      value={form.sdtDD}
                      onChange={(e) => {
                        setField("sdtDD", e.target.value);
                        if (wizardFieldErrors.sdtDD) setWizardFieldErrors((p) => ({ ...p, sdtDD: undefined }));
                      }}
                    />
                  </FieldGroup>
                  <FieldGroup label="Tỉnh/TP hoạt động KD">
                    <select
                      className={SELECT_CONTROL_CLASS}
                      value={form.tinhHD}
                      onChange={(e) => {
                        setField("tinhHD", e.target.value);
                        setField("phuongHD", "");
                      }}
                    >
                      <option value="">-- Chọn tỉnh --</option>
                      {PROVINCES.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </FieldGroup>
                </div>
                <div className="grid grid-cols-3 gap-3.5">
                  <FieldGroup label="Phường/xã hoạt động KD">
                    <select
                      className={SELECT_CONTROL_CLASS}
                      value={form.phuongHD}
                      onChange={(e) => setField("phuongHD", e.target.value)}
                    >
                      <option value="">-- Chọn phường/xã --</option>
                      {phuongHDOptions.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </FieldGroup>
                  <FieldGroup label="Địa điểm kinh doanh">
                    <input
                      className={FORM_CONTROL_CLASS}
                      value={form.diaDiem}
                      onChange={(e) => setField("diaDiem", e.target.value)}
                    />
                  </FieldGroup>
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
                onClick={() => setAppView("login")}
                className="h-[38px] rounded-md border border-line px-4.5 text-[13.5px] text-[#374151] hover:bg-[#f9fafb]"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={validateAndOtp}
                className="flex h-[38px] items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af]"
              >
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
                onClick={() => setWizardStep(1)}
                className="h-[38px] rounded-md border border-line px-4.5 text-[13.5px] text-[#374151] hover:bg-[#f9fafb]"
              >
                Trở về
              </button>
              <button
                type="button"
                onClick={confirmWizard}
                className="flex h-[38px] items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Xác nhận
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
            <button type="button" onClick={() => countdown.start()} className="text-primary hover:underline">
              Gửi lại
            </button>
          </div>
          <button
            type="button"
            onClick={confirmOtp}
            className="mb-2 h-10.5 w-full rounded-md bg-primary text-sm font-semibold text-white hover:bg-[#1e40af]"
          >
            Xác nhận
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
                • Tài khoản: <strong>{accountPopup}</strong>
              </p>
              <p className="mb-2 text-[13.5px] text-ink">
                • Mật khẩu: <strong>12345678</strong>
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
    </div>
  );
}
