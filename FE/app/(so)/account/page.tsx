"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FormHelperText,
  MenuItem,
  TextField,
} from "@mui/material";
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
import { SearchableSelect } from "@/libs/shared/core/components/SearchableSelect/SearchableSelect";

const EMPTY_PROFILE = {
  username: "",
  fullName: "",
  dob: "",
  gender: "",
  jobTitle: "",
  role: "",
  province: "Thành phố Hồ Chí Minh",
  ward: "",
  address: "",
};

type ProfileForm = typeof EMPTY_PROFILE;

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AccountPage() {
  const router = useRouter();
  const otpCountdown = useCountdown(300);
  const { setOverride } = useContext(SidebarOverrideContext);

  const [form, setForm] = useState<ProfileForm>(EMPTY_PROFILE);
  const [originalForm, setOriginalForm] = useState<ProfileForm>(EMPTY_PROFILE);
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [active, setActive] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error" | "warning";
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdFieldErrors, setPwdFieldErrors] = useState<{
    oldPwd?: string;
    newPwd?: string;
    confirmPwd?: string;
  }>({});

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
  const [originalAvatarUrl, setOriginalAvatarUrl] = useState<string | null>(
    null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const currentWards = WARDS_BY_PROVINCE[form.province] ?? [];

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
        const profileData = {
          username: p.username ?? "",
          fullName: p.fullName ?? "",
          dob: p.dob ? String(p.dob).slice(0, 10) : "",
          gender: p.gender ?? "",
          jobTitle: p.jobTitle ?? "",
          role: p.roleName ?? p.role ?? "",
          province: p.province ?? "",
          ward: p.ward ?? "",
          address: p.address ?? "",
        };
        setForm(profileData);
        setOriginalForm(profileData);
        setEmail(p.email ?? "");
        setOriginalEmail(p.email ?? "");
        setActive(p.isActive ?? true);
        if (p.avatarUrl) {
          setAvatarPreview(p.avatarUrl);
          setOriginalAvatarUrl(p.avatarUrl);
        }
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

  // Kiểm tra xem có thay đổi gì không
  const hasChanges = () => {
    // Kiểm tra avatar
    if (avatarFile) return true;
    if (avatarPreview !== originalAvatarUrl) return true;

    // Kiểm tra email
    if (email !== originalEmail) return true;

    // Kiểm tra các trường trong form
    for (const key of Object.keys(form) as Array<keyof ProfileForm>) {
      if (form[key] !== originalForm[key]) {
        return true;
      }
    }

    return false;
  };

  const saveProfile = async () => {
    if (saving) return;

    // Kiểm tra nếu không có thay đổi
    if (!hasChanges()) {
      setToast({
        message: "Không có thay đổi nào để lưu",
        variant: "warning",
      });
      return;
    }

    const errors: { fullName?: string; dob?: string } = {};
    // Trim đầu/cuối + gộp nhiều khoảng trắng liên tiếp thành 1 khoảng trắng.
    const fullName = form.fullName.trim().replace(/\s+/g, " ");

    if (!fullName) {
      errors.fullName = "Họ và tên không được để trống";
    } else if (/\d/.test(fullName)) {
      errors.fullName = "Họ và tên không được chứa số";
    } else if (
      !/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ ]+$/.test(
        fullName,
      )
    ) {
      errors.fullName = "Họ và tên chỉ được chứa chữ cái";
    }

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
    setField("fullName", fullName); // đồng bộ lại input với giá trị đã làm sạch
    setSaving(true);
    try {
      if (avatarFile) {
        const uploaded = await uploadAvatar(avatarFile);
        setAvatarFile(null);
        if (uploaded.avatarUrl) {
          setAvatarPreview(uploaded.avatarUrl);
          setOriginalAvatarUrl(uploaded.avatarUrl);
        }
      }
      await updateProfile({
        fullName, // dùng bản đã trim/gộp khoảng trắng
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        jobTitle: form.jobTitle || undefined,
        province: form.province || undefined,
        ward: form.ward || undefined,
        address: form.address || undefined,
      });

      // Cập nhật original form sau khi lưu thành công
      setOriginalForm({
        ...form,
        fullName,
      });
      setOriginalEmail(email);

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

  const handleCancel = () => {
    setForm(originalForm);
    setEmail(originalEmail);
    setAvatarFile(null);
    setAvatarPreview(originalAvatarUrl);
    setFormErrors({});
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
      clearToken();
      router.replace("/login");
    } catch (err) {
      setToast({
        message:
          err instanceof ApiError ? err.message : "Đổi mật khẩu thất bại",
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
        message:
          err instanceof ApiError ? err.message : "Không gửi được mã OTP",
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
      setOriginalEmail(newEmail.trim());
      setNewEmailOpen(false);
      setToast({ message: "Thay đổi email thành công!", variant: "success" });
    } catch (err) {
      setToast({
        message:
          err instanceof ApiError ? err.message : "Thay đổi email thất bại",
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
              onClick={handleCancel}
              disabled={saving || loading || !hasChanges()}
              className="h-9 rounded-md border border-line bg-white px-[18px] text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving || loading || !hasChanges()}
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
              <div className="grid grid-cols-2 gap-x-5 gap-y-6">
                <TextField
                  label="Tên đăng nhập"
                  value={form.username}
                  disabled
                  size="small"
                  fullWidth
                  required
                />
                <TextField
                  label="Họ và tên"
                  value={form.fullName}
                  onChange={(e) => {
                    setField("fullName", e.target.value);
                    if (formErrors.fullName)
                      setFormErrors((p) => ({ ...p, fullName: undefined }));
                  }}
                  error={!!formErrors.fullName}
                  helperText={formErrors.fullName}
                  size="small"
                  fullWidth
                  required
                />
                <DateInput
                  label="Ngày tháng năm sinh"
                  value={form.dob}
                  onChange={(v) => {
                    setField("dob", v);
                    if (formErrors.dob)
                      setFormErrors((p) => ({ ...p, dob: undefined }));
                  }}
                  max={localISODate(new Date())}
                  error={!!formErrors.dob}
                  helperText={formErrors.dob}
                />
                <TextField
                  label="Giới tính"
                  select
                  value={form.gender}
                  onChange={(e) => setField("gender", e.target.value)}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">Giới tính</MenuItem>
                  <MenuItem value="Nam">Nam</MenuItem>
                  <MenuItem value="Nữ">Nữ</MenuItem>
                  <MenuItem value="Khác">Khác</MenuItem>
                </TextField>
                <TextField
                  label="Chức danh"
                  value={form.jobTitle}
                  onChange={(e) => setField("jobTitle", e.target.value)}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Vai trò"
                  value={form.role}
                  disabled
                  size="small"
                  fullWidth
                  required
                />
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <TextField
                      label="Email"
                      value={email}
                      disabled
                      size="small"
                      fullWidth
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
              <div className="grid grid-cols-2 gap-x-5 gap-y-6">
                <SearchableSelect
                  options={PROVINCES}
                  value={form.province}
                  // Muốn bật lại thì xóa disabled đi
                  disabled
                  onChange={(v) => {
                    setField("province", v);
                    setField("ward", "");
                  }}
                  label="Tỉnh/ thành phố"
                  dropUp
                />

                <SearchableSelect
                  options={WARDS_BY_PROVINCE[form.province] ?? []}
                  value={form.ward}
                  disabled={!form.province}
                  onChange={(v) => setField("ward", v)}
                  label="Phường / Xã"
                  dropUp
                />

                <div className="col-span-2">
                  <TextField
                    label="Địa chỉ"
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                    size="small"
                    fullWidth
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
            onChange={(v) => {
              setOldPwd(v);
              if (pwdFieldErrors.oldPwd)
                setPwdFieldErrors((p) => ({ ...p, oldPwd: undefined }));
            }}
            hasError={!!pwdFieldErrors.oldPwd}
          />
          {pwdFieldErrors.oldPwd && (
            <FormHelperText error sx={{ mt: 0.5, mx: 0, fontSize: "11px" }}>
              {pwdFieldErrors.oldPwd}
            </FormHelperText>
          )}
        </div>
        <div className="mb-4">
          <label className="mb-1.5 block text-[12.5px] text-[#374151]">
            Mật khẩu mới <span className="text-danger">*</span>
          </label>
          <PasswordField
            value={newPwd}
            onChange={(v) => {
              setNewPwd(v);
              if (pwdFieldErrors.newPwd)
                setPwdFieldErrors((p) => ({ ...p, newPwd: undefined }));
            }}
            autoComplete="new-password"
            hasError={!!pwdFieldErrors.newPwd}
          />
          {pwdFieldErrors.newPwd && (
            <FormHelperText error sx={{ mt: 0.5, mx: 0, fontSize: "11px" }}>
              {pwdFieldErrors.newPwd}
            </FormHelperText>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] text-[#374151]">
            Nhập lại mật khẩu mới <span className="text-danger">*</span>
          </label>
          <PasswordField
            value={confirmPwd}
            onChange={(v) => {
              setConfirmPwd(v);
              if (pwdFieldErrors.confirmPwd)
                setPwdFieldErrors((p) => ({ ...p, confirmPwd: undefined }));
            }}
            autoComplete="new-password"
            hasError={!!pwdFieldErrors.confirmPwd}
          />
          {pwdFieldErrors.confirmPwd && (
            <FormHelperText error sx={{ mt: 0.5, mx: 0, fontSize: "11px" }}>
              {pwdFieldErrors.confirmPwd}
            </FormHelperText>
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
          <TextField
            label="OTP"
            value={otp}
            onChange={(event) => {
              setOtp(event.target.value);
              if (otpError) setOtpError(null);
            }}
            error={!!otpError}
            helperText={otpError}
            size="small"
            fullWidth
            required
            slotProps={{ htmlInput: { maxLength: 6 } }}
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
          <TextField
            label="Email"
            type="email"
            value={newEmail}
            onChange={(event) => {
              setNewEmail(event.target.value);
              if (newEmailError) setNewEmailError(null);
            }}
            error={!!newEmailError}
            helperText={newEmailError}
            size="small"
            fullWidth
            required
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
