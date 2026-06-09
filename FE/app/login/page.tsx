"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GovSeal } from "@/libs/core/components/GovSeal/GovSeal";
import { AuthShell } from "@/libs/core/components/AuthShell/AuthShell";
import { Alert } from "@/libs/core/components/Alert/Alert";
import { PasswordField } from "@/libs/core/components/PasswordField/PasswordField";
import { type LoginField } from "@/libs/tts/auth/authValidation";
import { login, setToken, getToken, ApiError } from "@/libs/tts/auth/authApi";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<LoginField>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/account");
  }, [router]);

  const handleLogin = async () => {
    if (loading) return;

    const user = username.trim();
    const pass = password.trim();
    if (!user) {
      setError("Vui lòng nhập đầy đủ thông tin");
      setErrorField("username");
      return;
    }
    if (!pass) {
      setError("Vui lòng nhập đầy đủ thông tin");
      setErrorField("password");
      return;
    }

    setError(null);
    setErrorField(null);
    setLoading(true);
    try {
      const res = await login({ username: user, password: pass, rememberMe });
      setToken(res.accessToken);
      router.push("/account");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Đã có lỗi xảy ra. Vui lòng thử lại.";
      setError(message);
      setErrorField(null);
    } finally {
      setLoading(false);
    }
  };

  const usernameError = errorField === "username";

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

      {error ? (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      ) : null}

      <div className="mb-3.5 w-full">
        <label className="mb-1 block text-xs text-muted" htmlFor="username">
          Tên đăng nhập *
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && handleLogin()}
          placeholder="nguyenvan3.sts"
          autoComplete="username"
          className={`h-10 w-full rounded-md border bg-white px-3 text-sm text-ink outline-none transition-colors ${
            usernameError
              ? "border-danger"
              : "border-line focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
          }`}
        />
      </div>

      <div className="mb-3.5 w-full">
        <label className="mb-1 block text-xs text-muted" htmlFor="password">
          Mật khẩu *
        </label>
        <PasswordField
          id="password"
          value={password}
          onChange={setPassword}
          hasError={errorField === "password"}
        />
      </div>

      <div className="mb-5 flex w-full items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#374151]">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
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

      <p className="text-center text-[13px] text-muted">
        <a
          href="/enterprise-register"
          className="font-medium text-primary hover:underline"
        >
          Đăng ký tài khoản doanh nghiệp
        </a>
      </p>
    </AuthShell>
  );
}
