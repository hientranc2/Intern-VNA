"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormHelperText } from "@mui/material";
import { GovSeal } from "@/libs/shared/core/components/GovSeal/GovSeal";
import { AuthShell } from "@/libs/shared/core/components/AuthShell/AuthShell";
import { PasswordField } from "@/libs/shared/core/components/PasswordField/PasswordField";
import { Alert } from "@/libs/shared/core/components/Alert/Alert";
import { login, loginBusiness, setToken, setBusinessId, setPermissions, setIsSuper, getToken, getBusinessId, markLoginSuccess, consumeAccountLocked, ApiError } from "@/libs/tts/auth/authApi";

type FieldErrors = { username?: string; password?: string };

const isEnterpriseUsername = (username: string) => /^\d+$/.test(username);

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    if (getBusinessId()) router.replace("/enterprise-info");
    else router.replace("/account");
  }, [router]);

  // Hiện popup nếu vừa bị đá ra do tài khoản bị khóa giữa phiên.
  useEffect(() => {
    const msg = consumeAccountLocked();
    if (msg) setLockedMessage(msg);
  }, []);

  const handleLogin = async () => {
    if (loading) return;
    const user = username.trim();
    const pass = password.trim();
    const errors: FieldErrors = {};
    if (!user) errors.username = "Vui lòng nhập tên đăng nhập";
    if (!pass) errors.password = "Vui lòng nhập mật khẩu";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setApiError(null);
    setLoading(true);
    try {
      if (isEnterpriseUsername(user)) {
        const res = await loginBusiness({ username: user, password: pass, rememberMe });
        setToken(res.accessToken);
        setBusinessId(res.account.businessId);
        markLoginSuccess();
        router.push("/enterprise-info");
      } else {
        const res = await login({ username: user, password: pass, rememberMe });
        setToken(res.accessToken);
        setPermissions(res.user.permissions ?? []);
        setIsSuper(res.user.isSuper ?? false);
        markLoginSuccess();
        router.push("/account");
      }
    } catch (err) {
      setApiError(
        err instanceof ApiError ? err.message : "Đã có lỗi xảy ra. Vui lòng thử lại.",
      );
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <AuthShell>
      <GovSeal size={72} className="mb-4" />

      <h1 className="mb-7 text-center text-[15px] font-bold leading-relaxed text-dark">
        Phần Mềm Quản Lý - Tạo Lập Cơ Sở Dữ Liệu
        <br />
        An Toàn Vệ Sinh Lao Động
      </h1>

      <div className="mb-3.5 w-full text-[13px] font-semibold tracking-wide text-[#374151]">
        ĐĂNG NHẬP
      </div>

      {apiError ? (
        <Alert variant="error" message={apiError} onClose={() => setApiError(null)} />
      ) : null}

      <div className="mb-3.5 w-full">
        <label className="mb-1 block text-xs text-muted" htmlFor="username">
          Tên đăng nhập *
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (fieldErrors.username)
              setFieldErrors((p) => ({ ...p, username: undefined }));
          }}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          autoComplete="username"
          className={`h-10 w-full rounded-md border bg-white px-3 text-sm text-ink outline-none transition-colors ${
            fieldErrors.username
              ? "border-danger"
              : "border-line focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
          }`}
        />
        {fieldErrors.username && (
          <FormHelperText error sx={{ mt: 0.5, mx: 0, fontSize: "11px" }}>
            {fieldErrors.username}
          </FormHelperText>
        )}
      </div>

      <div className="mb-3.5 w-full">
        <label className="mb-1 block text-xs text-muted" htmlFor="password">
          Mật khẩu *
        </label>
        <PasswordField
          id="password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            if (fieldErrors.password)
              setFieldErrors((p) => ({ ...p, password: undefined }));
          }}
          hasError={!!fieldErrors.password}
        />
        {fieldErrors.password && (
          <FormHelperText error sx={{ mt: 0.5, mx: 0, fontSize: "11px" }}>
            {fieldErrors.password}
          </FormHelperText>
        )}
      </div>

      <div className="mb-5 flex w-full items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#374151]">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-primary"
          />
          Nhớ đăng nhập
        </label>
        <a
          href="/forgot-password"
          className="text-[13px] font-medium text-primary hover:underline"
        >
          Quên mật khẩu
        </a>
      </div>

      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="mb-4 h-[42px] w-full rounded-md bg-primary text-[15px] font-semibold text-white transition-colors hover:bg-[#1e40af] active:bg-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>

      <a
        href="/enterprise-register"
        className="block text-center text-[13px] text-muted hover:text-[#374151]"
      >
        Đăng ký tài khoản doanh nghiệp
      </a>
    </AuthShell>

    {/* Popup khi tài khoản bị khóa giữa phiên */}
    {lockedMessage ? (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 px-4">
        <div className="w-[360px] max-w-full overflow-hidden rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <div className="bg-danger px-5 py-4 text-center">
            <h3 className="text-base font-semibold text-white">Tài khoản bị khóa</h3>
          </div>
          <div className="px-6 py-5 text-center text-[13.5px] text-[#374151]">{lockedMessage}</div>
          <div className="flex justify-center px-6 pb-5">
            <button
              type="button"
              onClick={() => setLockedMessage(null)}
              className="h-[38px] rounded-md bg-primary px-6 text-sm font-semibold text-white hover:bg-[#1e40af]"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
