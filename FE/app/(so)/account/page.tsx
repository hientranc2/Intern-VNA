"use client";

import { useContext, useEffect, useState } from "react";
import { Alert } from "@/libs/core/components/Alert/Alert";
import { Toast } from "@/libs/core/components/Toast/Toast";
import { SidebarOverrideContext } from "@/libs/tts/auth/sidebarContext";
import { Modal } from "@/libs/core/components/Modal/Modal";
import { PasswordField } from "@/libs/core/components/PasswordField/PasswordField";
import { useCountdown } from "@/libs/core/hooks/useCountdown";
import { Switch } from "@/libs/core/components/Switch/Switch";
import { isValidEmail } from "@/libs/tts/auth/authValidation";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  requestChangeEmailOtp,
  changeEmail,
  ApiError,
} from "@/libs/tts/auth/authApi";
import { PROVINCES, WARDS_BY_PROVINCE } from "@/libs/tts/location/locationData";

const EMPTY_PROFILE = {
  username: "",
  fullName: "",
  dob: "",
  gender: "",
  jobTitle: "",
  role: "",
  province: "",
  ward: "",
  address: "",
};

type ProfileForm = typeof EMPTY_PROFILE;

const FIELD_CLASS =
  "h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";

const SELECT_CLASS = `${FIELD_CLASS} cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-9`;

const MODAL_INPUT_CLASS =
  "h-[42px] w-full rounded-md border border-line px-3.5 text-sm text-ink outline-none transition-colors focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function FieldLabel({
  children,
  required,
}: {
  children: string;
  required?: boolean;
}) {
  return (
    <label className="text-xs text-muted">
      {children}
      {required ? <span className="text-danger">*</span> : null}
    </label>
  );
}

