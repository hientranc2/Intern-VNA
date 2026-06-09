"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/libs/tts/components/AppSidebar/AppSidebar";
import { AppTopbar } from "@/libs/tts/components/AppTopbar/AppTopbar";
import { getToken, clearToken, changePassword, ApiError } from "@/libs/tts/auth/authApi";
import { SidebarOverrideContext, type SidebarOverride } from "@/libs/tts/auth/sidebarContext";
import { Modal } from "@/libs/core/components/Modal/Modal";
import { PasswordField } from "@/libs/core/components/PasswordField/PasswordField";
import { Alert } from "@/libs/core/components/Alert/Alert";

const PATH_ACTIVE: Record<string, string> = {
  "/permission": "Phân quyền",
  "/role": "Vai trò",
  "/user": "Tài khoản",
  "/enterprise-type": "Loại hình doanh nghiệp",
  "/business-sector": "Ngành nghề kinh doanh",
  "/enterprise": "Quản lý doanh nghiệp",
  "/sign-report": "Ký báo cáo",
  "/report-config": "Ký báo cáo",
  "/category": "Danh mục chung",
  "/accident-report": "TNLĐ theo HĐLĐ",
};

export default function SoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarOverride, setSidebarOverride] = useState<SidebarOverride>({});

  const [pwdOpen, setPwdOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };

  const openChangePwd = () => {
    setOldPwd("");
    setNewPwd("");
    setConfirmPwd("");
    setPwdError(null);
    setPwdOpen(true);
  };

  const savePassword = async () => {
    if (!oldPwd || !newPwd || !confirmPwd) {
      setPwdError("Vui lòng điền đầy đủ thông tin");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("Mật khẩu mới không khớp");
      return;
    }
    try {
      await changePassword({ oldPassword: oldPwd, newPassword: newPwd, confirmPassword: confirmPwd });
      setPwdOpen(false);
    } catch (err) {
      setPwdError(err instanceof ApiError ? err.message : "Đổi mật khẩu thất bại");
    }
  };

  const toggle = () => setSidebarOpen((v) => !v);

  return (
    <SidebarOverrideContext.Provider value={{ override: sidebarOverride, setOverride: setSidebarOverride }}>
      <div className="min-h-screen bg-body text-ink">
        <AppSidebar
          active={PATH_ACTIVE[pathname]}
          collapsed={!sidebarOpen}
          onToggle={toggle}
          onChangePassword={openChangePwd}
          onLogout={handleLogout}
          {...sidebarOverride}
        />
        <AppTopbar sidebarCollapsed={!sidebarOpen} onToggleSidebar={toggle} />
        <main className={`min-h-screen transition-[margin,padding] duration-300 ${sidebarOpen ? "ml-55" : "ml-0 pt-13"}`}>
          {children}
        </main>
      </div>

      <Modal
        open={pwdOpen}
        title="Đổi mật khẩu"
        onClose={() => setPwdOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPwdOpen(false)}
              className="h-9.5 rounded-md px-5 text-sm font-medium text-muted hover:bg-[#f9fafb] hover:text-[#374151]"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={savePassword}
              className="h-9.5 rounded-md bg-primary px-6 text-sm font-semibold text-white hover:bg-[#1e40af]"
            >
              Lưu
            </button>
          </div>
        }
      >
        {pwdError ? <Alert variant="error" message={pwdError} /> : null}
        <div className="mb-4">
          <label className="mb-1.5 block text-[12.5px] text-[#374151]">
            Mật khẩu cũ <span className="text-danger">*</span>
          </label>
          <PasswordField value={oldPwd} onChange={setOldPwd} placeholder="Mật khẩu cũ" />
        </div>
        <div className="mb-4">
          <label className="mb-1.5 block text-[12.5px] text-[#374151]">
            Mật khẩu mới <span className="text-danger">*</span>
          </label>
          <PasswordField value={newPwd} onChange={setNewPwd} placeholder="Mật khẩu mới" autoComplete="new-password" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] text-[#374151]">
            Nhập lại mật khẩu mới <span className="text-danger">*</span>
          </label>
          <PasswordField value={confirmPwd} onChange={setConfirmPwd} placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" />
        </div>
      </Modal>
    </SidebarOverrideContext.Provider>
  );
}
