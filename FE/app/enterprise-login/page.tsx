"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/libs/shared/core/components/AuthShell/AuthShell";
import { GovSeal } from "@/libs/shared/core/components/GovSeal/GovSeal";
import { Alert } from "@/libs/shared/core/components/Alert/Alert";
import { PasswordField } from "@/libs/shared/core/components/PasswordField/PasswordField";
import { loginBusiness, setToken, setBusinessId, ApiError } from "@/libs/tts/auth/authApi";

export default function EnterpriseLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    const user = username.trim();
    const pass = password.trim();
    if (!user || !pass) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await loginBusiness({ username: user, password: pass, rememberMe });
      setToken(res.accessToken);
      setBusinessId(res.account.businessId);
      router.push("/enterprise-info");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Tài khoản hoặc mật khẩu không đúng. Xin vui lòng thử lại",
      );
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
      <div className="mb-3.5 w-full text-[13px] font-bold uppercase tracking-widest text-primary">
        Đăng nhập
      </div>

      {error ? (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      ) : null}

      <div className="mb-3.5 w-full">
        <label className="mb-1 block text-xs text-muted" htmlFor="dn-username">
          Tên đăng nhập *
        </label>
        <input
          id="dn-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          autoComplete="username"
          className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
        />
      </div>
      <div className="mb-3.5 w-full">
        <label className="mb-1 block text-xs text-muted" htmlFor="dn-password">
          Mật khẩu *
        </label>
        <PasswordField
          id="dn-password"
          value={password}
          onChange={setPassword}
        />
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
        className="mb-3 h-[44px] w-full rounded-md bg-primary text-[14.5px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
      <button
        type="button"
        onClick={() => router.push("/enterprise-register")}
        className="h-[44px] w-full rounded-md border border-line bg-white text-[14px] font-medium text-[#374151] hover:bg-[#f9fafb]"
      >
        Đăng ký tài khoản doanh nghiệp
      </button>
    </AuthShell>
  );
}
