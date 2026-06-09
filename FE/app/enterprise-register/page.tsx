"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/libs/core/components/AuthShell/AuthShell";
import { GovSeal } from "@/libs/core/components/GovSeal/GovSeal";
import { Alert } from "@/libs/core/components/Alert/Alert";
import { PasswordField } from "@/libs/core/components/PasswordField/PasswordField";
import { useCountdown } from "@/libs/core/hooks/useCountdown";
import { isValidEmail } from "@/libs/tts/auth/authValidation";
import {
  LOAI_HINH_OPTIONS,
  NGANH_OPTIONS,
  TINH_OPTIONS,
  PHUONG_DKKD_OPTIONS,
  type EnterpriseForm,
  EMPTY_ENTERPRISE_FORM,
} from "@/libs/tts/enterprise/enterpriseData";

type AppView = "login" | "wizard";
type WizardStep = 1 | 2 | 3;

const FORM_CONTROL_CLASS =
  "h-[38px] rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";
const SELECT_CONTROL_CLASS = `${FORM_CONTROL_CLASS} cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8`;

function FieldGroup({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12.5px] font-medium text-[#374151]">
        {label} {required ? <span className="text-danger">*</span> : null}
      </label>
      {children}
    </div>
  );
}

const FILE_ROWS = [
  { name: "Giấy phép kinh doanh", info: "GPKD.pdf" },
  { name: "Giấy tờ khác", info: "GTK1.pdf" },
];

