"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GovSeal } from "@/libs/shared/core/components/GovSeal/GovSeal";
import { AuthShell } from "@/libs/shared/core/components/AuthShell/AuthShell";
import { Alert } from "@/libs/shared/core/components/Alert/Alert";
import { PasswordField } from "@/libs/shared/core/components/PasswordField/PasswordField";
import { useCountdown } from "@/libs/shared/core/hooks/useCountdown";
import { isValidEmail } from "@/libs/tts/auth/authValidation";
import {
  forgotPassword,
  resetPassword,
  ApiError,
} from "@/libs/tts/auth/authApi";

type Step = 1 | 2;
type Notice = { variant: "error" | "success"; message: string } | null;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const countdown = useCountdown(300);

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const sendEmail = async () => {
    if (loading) return;
    const value = email.trim();
    if (!value) {
      setEmailError(true);
      setNotice({ variant: "error", message: "Vui lòng nhập đầy đủ thông tin" });
      return;
    }
    if (!isValidEmail(value)) {
      setEmailError(true);
      setNotice({
        variant: "error",
        message: "Vui lòng nhập đúng định dạng email. Định dạng đúng ... @...",
      });
      return;
    }
    setEmailError(false);
    setLoading(true);
    try {
      await forgotPassword(value);
      setNotice({ variant: "success", message: "Gửi email thành công" });
      window.setTimeout(() => {
        setStep(2);
        countdown.start();
      }, 1000);
    } catch (err) {
      setNotice({
        variant: "error",
        message: err instanceof ApiError ? err.message : "Gửi email thất bại",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    if (loading) return;
    if (!otp.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setNotice({ variant: "error", message: "Vui lòng nhập đầy đủ thông tin" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice({ variant: "error", message: "Mật khẩu xác nhận không khớp" });
      return;
    }
    setLoading(true);
    try {
      await resetPassword({
        email: email.trim(),
        otpCode: otp.trim(),
        newPassword,
      });
      countdown.stop();
      router.push("/login");
    } catch (err) {
      setNotice({
        variant: "error",
        message:
          err instanceof ApiError ? err.message : "Đặt lại mật khẩu thất bại",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <GovSeal size={68} className="mb-3" />

      <h1 className="mb-2.5 text-center text-[15px] font-bold uppercase tracking-wide text-dark">
        Quên mật khẩu
      </h1>

      {step === 1 ? (
        <>
          <p className="mb-5 text-center text-[13px] leading-relaxed text-muted">
            Vui lòng nhập email để đăng ký tài khoản
          </p>

          {notice ? (
            <Alert
              variant={notice.variant}
              message={notice.message}
              onClose={() => setNotice(null)}
            />
          ) : null}

          <div className="mb-3.5 w-full">
            <label className="mb-1 block text-xs text-muted" htmlFor="email">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Phanthanhtung093@gmail.com"
              className={`h-10 w-full rounded-md border bg-white px-3 text-sm text-ink outline-none transition-colors ${
                emailError
                  ? "border-danger"
                  : "border-line focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              }`}
            />
          </div>

          <button
            type="button"
            onClick={sendEmail}
            disabled={loading}
            className="mb-3.5 h-[42px] w-full rounded-md bg-primary text-[15px] font-semibold text-white transition-colors hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Đang gửi..." : "Gửi xác thực"}
          </button>

          <p className="text-center text-[13px] text-muted">
            Bạn đã có tài khoản?{" "}
            <a href="/login" className="font-medium text-primary hover:underline">
              Đăng nhập
            </a>
          </p>
        </>
      ) : (
        <>
          <p className="mb-5 text-center text-[13px] leading-relaxed text-muted">
            Chúng tôi đã gửi mã xác minh qua email
            <br />
            <strong className="text-ink">{email}</strong>
            <br />
            Bạn vui lòng kiểm tra và điền mã xác thực
          </p>

          {notice ? (
            <Alert
              variant={notice.variant}
              message={notice.message}
              onClose={() => setNotice(null)}
            />
          ) : null}

          <div className="mb-3.5 w-full">
            <label className="mb-1 block text-xs text-muted" htmlFor="otp">
              OTP *
            </label>
            <input
              id="otp"
              type="text"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              placeholder="Nhập mã OTP"
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
            />
          </div>

          <div className="mb-3.5 w-full">
            <label className="mb-1 block text-xs text-muted">Mật khẩu mới *</label>
            <PasswordField
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Nhập mật khẩu mới"
              autoComplete="new-password"
            />
          </div>

          <div className="mb-3.5 w-full">
            <label className="mb-1 block text-xs text-muted">
              Nhập lại mật khẩu mới *
            </label>
            <PasswordField
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Xác nhận mật khẩu mới"
              autoComplete="new-password"
            />
          </div>

          <div className="mb-1.5 text-center text-[15px] font-bold text-primary">
            {countdown.formatted}
          </div>
          <div className="mb-3.5 text-center text-[13px] text-muted">
            <button
              type="button"
              onClick={async () => {
                try {
                  await forgotPassword(email.trim());
                  countdown.start();
                  setNotice({ variant: "success", message: "Đã gửi lại mã OTP" });
                } catch (err) {
                  setNotice({
                    variant: "error",
                    message:
                      err instanceof ApiError ? err.message : "Gửi lại thất bại",
                  });
                }
              }}
              className="font-medium text-primary hover:underline"
            >
              Chưa nhận được mã? Gửi lại
            </button>
          </div>

          <button
            type="button"
            onClick={submitReset}
            disabled={loading}
            className="mb-3.5 h-[42px] w-full rounded-md bg-primary text-[15px] font-semibold text-white transition-colors hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Đang xử lý..." : "Khôi phục mật khẩu"}
          </button>

          <p className="text-center text-[13px] text-muted">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="font-medium text-primary hover:underline"
            >
              ← Quay lại
            </button>
            <span className="px-2">|</span>
            <a href="/login" className="font-medium text-primary hover:underline">
              Đăng nhập
            </a>
          </p>
        </>
      )}
    </AuthShell>
  );
}
