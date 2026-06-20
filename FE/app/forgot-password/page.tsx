"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GovSeal } from "@/libs/shared/core/components/GovSeal/GovSeal";
import { AuthShell } from "@/libs/shared/core/components/AuthShell/AuthShell";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { PasswordField } from "@/libs/shared/core/components/PasswordField/PasswordField";
import { TextField } from "@mui/material";
import { useCountdown } from "@/libs/shared/core/hooks/useCountdown";
import { isValidEmail } from "@/libs/tts/auth/authValidation";
import {
  forgotPassword,
  resetPassword,
  ApiError,
} from "@/libs/tts/auth/authApi";

type Step = 1 | 2;
type ToastState = { variant: "success" | "error"; message: string } | null;



export default function ForgotPasswordPage() {
  const router = useRouter();
  const countdown = useCountdown(300);

  const [step, setStep] = useState<Step>(1);
  const [toast, setToast] = useState<ToastState>(null);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpError, setOtpError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const sendEmail = async () => {
    if (loading) return;
    const value = email.trim();
    if (!value) {
      setEmailError("Vui lòng nhập email");
      return;
    }
    if (!isValidEmail(value)) {
      setEmailError("Email không đúng định dạng");
      return;
    }
    setEmailError("");
    setLoading(true);
    try {
      await forgotPassword(value);
      setToast({ variant: "success", message: "Gửi email thành công" });
      window.setTimeout(() => {
        setStep(2);
        countdown.start();
      }, 1000);
    } catch (err) {
      setToast({
        variant: "error",
        message: err instanceof ApiError ? err.message : "Gửi email thất bại",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    if (loading) return;
    const errors = { otp: "", newPassword: "", confirmPassword: "" };
    if (!otp.trim()) errors.otp = "Vui lòng nhập mã OTP";
    if (!newPassword.trim()) errors.newPassword = "Vui lòng nhập mật khẩu mới";
    if (!confirmPassword.trim())
      errors.confirmPassword = "Vui lòng nhập lại mật khẩu mới";
    if (!errors.confirmPassword && newPassword !== confirmPassword)
      errors.confirmPassword = "Mật khẩu xác nhận không khớp";

    setOtpError(errors.otp);
    setNewPasswordError(errors.newPassword);
    setConfirmPasswordError(errors.confirmPassword);
    if (errors.otp || errors.newPassword || errors.confirmPassword) return;

    setLoading(true);
    try {
      await resetPassword({
        email: email.trim(),
        otpCode: otp.trim(),
        newPassword,
      });
      countdown.stop();
      setToast({ variant: "success", message: "Đặt lại mật khẩu thành công" });
      window.setTimeout(() => router.push("/login"), 1000);
    } catch (err) {
      setToast({
        variant: "error",
        message:
          err instanceof ApiError ? err.message : "Đặt lại mật khẩu thất bại",
      });
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown.seconds > 0) return;
    try {
      await forgotPassword(email.trim());
      countdown.start();
      setToast({ variant: "success", message: "Đã gửi lại mã OTP" });
    } catch (err) {
      setToast({
        variant: "error",
        message: err instanceof ApiError ? err.message : "Gửi lại thất bại",
      });
    }
  };

  return (
    <>
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

            <div className="mb-3.5 w-full">
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailError) setEmailError("");
                }}
                error={!!emailError}
                helperText={emailError}
                size="small"
                fullWidth
                required
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

            <div className="mb-3.5 w-full">
              <TextField
                label="OTP"
                value={otp}
                onChange={(event) => {
                  setOtp(event.target.value);
                  if (otpError) setOtpError("");
                }}
                error={!!otpError}
                helperText={otpError}
                size="small"
                fullWidth
                required
                slotProps={{ htmlInput: { maxLength: 6 } }}
              />
            </div>

            <div className="mb-3.5 w-full">
              <PasswordField
                label="Mật khẩu mới"
                value={newPassword}
                onChange={(v) => {
                  setNewPassword(v);
                  if (newPasswordError) setNewPasswordError("");
                }}
                autoComplete="new-password"
                hasError={!!newPasswordError}
                helperText={newPasswordError}
                required
              />
            </div>

            <div className="mb-3.5 w-full">
              <PasswordField
                label="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(v) => {
                  setConfirmPassword(v);
                  if (confirmPasswordError) setConfirmPasswordError("");
                }}
                autoComplete="new-password"
                hasError={!!confirmPasswordError}
                helperText={confirmPasswordError}
                required
              />
            </div>

            <div className="mb-1.5 text-center text-[15px] font-bold text-primary">
              {countdown.formatted}
            </div>
            <div className="mb-3.5 text-center text-[13px] text-muted">
              <button
                type="button"
                disabled={countdown.seconds > 0}
                onClick={resendOtp}
                className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
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

      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant ?? "success"}
        onDone={() => setToast(null)}
      />
    </>
  );
}
