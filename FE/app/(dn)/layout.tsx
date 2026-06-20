"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DnSidebar } from "@/libs/tts/components/DnSidebar/DnSidebar";
import { AppTopbar } from "@/libs/tts/components/AppTopbar/AppTopbar";
import { PasswordField } from "@/libs/shared/core/components/PasswordField/PasswordField";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { getToken, clearToken, getBusinessId, changeBusinessPassword } from "@/libs/tts/auth/authApi";
import { getBusinessById } from "@/libs/tts/enterprise/enterpriseApi";
import { ApiError } from "@/libs/tts/auth/apiClient";

const PATH_ACTIVE: Record<string, string> = {
  "/enterprise-info": "Thông tin doanh nghiệp",
  "/enterprise-report": "TNLĐ theo HĐLĐ",
  "/enterprise-sign-report": "Ký báo cáo",
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function DnLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [businessName, setBusinessName] = useState("Doanh nghiệp");
  const [initials, setInitials] = useState("DN");

  // Modal đổi mật khẩu DN
  const [pwdOpen, setPwdOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdErrors, setPwdErrors] = useState<{ old?: string; new?: string; confirm?: string }>({});
  const [pwdSaving, setPwdSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  const openChangePassword = () => {
    setOldPwd(""); setNewPwd(""); setConfirmPwd(""); setPwdErrors({});
    setPwdOpen(true);
  };

  const savePassword = async () => {
    const errors: typeof pwdErrors = {};
    if (!oldPwd) errors.old = "Vui lòng nhập mật khẩu cũ";
    if (!newPwd) errors.new = "Vui lòng nhập mật khẩu mới";
    else if (newPwd.length < 6) errors.new = "Mật khẩu mới phải từ 6 ký tự";
    else if (oldPwd && newPwd === oldPwd) errors.new = "Mật khẩu mới không được trùng mật khẩu cũ";
    if (!confirmPwd) errors.confirm = "Vui lòng nhập lại mật khẩu mới";
    else if (newPwd && newPwd !== confirmPwd) errors.confirm = "Mật khẩu mới không khớp";
    if (Object.keys(errors).length > 0) { setPwdErrors(errors); return; }
    setPwdErrors({});
    setPwdSaving(true);
    try {
      await changeBusinessPassword({ oldPassword: oldPwd, newPassword: newPwd, confirmPassword: confirmPwd });
      setPwdOpen(false);
      setToast({ message: "Đổi mật khẩu thành công", variant: "success" });
      // Đổi mật khẩu thành công -> buộc đăng nhập lại (chờ kịp hiện toast).
      setTimeout(() => {
        clearToken();
        router.replace("/enterprise-login");
      }, 1000);
    } catch (err) {
      setToast({
        message: err instanceof ApiError ? err.message : "Đổi mật khẩu thất bại",
        variant: "error",
      });
    } finally {
      setPwdSaving(false);
    }
  };

  useEffect(() => {
    if (!getToken()) { router.replace("/enterprise-login"); return; }
    const bizId = getBusinessId();
    if (!bizId) { router.replace("/login"); return; }
    getBusinessById(bizId).then((detail) => {
      setBusinessName(detail.businessName);
      setInitials(getInitials(detail.businessName) || "DN");
    }).catch(() => {});
  }, [router]);

  const handleLogout = () => {
    clearToken();
    router.replace("/enterprise-login");
  };

  const toggle = () => setSidebarOpen((v) => !v);

  return (
    <div className="min-h-screen bg-body text-ink">
      <AppTopbar sidebarCollapsed={!sidebarOpen} onToggleSidebar={toggle} />
      <DnSidebar
        active={PATH_ACTIVE[pathname]}
        userName={businessName}
        initials={initials}
        onLogout={handleLogout}
        onChangePassword={openChangePassword}
        collapsed={!sidebarOpen}
        onToggle={toggle}
      />
      <main
        className={`min-h-screen transition-[margin,padding] duration-300 ${sidebarOpen ? "ml-55" : "ml-0 pt-13"}`}
      >
        {children}
      </main>

      {/* Modal đổi mật khẩu DN */}
      <div
        className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/45 transition-opacity duration-200 ${
          pwdOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`w-[420px] overflow-hidden rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
            pwdOpen ? "translate-y-0" : "translate-y-3"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
            <h3 className="text-[15px] font-bold text-ink">Đổi mật khẩu</h3>
            <button type="button" onClick={() => setPwdOpen(false)} className="text-xl leading-none text-[#9ca3af] hover:text-[#374151]" aria-label="Đóng">×</button>
          </div>
          <div className="space-y-3.5 px-5 py-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-medium text-[#374151]">Mật khẩu cũ <span className="text-danger">*</span></label>
              <PasswordField value={oldPwd} onChange={(v) => { setOldPwd(v); setPwdErrors((p) => ({ ...p, old: undefined })); }} hasError={!!pwdErrors.old} />
              {pwdErrors.old ? <p className="text-[11px] text-danger">{pwdErrors.old}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-medium text-[#374151]">Mật khẩu mới <span className="text-danger">*</span></label>
              <PasswordField value={newPwd} onChange={(v) => { setNewPwd(v); setPwdErrors((p) => ({ ...p, new: undefined })); }} hasError={!!pwdErrors.new} />
              {pwdErrors.new ? <p className="text-[11px] text-danger">{pwdErrors.new}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-medium text-[#374151]">Nhập lại mật khẩu mới <span className="text-danger">*</span></label>
              <PasswordField value={confirmPwd} onChange={(v) => { setConfirmPwd(v); setPwdErrors((p) => ({ ...p, confirm: undefined })); }} hasError={!!pwdErrors.confirm} />
              {pwdErrors.confirm ? <p className="text-[11px] text-danger">{pwdErrors.confirm}</p> : null}
            </div>
          </div>
          <div className="flex justify-end gap-2.5 border-t border-[#e5e7eb] px-5 py-3.5">
            <button type="button" onClick={() => setPwdOpen(false)} disabled={pwdSaving} className="h-9 rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50">Hủy bỏ</button>
            <button type="button" onClick={savePassword} disabled={pwdSaving} className="h-9 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60">{pwdSaving ? "Đang lưu..." : "Đổi mật khẩu"}</button>
          </div>
        </div>
      </div>

      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant}
        onDone={() => setToast(null)}
      />
    </div>
  );
}