export default function EnterpriseRegisterPage() {
  const router = useRouter();
  const countdown = useCountdown(60);

  const [appView, setAppView] = useState<AppView>("login");
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [form, setForm] = useState<EnterpriseForm>(EMPTY_ENTERPRISE_FORM);
  const [wizardError, setWizardError] = useState<string | null>(null);

  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const [accountPopup, setAccountPopup] = useState<string | null>(null);

  const setField = <K extends keyof EnterpriseForm>(key: K, value: EnterpriseForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleLogin = () => {
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    setLoginError(null);
    setAppView("wizard");
    setWizardStep(1);
  };

  const goStep2 = () => {
    if (!form.ten.trim() || !form.mst.trim() || !form.loai || !form.nganh) {
      setWizardError("Vui lòng nhập đầy đủ thông tin bắt buộc.");
      return;
    }
    setWizardError(null);
    setWizardStep(2);
  };

  const confirmWizard = () => {
    if (!form.email.trim() || !isValidEmail(form.email.trim())) {
      setWizardError("Vui lòng nhập email hợp lệ.");
      return;
    }
    setWizardError(null);
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
    const acc = "0" + Math.floor(Math.random() * 9e9).toString().padStart(9, "0");
    setAccountPopup(acc);
  };

  const reviewRows: [string, string][] = [
    ["Mã số thuế :", form.mst || "210987802"],
    ["Tên doanh nghiệp :", form.ten],
    ["Tên viết bằng tiếng nước ngoài :", form.tenNN || "VNA Group"],
    ["Email :", form.email || "vna@gmail.com"],
    ["Ngày cấp GPKD:", form.ngayCap || ""],
    ["Loại hình kinh doanh:", form.loai || "Công ty TNHH"],
    ["Ngành nghề kinh doanh:", form.nganh || ""],
    ["Tỉnh/Thành phố ĐKKD:", form.tinh],
    ["Phường/Xã ĐKKD:", form.phuong],
    ["Địa chỉ đăng ký GPKD:", form.diaChi || ""],
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
        <div className="mb-3.5 w-full text-[13px] font-bold uppercase tracking-widest text-primary">Đăng nhập</div>

        {loginError ? <Alert variant="error" message={loginError} onClose={() => setLoginError(null)} /> : null}

        <div className="mb-3.5 w-full">
          <label className="mb-1 block text-xs text-muted">Tên đăng nhập *</label>
          <input
            type="text"
            value={loginUsername}
            onChange={(e) => setLoginUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="nguyenvanb.dttm"
            autoComplete="username"
            className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
          />
        </div>
        <div className="mb-3.5 w-full">
          <label className="mb-1 block text-xs text-muted">Mật khẩu *</label>
          <PasswordField value={loginPassword} onChange={setLoginPassword} />
        </div>

        <div className="mb-5 flex w-full items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#374151]">
            <input type="checkbox" className="h-4 w-4 cursor-pointer accent-primary" defaultChecked />
            Nhớ đăng nhập
          </label>
          <a href="/forgot-password" className="text-[13px] font-medium text-primary hover:underline">Quên mật khẩu</a>
        </div>

        <button type="button" onClick={handleLogin} className="mb-3 h-[44px] w-full rounded-md bg-primary text-[14.5px] font-semibold text-white hover:bg-[#1e40af]">
          Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => { setAppView("wizard"); setWizardStep(1); setForm(EMPTY_ENTERPRISE_FORM); }}
          className="h-[44px] w-full rounded-md border border-line bg-white text-[14px] font-medium text-[#374151] hover:bg-[#f9fafb]"
        >
          Đăng ký tài khoản doanh nghiệp
        </button>
      </AuthShell>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-black/50 pb-10 pt-8">
      <div className="mx-auto w-[780px] max-w-[96vw] rounded-[12px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-0 pb-3 pt-6">
          {[1, 2, 3].map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              {idx > 0 ? <div className={`mx-2 h-0.5 w-[60px] ${wizardStep > idx ? "bg-primary" : "bg-[#e5e7eb]"}`} /> : null}
              <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[12px] font-bold ${wizardStep > s ? "border-primary bg-primary text-white" : wizardStep === s ? "border-primary bg-white text-primary" : "border-[#d1d5db] bg-white text-[#9ca3af]"}`}>
                {wizardStep > s ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg> : s}
              </div>
              <span className={`text-[13px] ${wizardStep >= s ? "font-medium text-ink" : "text-[#9ca3af]"}`}>
                {s === 1 ? "Thông tin doanh nghiệp" : s === 2 ? "Thông tin liên hệ" : "Xác nhận đăng ký"}
              </span>
            </div>
          ))}
        </div>

        {wizardStep === 1 ? (
          <>
            <div className="px-7 pb-6">
              <div className="mb-4 text-[15px] font-bold text-ink">Thêm mới doanh nghiệp</div>
              {wizardError ? <div className="mb-4 rounded-md border border-[#fca5a5] bg-[#fff1f0] px-3.5 py-2.5 text-[13px] text-[#b91c1c]">{wizardError}</div> : null}
              <div className="rounded-lg border border-[#e5e7eb] p-5">
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  <FieldGroup label="Tên doanh nghiệp" required>
                    <input className={FORM_CONTROL_CLASS} value={form.ten} onChange={(e) => setField("ten", e.target.value)} placeholder="VD: Công ty cổ phần ABC" />
                  </FieldGroup>
                  <FieldGroup label="Mã số thuế" required>
                    <input className={FORM_CONTROL_CLASS} value={form.mst} onChange={(e) => setField("mst", e.target.value)} placeholder="VD: 0310000888292" />
                  </FieldGroup>
                  <FieldGroup label="Loại hình kinh doanh" required>
                    <select className={SELECT_CONTROL_CLASS} value={form.loai} onChange={(e) => setField("loai", e.target.value)}>
                      <option value="">-- Chọn loại hình --</option>
                      {LOAI_HINH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </FieldGroup>
                </div>
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  <FieldGroup label="Ngành nghề kinh doanh chính" required>
                    <select className={SELECT_CONTROL_CLASS} value={form.nganh} onChange={(e) => setField("nganh", e.target.value)}>
                      <option value="">-- Chọn ngành nghề --</option>
                      {NGANH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </FieldGroup>
                  <FieldGroup label="Ngày cấp GPKD">
                    <input type="date" className={FORM_CONTROL_CLASS} value={form.ngayCap} onChange={(e) => setField("ngayCap", e.target.value)} />
                  </FieldGroup>
                  <FieldGroup label="Tỉnh/Thành phố ĐKKD" required>
                    <select className={SELECT_CONTROL_CLASS} value={form.tinh} onChange={(e) => setField("tinh", e.target.value)}>
                      {TINH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </FieldGroup>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <FieldGroup label="Phường/Xã ĐKKD" required>
                    <select className={SELECT_CONTROL_CLASS} value={form.phuong} onChange={(e) => setField("phuong", e.target.value)}>
                      {PHUONG_DKKD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </FieldGroup>
                  <FieldGroup label="Địa chỉ">
                    <input className={FORM_CONTROL_CLASS} value={form.diaChi} onChange={(e) => setField("diaChi", e.target.value)} placeholder="VD: 162 đường số 2, khu đô thị Vạn Phúc" />
                  </FieldGroup>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 border-t border-[#e5e7eb] px-7 py-4">
              <button type="button" onClick={() => setAppView("login")} className="h-9 rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb]">Huỷ bỏ</button>
              <button type="button" onClick={goStep2} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af]">
                Tiếp tục <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </>
        ) : wizardStep === 2 ? (
          <>
            <div className="px-7 pb-6">
              <div className="mb-4 text-[15px] font-bold text-ink">Thông tin liên hệ</div>
              {wizardError ? <div className="mb-4 rounded-md border border-[#fca5a5] bg-[#fff1f0] px-3.5 py-2.5 text-[13px] text-[#b91c1c]">{wizardError}</div> : null}
              <div className="rounded-lg border border-[#e5e7eb] p-5">
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  <FieldGroup label="Tên viết bằng tiếng nước ngoài">
                    <input className={FORM_CONTROL_CLASS} value={form.tenNN} onChange={(e) => setField("tenNN", e.target.value)} placeholder="VD: VNA Group" />
                  </FieldGroup>
                  <FieldGroup label="Email" required>
                    <input type="email" className={FORM_CONTROL_CLASS} value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="vna@gmail.com" />
                  </FieldGroup>
                  <FieldGroup label="Số điện thoại cơ quan">
                    <input className={FORM_CONTROL_CLASS} value={form.sdt} onChange={(e) => setField("sdt", e.target.value)} placeholder="VD: 0283xxxxxxx" />
                  </FieldGroup>
                </div>
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  <FieldGroup label="Địa điểm kinh doanh">
                    <input className={FORM_CONTROL_CLASS} value={form.diaDiem} onChange={(e) => setField("diaDiem", e.target.value)} />
                  </FieldGroup>
                  <FieldGroup label="Người đứng đầu doanh nghiệp">
                    <input className={FORM_CONTROL_CLASS} value={form.nguoiDD} onChange={(e) => setField("nguoiDD", e.target.value)} />
                  </FieldGroup>
                  <FieldGroup label="SĐT người đứng đầu">
                    <input className={FORM_CONTROL_CLASS} value={form.sdtDD} onChange={(e) => setField("sdtDD", e.target.value)} />
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
                      <th className="w-24 border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FILE_ROWS.map((f) => (
                      <tr key={f.name} className="border-b border-[#f3f4f6] last:border-b-0">
                        <td className="px-3 py-2 text-[#374151]">{f.name}</td>
                        <td className="px-3 py-2 text-[#374151]">{f.info}</td>
                        <td className="px-3 py-2 text-muted">
                          <button type="button" className="mr-1 hover:text-danger">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 border-t border-[#e5e7eb] px-7 py-4">
              <button type="button" onClick={() => setWizardStep(1)} className="h-9 rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb]">Trở về</button>
              <button type="button" onClick={confirmWizard} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af]">
                Tiếp tục <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-7 pb-6">
              <div className="mb-4 text-[15px] font-bold text-ink">Xác nhận đăng ký</div>
              <div className="rounded-lg border border-[#e5e7eb] p-5">
                {reviewRows.map(([label, value]) => (
                  <div key={label} className="flex border-b border-[#f3f4f6] py-2.5 last:border-b-0">
                    <span className="w-[280px] shrink-0 text-[13.5px] font-semibold text-[#374151]">{label}</span>
                    <span className="text-[13.5px] text-ink">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2.5 border-t border-[#e5e7eb] px-7 py-4">
              <button type="button" onClick={() => setWizardStep(2)} className="h-9 rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb]">Trở về</button>
              <button type="button" onClick={confirmWizard} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                Xác nhận
              </button>
            </div>
          </>
        )}
      </div>

      {/* OTP modal */}
      <div className={`fixed inset-0 z-[400] flex items-center justify-center bg-black/50 transition-opacity duration-200 ${otpOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className={`w-[340px] rounded-[12px] bg-white px-7 py-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-transform duration-200 ${otpOpen ? "translate-y-0" : "translate-y-2.5"}`}>
          <div className="mb-2 text-[16px] font-bold text-primary">XÁC THỰC EMAIL</div>
          <p className="mb-1 text-[13px] text-muted">Chúng tôi đã gửi mã xác minh qua email</p>
          <p className="mb-4 text-[13.5px] font-bold text-ink">{form.email}</p>
          {otpError ? <Alert variant="error" message={otpError} /> : null}
          <label className="mb-1.5 block text-left text-[12.5px] font-medium text-[#374151]">OTP <span className="text-danger">*</span></label>
          <input
            className="mb-2 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-[#3b82f6]"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Nhập mã OTP"
          />
          <div className="mb-1 text-center text-sm font-bold text-primary">{countdown.formatted}</div>
          <div className="mb-4 text-[12.5px] text-muted">
            Chưa nhận được mã?{" "}
            <button type="button" onClick={() => countdown.start()} className="text-primary hover:underline">Gửi lại</button>
          </div>
          <button type="button" onClick={confirmOtp} className="mb-2 h-[42px] w-full rounded-md bg-primary text-sm font-semibold text-white hover:bg-[#1e40af]">Xác nhận</button>
          <button type="button" onClick={() => { setOtpOpen(false); countdown.stop(); }} className="text-[13px] text-muted hover:text-[#374151]">Huỷ bỏ</button>
        </div>
      </div>

      {/* Account popup */}
      {accountPopup ? (
        <>
          <div className="fixed inset-0 z-[500] bg-black/50" onClick={() => { setAccountPopup(null); router.push("/enterprise-login"); }} />
          <div className="fixed left-1/2 top-1/2 z-[501] w-[300px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="bg-primary px-5 py-3.5 text-center">
              <h3 className="text-[15px] font-bold text-white">Thông tin tài khoản</h3>
            </div>
            <div className="px-5 pb-3 pt-4">
              <p className="mb-2 text-[13.5px] text-ink">• Tài khoản: <strong>{accountPopup}</strong></p>
              <p className="mb-2 text-[13.5px] text-ink">• Mật khẩu: <strong>12345678</strong></p>
            </div>
            <div className="px-5 pb-3.5 text-right">
              <button type="button" onClick={() => { setAccountPopup(null); router.push("/enterprise-login"); }} className="text-[13px] text-muted hover:text-[#374151]">Huỷ bỏ</button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
