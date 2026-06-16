"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/libs/tts/components/AppSidebar/AppSidebar";
import { AppTopbar } from "@/libs/tts/components/AppTopbar/AppTopbar";
import {
  getToken,
  clearToken,
  getProfile,
  getBusinessId,
  getPermissions,
  setPermissions,
  changePassword,
  ApiError,
} from "@/libs/tts/auth/authApi";
import { AbilityContext } from "@/libs/tts/auth/abilityContext";
import { defineAbilityFor, SUBJECT_BY_PATH, type AppAbility } from "@/libs/tts/auth/ability";

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
import {
  SidebarOverrideContext,
  type SidebarOverride,
} from "@/libs/tts/auth/sidebarContext";
import { FormHelperText } from "@mui/material";
import { Modal } from "@/libs/shared/core/components/Modal/Modal";
import { PasswordField } from "@/libs/shared/core/components/PasswordField/PasswordField";

const PATH_ACTIVE: Record<string, string> = {
  "/permission": "Phân quyền",
  "/role": "Vai trò",
  "/user": "Quản lý người dùng",
  "/enterprise-type": "Loại hình doanh nghiệp",
  "/business-sector": "Ngành nghề kinh doanh",
  "/enterprise": "Quản lý doanh nghiệp",
  "/sign-report": "Ký báo cáo",
  "/report-config": "Cấu hình báo cáo",
  "/category": "Danh mục chung",
  "/accident-report": "TNLĐ theo HĐLĐ",
};

export default function SoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarOverride, setSidebarOverride] = useState<SidebarOverride>({});
  const [ability, setAbility] = useState<AppAbility>(() => defineAbilityFor([]));
  const [permsReady, setPermsReady] = useState(false);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdFieldErrors, setPwdFieldErrors] = useState<{ oldPwd?: string; newPwd?: string; confirmPwd?: string; api?: string }>({});

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    if (getBusinessId()) { router.replace("/enterprise-info"); return; }
    // Dựng ability ngay từ quyền đã lưu (tránh chớp menu), rồi làm mới từ profile.
    // localStorage chỉ có ở client nên phải đồng bộ trong effect (không dùng lazy
    // init để tránh hydration mismatch giữa server [] và client [quyền]).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAbility(defineAbilityFor(getPermissions()));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermsReady(true);
    getProfile().then((p) => {
      setSidebarOverride({
        userName: p.fullName || p.username,
        initials: getInitials(p.fullName || p.username),
        avatarUrl: p.avatarUrl,
      });
      const perms = p.permissions ?? [];
      setPermissions(perms);
      setAbility(defineAbilityFor(perms));
    }).catch(() => {});
  }, [router]);

  // Chặn truy cập trực tiếp bằng URL khi không có quyền "view" trang đó.
  useEffect(() => {
    if (!permsReady) return;
    const subject = SUBJECT_BY_PATH[pathname];
    if (subject && !ability.can("view", subject)) router.replace("/account");
  }, [permsReady, ability, pathname, router]);

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };

  const openChangePwd = () => {
    setOldPwd("");
    setNewPwd("");
    setConfirmPwd("");
    setPwdFieldErrors({});
    setPwdOpen(true);
  };

  const savePassword = async () => {
    const errors: typeof pwdFieldErrors = {};
    if (!oldPwd) errors.oldPwd = "Vui lòng nhập mật khẩu cũ";
    if (!newPwd) errors.newPwd = "Vui lòng nhập mật khẩu mới";
    else if (oldPwd && newPwd === oldPwd) errors.newPwd = "Mật khẩu mới không được trùng với mật khẩu cũ";
    if (!confirmPwd) errors.confirmPwd = "Vui lòng nhập lại mật khẩu mới";
    else if (newPwd && newPwd !== confirmPwd) errors.confirmPwd = "Mật khẩu mới không khớp";
    if (Object.keys(errors).length > 0) {
      setPwdFieldErrors(errors);
      return;
    }
    setPwdFieldErrors({});
    try {
      await changePassword({
        oldPassword: oldPwd,
        newPassword: newPwd,
        confirmPassword: confirmPwd,
      });
      setPwdOpen(false);
      clearToken();
      router.replace("/login");
    } catch (err) {
      setPwdFieldErrors({
        api: err instanceof ApiError ? err.message : "Đổi mật khẩu thất bại",
      });
    }
  };

  const toggle = () => setSidebarOpen((v) => !v);

  return (
    <AbilityContext.Provider value={ability}>
    <SidebarOverrideContext.Provider
      value={{ override: sidebarOverride, setOverride: setSidebarOverride }}
    >
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
        <main
          className={`min-h-screen transition-[margin,padding] duration-300 ${sidebarOpen ? "ml-55" : "ml-0 pt-13"}`}
        >
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
        <div className="mb-4">
          <label className="mb-1.5 block text-[12.5px] text-[#374151]">
            Mật khẩu cũ <span className="text-danger">*</span>
          </label>
          <PasswordField
            value={oldPwd}
            onChange={(v) => { setOldPwd(v); if (pwdFieldErrors.oldPwd) setPwdFieldErrors((p) => ({ ...p, oldPwd: undefined })); }}
            placeholder="Mật khẩu cũ"
            hasError={!!pwdFieldErrors.oldPwd}
          />
          {pwdFieldErrors.oldPwd && (
            <FormHelperText error sx={{ mt: 0.5, mx: 0, fontSize: "11px" }}>{pwdFieldErrors.oldPwd}</FormHelperText>
          )}
        </div>
        <div className="mb-4">
          <label className="mb-1.5 block text-[12.5px] text-[#374151]">
            Mật khẩu mới <span className="text-danger">*</span>
          </label>
          <PasswordField
            value={newPwd}
            onChange={(v) => { setNewPwd(v); if (pwdFieldErrors.newPwd) setPwdFieldErrors((p) => ({ ...p, newPwd: undefined })); }}
            placeholder="Mật khẩu mới"
            autoComplete="new-password"
            hasError={!!pwdFieldErrors.newPwd}
          />
          {pwdFieldErrors.newPwd && (
            <FormHelperText error sx={{ mt: 0.5, mx: 0, fontSize: "11px" }}>{pwdFieldErrors.newPwd}</FormHelperText>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] text-[#374151]">
            Nhập lại mật khẩu mới <span className="text-danger">*</span>
          </label>
          <PasswordField
            value={confirmPwd}
            onChange={(v) => { setConfirmPwd(v); if (pwdFieldErrors.confirmPwd) setPwdFieldErrors((p) => ({ ...p, confirmPwd: undefined })); }}
            placeholder="Nhập lại mật khẩu mới"
            autoComplete="new-password"
            hasError={!!pwdFieldErrors.confirmPwd}
          />
          {pwdFieldErrors.confirmPwd && (
            <FormHelperText error sx={{ mt: 0.5, mx: 0, fontSize: "11px" }}>{pwdFieldErrors.confirmPwd}</FormHelperText>
          )}
          {pwdFieldErrors.api && (
            <FormHelperText error sx={{ mt: 1, mx: 0, fontSize: "11px" }}>{pwdFieldErrors.api}</FormHelperText>
          )}
        </div>
      </Modal>
    </SidebarOverrideContext.Provider>
    </AbilityContext.Provider>
  );
}
