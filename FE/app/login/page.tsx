"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormHelperText } from "@mui/material";
import { GovSeal } from "@/libs/shared/core/components/GovSeal/GovSeal";
import { AuthShell } from "@/libs/shared/core/components/AuthShell/AuthShell";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { PasswordField } from "@/libs/shared/core/components/PasswordField/PasswordField";
import { login, loginBusiness, setToken, setBusinessId, getToken, ApiError } from "@/libs/tts/auth/authApi";

type FieldErrors = { username?: string; password?: string };

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/account");
  }, [router]);

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
      // Thử đăng nhập tài khoản Sở trước
      try {
        const res = await login({ username: user, password: pass, rememberMe });
        setToken(res.accessToken);
        router.push("/account");
        return;
      } catch (soErr) {
        // Nếu tài khoản Sở bị khóa, dừng lại ngay — không thử tiếp
        if (soErr instanceof ApiError && soErr.message.includes("vô hiệu hóa")) {
          setApiError(soErr.message);
          setPassword("");
          return;
        }
        // Sai mật khẩu / không tồn tại → thử tiếp với tài khoản doanh nghiệp
      }

      // Fallback: thử đăng nhập tài khoản doanh nghiệp
      const bizRes = await loginBusiness({ username: user, password: pass, rememberMe });
      setToken(bizRes.accessToken);
      setBusinessId(bizRes.account.businessId);
      router.push("/enterprise-info");
    } catch (err) {
      setApiError(
        err instanceof ApiError
          ? err.message
          : "Đã có lỗi xảy ra. Vui lòng thử lại.",
      );
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
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

      <div className="flex flex-col items-center gap-2">
        <a href="/enterprise-login" className="text-[13px] font-medium text-primary hover:underline">
          Đăng nhập tài khoản doanh nghiệp
        </a>
        <a href="/enterprise-register" className="text-[13px] text-muted hover:text-[#374151]">
          Đăng ký tài khoản doanh nghiệp
        </a>
      </div>

      <Toast
        message={apiError}
        variant="error"
        onDone={() => setApiError(null)}
      />
    </AuthShell>
  );
}