export default function AccountPage() {
  const otpCountdown = useCountdown(60);
  const { setOverride } = useContext(SidebarOverrideContext);

  const [form, setForm] = useState<ProfileForm>(EMPTY_PROFILE);
  const [email, setEmail] = useState("");
  const [active, setActive] = useState(true);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);

  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const [newEmailOpen, setNewEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newEmailError, setNewEmailError] = useState<string | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const setField = (key: keyof ProfileForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Nạp thông tin tài khoản từ API khi mở trang.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await getProfile();
        if (cancelled) return;
        setForm({
          username: p.username ?? "",
          fullName: p.fullName ?? "",
          dob: p.dob ? String(p.dob).slice(0, 10) : "",
          gender: p.gender ?? "",
          jobTitle: p.jobTitle ?? "",
          role: p.role ?? "",
          province: p.province ?? "",
          ward: p.ward ?? "",
          address: p.address ?? "",
        });
        setEmail(p.email ?? "");
        setActive(p.isActive ?? true);
        if (p.avatarUrl) setAvatarPreview(p.avatarUrl);
      } catch (err) {
        if (cancelled) return;
        setToast({
          message: err instanceof ApiError ? err.message : "Không tải được thông tin tài khoản",
          variant: "error",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setOverride({
      userName: form.fullName || form.username,
      initials: getInitials(form.fullName || form.username),
      avatarUrl: avatarPreview,
      onChangePassword: () => setPwdOpen(true),
    });
  }, [form.fullName, form.username, avatarPreview, setOverride]);

  const saveProfile = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (avatarFile) {
        const uploaded = await uploadAvatar(avatarFile);
        setAvatarFile(null);
        if (uploaded.avatarUrl) setAvatarPreview(uploaded.avatarUrl);
      }
      await updateProfile({
        fullName: form.fullName,
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        jobTitle: form.jobTitle || undefined,
        province: form.province || undefined,
        ward: form.ward || undefined,
        address: form.address || undefined,
      });
      setToast({ message: "Lưu thông tin thành công!", variant: "success" });
    } catch (err) {
      setToast({
        message: err instanceof ApiError ? err.message : "Lưu thông tin thất bại",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
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
      await changePassword({
        oldPassword: oldPwd,
        newPassword: newPwd,
        confirmPassword: confirmPwd,
      });
      setPwdError(null);
      setPwdOpen(false);
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setToast({ message: "Đổi mật khẩu thành công!", variant: "success" });
    } catch (err) {
      setPwdError(
        err instanceof ApiError ? err.message : "Đổi mật khẩu thất bại",
      );
    }
  };

  // Bước 1: mở modal ngay, gửi OTP trong nền.
  const openChangeEmail = () => {
    setOtp("");
    setOtpError(null);
    setOtpOpen(true);
    otpCountdown.start();
    requestChangeEmailOtp().catch((err) => {
      setOtpError(
        err instanceof ApiError ? err.message : "Không gửi được mã OTP",
      );
    });
  };

  // Bước 2: nhập OTP (xác thực thật sự cùng email mới ở bước lưu).
  const verifyOtp = () => {
    if (!otp.trim()) {
      setOtpError("Vui lòng nhập mã OTP");
      return;
    }
    setOtpError(null);
    setOtpOpen(false);
    setNewEmail("");
    setNewEmailError(null);
    setNewEmailOpen(true);
  };

  // Bước 3: gửi OTP + email mới lên server để xác nhận đổi.
  const saveNewEmail = async () => {
    if (!isValidEmail(newEmail.trim())) {
      setNewEmailError("Vui lòng nhập email hợp lệ");
      return;
    }
    try {
      await changeEmail({ otpCode: otp.trim(), newEmail: newEmail.trim() });
      otpCountdown.stop();
      setEmail(newEmail.trim());
      setNewEmailOpen(false);
      setToast({ message: "Thay đổi email thành công!", variant: "success" });
    } catch (err) {
      setNewEmailError(
        err instanceof ApiError ? err.message : "Thay đổi email thất bại",
      );
    }
  };

  return (
    <>
      <>
        <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
          <h1 className="text-base font-semibold text-ink">
            Chi tiết người dùng
          </h1>
          <div className="flex gap-2.5">
            <button
              type="button"
              className="h-9 rounded-md border border-line bg-white px-[18px] text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb]"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving || loading}
              className="h-9 rounded-md bg-primary px-[18px] text-[13px] font-medium text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-7 rounded-[10px] bg-white p-7 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
            {/* Cột trái: avatar + kích hoạt */}
            <div className="w-[240px] shrink-0 rounded-[10px] border border-[#e5e7eb] px-5 py-6">
              <div className="flex flex-col items-center gap-2">
                <label className="group relative flex h-25 w-25 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#9ca3af] bg-[#e5e7eb] hover:border-primary">
                  <input
                    type="file"
                    accept=".jpeg,.jpg,.png"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                  {avatarPreview ? (
                    <>
                      <img
                        src={avatarPreview}
                        alt="avatar"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="1.5"
                        >
                          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        <span className="mt-1 text-[10px] text-white">
                          Thay đổi
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="1.5"
                      >
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span className="mt-1 text-[11px] text-muted">
                        Tải ảnh đại diện
                      </span>
                    </div>
                  )}
                </label>
                <div className="text-center text-[11px] text-[#9ca3af]">
                  *.jpeg, *.jpg, *.png.
                  <br />
                  Kích thước tối đa 5 MB
                </div>
                <div className="mt-3 flex items-center gap-2.5">
                  <span className="text-[13px] text-[#374151]">Kích hoạt</span>
                  <Switch
                    checked={active}
                    onChange={setActive}
                    ariaLabel="Kích hoạt tài khoản"
                  />
                </div>
              </div>
            </div>

            {/* Cột phải: thông tin */}
            <div className="flex-1">
              <div className="mb-5 text-sm font-semibold text-dark">
                Thông tin cá nhân
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel required>Tên đăng nhập</FieldLabel>
                  <input
                    className={`${FIELD_CLASS} bg-[#f9fafb]`}
                    value={form.username}
                    readOnly
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel required>Họ và tên</FieldLabel>
                  <input
                    className={FIELD_CLASS}
                    value={form.fullName}
                    onChange={(e) => setField("fullName", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Ngày tháng năm sinh</FieldLabel>
                  <div className="relative">
                    <input
                      type="date"
                      className={`${FIELD_CLASS} pr-10`}
                      value={form.dob}
                      onChange={(e) => setField("dob", e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Giới tính</FieldLabel>
                  <select
                    className={SELECT_CLASS}
                    value={form.gender}
                    onChange={(e) => setField("gender", e.target.value)}
                  >
                    <option value="">Giới tính</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Chức danh</FieldLabel>
                  <input
                    className={FIELD_CLASS}
                    placeholder="Chức danh"
                    value={form.jobTitle}
                    onChange={(e) => setField("jobTitle", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel required>Vai trò</FieldLabel>
                  <input
                    className={`${FIELD_CLASS} bg-[#f9fafb]`}
                    value={form.role}
                    readOnly
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <FieldLabel>Email</FieldLabel>
                  <div className="flex items-center gap-2">
                    <input
                      className={`${FIELD_CLASS} flex-1`}
                      value={email}
                      readOnly
                    />

                    <button
                      type="button"
                      onClick={openChangeEmail}
                      className="whitespace-nowrap text-[13px] font-medium text-primary hover:underline cursor-pointer"
                    >
                      Thay đổi
                    </button>
                  </div>
                </div>
              </div>

              <hr className="my-7 border-t border-[#f3f4f6]" />

              <div className="mb-5 text-sm font-semibold text-dark">
                Thông tin liên hệ
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Tỉnh thành phố</FieldLabel>
                  <select
                    className={SELECT_CLASS}
                    value={form.province}
                    onChange={(e) => {
                      setField("province", e.target.value);
                      setField("ward", "");
                    }}
                  >
                    <option value="">Chọn tỉnh / thành phố</option>
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Phường xã</FieldLabel>
                  <select
                    className={SELECT_CLASS}
                    value={form.ward}
                    onChange={(e) => setField("ward", e.target.value)}
                    disabled={
                      !form.province ||
                      !WARDS_BY_PROVINCE[form.province]?.length
                    }
                  >
                    <option value="">
                      {form.province && !WARDS_BY_PROVINCE[form.province]
                        ? "Chưa có dữ liệu phường/xã"
                        : "Chọn phường / xã"}
                    </option>
                    {(WARDS_BY_PROVINCE[form.province] ?? []).map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <FieldLabel>Địa chỉ</FieldLabel>
                  <input
                    className={FIELD_CLASS}
                    placeholder="Địa chỉ"
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>

      {/* Modal đổi mật khẩu */}
      <Modal
        open={pwdOpen}
        title="Đổi mật khẩu"
        onClose={() => setPwdOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPwdOpen(false)}
              className="h-[38px] rounded-md px-5 text-sm font-medium text-muted hover:bg-[#f9fafb] hover:text-[#374151]"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={savePassword}
              className="h-[38px] rounded-md bg-primary px-6 text-sm font-semibold text-white hover:bg-[#1e40af]"
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
          <PasswordField
            value={oldPwd}
            onChange={setOldPwd}
            placeholder="Mật khẩu cũ"
          />
        </div>
        <div className="mb-4">
          <label className="mb-1.5 block text-[12.5px] text-[#374151]">
            Mật khẩu mới <span className="text-danger">*</span>
          </label>
          <PasswordField
            value={newPwd}
            onChange={setNewPwd}
            placeholder="Mật khẩu mới"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] text-[#374151]">
            Nhập lại mật khẩu mới <span className="text-danger">*</span>
          </label>
          <PasswordField
            value={confirmPwd}
            onChange={setConfirmPwd}
            placeholder="Nhập lại mật khẩu mới"
            autoComplete="new-password"
          />
        </div>
      </Modal>

      {/* Modal đổi email - bước 1: OTP */}
      <Modal
        open={otpOpen}
        title="THAY ĐỔI EMAIL"
        onClose={() => {
          otpCountdown.stop();
          setOtpOpen(false);
        }}
        footer={
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={verifyOtp}
              className="h-[42px] w-full rounded-md bg-primary text-sm font-semibold text-white hover:bg-[#1e40af]"
            >
              Xác nhận
            </button>
            <button
              type="button"
              onClick={() => {
                otpCountdown.stop();
                setOtpOpen(false);
              }}
              className="text-sm font-medium text-muted hover:text-[#374151]"
            >
              Hủy bỏ
            </button>
          </div>
        }
      >
        <p className="mb-5 text-center text-[13px] leading-relaxed text-muted">
          Chúng tôi đã gửi mã xác minh qua số email cũ
          <br />
          <strong className="text-ink">{email}</strong>
          <br />
          <br />
          Bạn vui lòng kiểm tra và điền mã xác thực
        </p>
        {otpError ? <Alert variant="error" message={otpError} /> : null}
        <div className="mb-4">
          <label className="mb-1.5 block text-[12.5px] text-[#374151]">
            OTP <span className="text-danger">*</span>
          </label>
          <input
            className={MODAL_INPUT_CLASS}
            value={otp}
            maxLength={6}
            onChange={(event) => setOtp(event.target.value)}
            placeholder="Nhập mã OTP"
          />
        </div>
        <div className="mb-1.5 text-center text-sm font-bold text-primary">
          {otpCountdown.formatted}
        </div>
        <div className="text-center text-[12.5px] text-muted">
          Chưa nhận được mã?{" "}
          <button
            type="button"
            onClick={() => otpCountdown.start()}
            className="text-primary hover:underline"
          >
            Gửi lại
          </button>
        </div>
      </Modal>

      {/* Modal đổi email - bước 2: email mới */}
      <Modal
        open={newEmailOpen}
        title="THAY ĐỔI EMAIL"
        onClose={() => setNewEmailOpen(false)}
        footer={
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={saveNewEmail}
              className="h-[42px] w-full rounded-md bg-primary text-sm font-semibold text-white hover:bg-[#1e40af]"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={() => setNewEmailOpen(false)}
              className="text-sm font-medium text-muted hover:text-[#374151]"
            >
              Hủy bỏ
            </button>
          </div>
        }
      >
        <p className="mb-5 text-center text-[13px] text-muted">
          Vui lòng nhập email mới
        </p>
        {newEmailError ? (
          <Alert variant="error" message={newEmailError} />
        ) : null}
        <div>
          <label className="mb-1.5 block text-[12.5px] text-[#374151]">
            Email <span className="text-danger">*</span>
          </label>
          <input
            className={MODAL_INPUT_CLASS}
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="Nhập email mới"
          />
        </div>
      </Modal>

      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant}
        onDone={() => setToast(null)}
      />
    </>
  );
}
