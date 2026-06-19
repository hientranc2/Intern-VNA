"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/libs/tts/components/AppSidebar/AppSidebar";
import { AppTopbar } from "@/libs/tts/components/AppTopbar/AppTopbar";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import {
  getToken,
  clearToken,
  getProfile,
  getBusinessId,
  getPermissions,
  setPermissions,
  setIsSuper,
  changePassword,
  ApiError,
} from "@/libs/tts/auth/authApi";
import { AbilityContext } from "@/libs/tts/auth/abilityContext";
import {
  defineAbilityFor,
  SUBJECT_BY_PATH,
  type AppAbility,
} from "@/libs/tts/auth/ability";

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

import { Modal } from "@/libs/shared/core/components/Modal/Modal";
import { PasswordField } from "@/libs/shared/core/components/PasswordField/PasswordField";

const PATH_ACTIVE: Record<string, string> = {
  "/permission": "Phân quyền",
  "/role": "Vai trò",
  "/user": "Quản lý người dùng",
  "/enterprise-type": "Loại hình doanh nghiệp",
  "/business-sector": "Ngành nghề kinh doanh",
  "/enterprise": "Quản lý doanh nghiệp",
  "/enterprise/create": "Quản lý doanh nghiệp",
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
  const [ability, setAbility] = useState<AppAbility>(() =>
    defineAbilityFor([]),
  );
  const [permsReady, setPermsReady] = useState(false);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdFieldErrors, setPwdFieldErrors] = useState<{
    oldPwd?: string;
    newPwd?: string;
    confirmPwd?: string;
  }>({});
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (getBusinessId()) {
      router.replace("/enterprise-info");
      return;
    }
    // Dựng ability ngay từ quyền đã lưu (tránh chớp menu), rồi làm mới từ profile.
    // localStorage chỉ có ở client nên phải đồng bộ trong effect (không dùng lazy
    // init để tránh hydration mismatch giữa server [] và client [quyền]).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAbility(defineAbilityFor(getPermissions()));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermsReady(true);
    getProfile()
      .then((p) => {
        setSidebarOverride({
          userName: p.fullName || p.username,
          initials: getInitials(p.fullName || p.username),
          avatarUrl: p.avatarUrl,
        });
        const perms = p.permissions ?? [];
        setPermissions(perms);
        setIsSuper(p.isSuper ?? false);
        setAbility(defineAbilityFor(perms));
      })
      .catch(() => {});
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
    else if (oldPwd && newPwd === oldPwd)
      errors.newPwd = "Mật khẩu mới không được trùng với mật khẩu cũ";
    if (!confirmPwd) errors.confirmPwd = "Vui lòng nhập lại mật khẩu mới";
    else if (newPwd && newPwd !== confirmPwd)
      errors.confirmPwd = "Mật khẩu mới không khớp";
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
      setToast({ message: "Đổi mật khẩu thành công", variant: "success" });
      // Đổi mật khẩu thành công → vô hiệu phiên cũ, tự đăng xuất sau khi kịp hiện toast.
      setTimeout(() => {
        clearToken();
        router.replace("/login");
      }, 1000);
    } catch (err) {
      setToast({
        message:
          err instanceof ApiError ? err.message : "Đổi mật khẩu thất bại",
        variant: "error",
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
            <PasswordField
              label="Mật khẩu cũ"
              value={oldPwd}
              onChange={(v) => {
                setOldPwd(v);
                if (pwdFieldErrors.oldPwd)
                  setPwdFieldErrors((p) => ({ ...p, oldPwd: undefined }));
              }}
              hasError={!!pwdFieldErrors.oldPwd}
              helperText={pwdFieldErrors.oldPwd}
              required
            />
          </div>
          <div className="mb-4">
            <PasswordField
              label="Mật khẩu mới"
              value={newPwd}
              onChange={(v) => {
                setNewPwd(v);
                if (pwdFieldErrors.newPwd)
                  setPwdFieldErrors((p) => ({ ...p, newPwd: undefined }));
              }}
              autoComplete="new-password"
              hasError={!!pwdFieldErrors.newPwd}
              helperText={pwdFieldErrors.newPwd}
              required
            />
          </div>
          <div>
            <PasswordField
              label="Nhập lại mật khẩu mới"
              value={confirmPwd}
              onChange={(v) => {
                setConfirmPwd(v);
                if (pwdFieldErrors.confirmPwd)
                  setPwdFieldErrors((p) => ({ ...p, confirmPwd: undefined }));
              }}
              autoComplete="new-password"
              hasError={!!pwdFieldErrors.confirmPwd}
              helperText={pwdFieldErrors.confirmPwd}
              required
            />
          </div>
        </Modal>

        <Toast
          message={toast?.message ?? null}
          variant={toast?.variant}
          onDone={() => setToast(null)}
        />
      </SidebarOverrideContext.Provider>
    </AbilityContext.Provider>
  );
}
