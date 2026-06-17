"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormHelperText } from "@mui/material";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { SidebarOverrideContext } from "@/libs/tts/auth/sidebarContext";
import { Modal } from "@/libs/shared/core/components/Modal/Modal";
import { PasswordField } from "@/libs/shared/core/components/PasswordField/PasswordField";
import { useCountdown } from "@/libs/shared/core/hooks/useCountdown";
import { Switch } from "@/libs/shared/core/components/Switch/Switch";
import { isValidEmail } from "@/libs/tts/auth/authValidation";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  requestChangeEmailOtp,
  changeEmail,
  clearToken,
  consumeLoginSuccess,
  ApiError,
} from "@/libs/tts/auth/authApi";
import { PROVINCES, WARDS_BY_PROVINCE } from "@/libs/tts/location/locationData";
import { localISODate } from "@/libs/shared/core/utils/dateUtils";
import { DateInput } from "@/libs/shared/core/components/DateInput/DateInput";

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

const DISABLED_FIELD_CLASS =
  "h-10 w-full rounded-md border border-line bg-[#f3f4f6] px-3 text-sm text-muted outline-none cursor-not-allowed select-none";

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
  const router = useRouter();
  const otpCountdown = useCountdown(300);
  const { setOverride } = useContext(SidebarOverrideContext);

  const [form, setForm] = useState<ProfileForm>(EMPTY_PROFILE);
  const [email, setEmail] = useState("");
  const [active, setActive] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdFieldErrors, setPwdFieldErrors] = useState<{ oldPwd?: string; newPwd?: string; confirmPwd?: string }>({});

  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const [newEmailOpen, setNewEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newEmailError, setNewEmailError] = useState<string | null>(null);

  const [formErrors, setFormErrors] = useState<{
    fullName?: string;
    dob?: string;
  }>({});

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [provinceSearch, setProvinceSearch] = useState("");
  const [provinceOpen, setProvinceOpen] = useState(false);
  const provinceRef = useRef<HTMLDivElement>(null);

  const [wardSearch, setWardSearch] = useState("");
  const [wardOpen, setWardOpen] = useState(false);
  const wardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (provinceRef.current && !provinceRef.current.contains(e.target as Node)) {
        setProvinceOpen(false);
        setProvinceSearch("");
      }
      if (wardRef.current && !wardRef.current.contains(e.target as Node)) {
        setWardOpen(false);
        setWardSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProvinces = PROVINCES.filter((p) =>
    p.toLowerCase().includes(provinceSearch.toLowerCase()),
  );

  const currentWards = WARDS_BY_PROVINCE[form.province] ?? [];
  const filteredWards = currentWards.filter((w) =>
    w.toLowerCase().includes(wardSearch.toLowerCase()),
  );
  const wardDisabled = !form.province || currentWards.length === 0;
  const wardPlaceholder =
    form.province && currentWards.length === 0 ? "Chưa có dữ liệu phường/xã" : "Chọn phường / xã";

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const setField = (key: keyof ProfileForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Hiển thị toast "Đăng nhập thành công" khi vừa điều hướng từ trang login sang.
  useEffect(() => {
    if (consumeLoginSuccess())
      setToast({ message: "Đăng nhập thành công!", variant: "success" });
  }, []);

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
          role: p.roleName ?? p.role ?? "",
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
          message:
            err instanceof ApiError
              ? err.message
              : "Không tải được thông tin tài khoản",
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
    const errors: { fullName?: string; dob?: string } = {};
    if (!form.fullName.trim())
      errors.fullName = "Họ và tên không được để trống";
    if (form.dob) {
      const today = localISODate(new Date());
      if (form.dob > today)
        errors.dob = "Ngày sinh không được là ngày tương lai";
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
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
        message:
          err instanceof ApiError ? err.message : "Lưu thông tin thất bại",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
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
      setToast({
        message: err instanceof ApiError ? err.message : "Đổi mật khẩu thất bại",
        variant: "error",
      });
    }
  };

  // Bước 1: mở modal ngay, gửi OTP trong nền.
  const openChangeEmail = () => {
    setOtp("");
    setOtpError(null);
    setOtpOpen(true);
    otpCountdown.start();
    requestChangeEmailOtp().catch((err) => {
      setToast({
        message: err instanceof ApiError ? err.message : "Không gửi được mã OTP",
        variant: "error",
      });
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
    if (newEmail.trim() === email) {
      setNewEmailError("Email mới không được trùng với email hiện tại");
      return;
    }
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
      setToast({
        message: err instanceof ApiError ? err.message : "Thay đổi email thất bại",
        variant: "error",
      });
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
                <label className="group relative flex h-25 w-25 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#e5e7eb]">
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
                    <>
                      <img
                        src="/avatar-default-svgrepo-com.svg"
                        alt="avatar"
                        className="block h-full w-full object-cover"
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
                          Tải ảnh đại diện
                        </span>
                      </div>
                    </>
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
                    disabled
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
                    className={DISABLED_FIELD_CLASS}
                    value={form.username}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel required>Họ và tên</FieldLabel>
                  <input
                    className={`${FIELD_CLASS}${formErrors.fullName ? " border-danger focus:border-danger" : ""}`}
                    value={form.fullName}
                    onChange={(e) => {
                      setField("fullName", e.target.value);
                      if (formErrors.fullName)
                        setFormErrors((p) => ({ ...p, fullName: undefined }));
                    }}
                  />
                  {formErrors.fullName && (
                    <p className="text-[11px] text-danger">
                      {formErrors.fullName}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Ngày tháng năm sinh</FieldLabel>
                  <DateInput
                    value={form.dob}
                    onChange={(v) => {
                      setField("dob", v);
                      if (formErrors.dob)
                        setFormErrors((p) => ({ ...p, dob: undefined }));
                    }}
                    max={localISODate(new Date())}
                    error={!!formErrors.dob}
                  />
                  {formErrors.dob && (
                    <p className="text-[11px] text-danger">{formErrors.dob}</p>
                  )}
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
                    className={DISABLED_FIELD_CLASS}
                    value={form.role}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <FieldLabel>Email</FieldLabel>
                  <div className="flex items-center gap-2">
                    <input
                      className={`${DISABLED_FIELD_CLASS} flex-1`}
                      value={email}
                      readOnly
                      tabIndex={-1}
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
                  <div ref={provinceRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setProvinceOpen((prev) => !prev);
                        setProvinceSearch("");
                      }}
                      className={`${FIELD_CLASS} flex w-full items-center justify-between text-left`}
                    >
                      <span className={form.province ? "text-ink" : "text-muted"}>
                        {form.province || "Chọn tỉnh / thành phố"}
                      </span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#6b7280"
                        strokeWidth="2"
                        className={`shrink-0 transition-transform duration-150 ${provinceOpen ? "" : "rotate-180"}`}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {provinceOpen && (
                      <div className="absolute left-0 bottom-full z-50 mb-1 w-full overflow-hidden rounded-md border border-line bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                        <div className="p-2">
                          <input
                            type="text"
                            autoFocus
                            className="h-8 w-full rounded border border-line px-2.5 text-sm text-ink outline-none focus:border-[#3b82f6]"
                            placeholder="Tìm kiếm..."
                            value={provinceSearch}
                            onChange={(e) => setProvinceSearch(e.target.value)}
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          <div
                            className="cursor-pointer px-3 py-1.5 text-sm text-muted hover:bg-[#f3f4f6]"
                            onClick={() => {
                              setField("province", "");
                              setField("ward", "");
                              setProvinceOpen(false);
                              setProvinceSearch("");
                              setWardOpen(false);
                              setWardSearch("");
                            }}
                          >
                            Chọn tỉnh / thành phố
                          </div>
                          {filteredProvinces.map((p) => (
                            <div
                              key={p}
                              className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-[#f3f4f6] ${
                                form.province === p
                                  ? "bg-[#eff6ff] font-medium text-primary"
                                  : "text-ink"
                              }`}
                              onClick={() => {
                                setField("province", p);
                                setField("ward", "");
                                setProvinceOpen(false);
                                setProvinceSearch("");
                                setWardOpen(false);
                                setWardSearch("");
                              }}
                            >
                              {p}
                            </div>
                          ))}
                          {filteredProvinces.length === 0 && (
                            <div className="px-3 py-3 text-center text-sm text-muted">
                              Không tìm thấy
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Phường xã</FieldLabel>
                  <div ref={wardRef} className="relative">
                    <button
                      type="button"
                      disabled={wardDisabled}
                      onClick={() => {
                        setWardOpen((prev) => !prev);
                        setWardSearch("");
                      }}
                      className={`${wardDisabled ? DISABLED_FIELD_CLASS : FIELD_CLASS} flex w-full items-center justify-between text-left`}
                    >
                      <span className={form.ward ? "text-ink" : "text-muted"}>
                        {form.ward || wardPlaceholder}
                      </span>
                      {!wardDisabled && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#6b7280"
                          strokeWidth="2"
                          className={`shrink-0 transition-transform duration-150 ${wardOpen ? "" : "rotate-180"}`}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      )}
                    </button>
                    {wardOpen && !wardDisabled && (
                      <div className="absolute left-0 bottom-full z-50 mb-1 w-full overflow-hidden rounded-md border border-line bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                        <div className="p-2">
                          <input
                            type="text"
                            autoFocus
                            className="h-8 w-full rounded border border-line px-2.5 text-sm text-ink outline-none focus:border-[#3b82f6]"
                            placeholder="Tìm kiếm..."
                            value={wardSearch}
                            onChange={(e) => setWardSearch(e.target.value)}
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          <div
                            className="cursor-pointer px-3 py-1.5 text-sm text-muted hover:bg-[#f3f4f6]"
                            onClick={() => {
                              setField("ward", "");
                              setWardOpen(false);
                              setWardSearch("");
                            }}
                          >
                            Chọn phường / xã
                          </div>
                          {filteredWards.map((w) => (
                            <div
                              key={w}
                              className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-[#f3f4f6] ${
                                form.ward === w
                                  ? "bg-[#eff6ff] font-medium text-primary"
                                  : "text-ink"
                              }`}
                              onClick={() => {
                                setField("ward", w);
                                setWardOpen(false);
                                setWardSearch("");
                              }}
                            >
                              {w}
                            </div>
                          ))}
                          {filteredWards.length === 0 && (
                            <div className="px-3 py-3 text-center text-sm text-muted">
                              Không tìm thấy
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
        <div className="mb-4">
          <label className="mb-1.5 block text-[12.5px] text-[#374151]">
            OTP <span className="text-danger">*</span>
          </label>
          <input
            className={`${MODAL_INPUT_CLASS}${otpError ? " border-danger" : ""}`}
            value={otp}
            maxLength={6}
            onChange={(event) => { setOtp(event.target.value); if (otpError) setOtpError(null); }}
            placeholder="Nhập mã OTP"
          />
          {otpError && (
            <FormHelperText error sx={{ mt: 0.5, mx: 0, fontSize: "11px" }}>{otpError}</FormHelperText>
          )}
        </div>
        <div className="mb-1.5 text-center text-sm font-bold text-primary">
          {otpCountdown.formatted}
        </div>
        <div className="text-center text-[12.5px] text-muted">
          Chưa nhận được mã?{" "}
          <button
            type="button"
            onClick={() => otpCountdown.start()}
            disabled={otpCountdown.seconds > 0}
            className="text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-40"
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
        <div>
          <label className="mb-1.5 block text-[12.5px] text-[#374151]">
            Email <span className="text-danger">*</span>
          </label>
          <input
            className={`${MODAL_INPUT_CLASS}${newEmailError ? " border-danger" : ""}`}
            type="email"
            value={newEmail}
            onChange={(event) => { setNewEmail(event.target.value); if (newEmailError) setNewEmailError(null); }}
            placeholder="Nhập email mới"
          />
          {newEmailError && (
            <FormHelperText error sx={{ mt: 0.5, mx: 0, fontSize: "11px" }}>{newEmailError}</FormHelperText>
          )}
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
