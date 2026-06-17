"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormHelperText } from "@mui/material";
import useDebounce from "@/libs/shared/core/hooks/useDebounce";
import { TriCheckbox } from "@/libs/shared/core/components/TriCheckbox/TriCheckbox";
import { PasswordField } from "@/libs/shared/core/components/PasswordField/PasswordField";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { GENDER_OPTIONS, type User } from "@/libs/tts/user/userData";
import { type Role } from "@/libs/tts/role/roleData";
import { getRoleList } from "@/libs/tts/role/roleApi";
import { PROVINCES, WARDS_BY_PROVINCE } from "@/libs/tts/location/locationData";
import {
  getUserList,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  deleteUser,
} from "@/libs/tts/user/userApi";
import { ApiError, assetUrl } from "@/libs/tts/auth/apiClient";
import { getProfile, clearToken } from "@/libs/tts/auth/authApi";
import { useCan } from "@/libs/tts/auth/abilityContext";
import { isValidEmail, isStrongPassword, PASSWORD_RULE_MESSAGE } from "@/libs/tts/auth/authValidation";
import { Switch } from "@/libs/shared/core/components/Switch/Switch";
import { SearchableSelect } from "@/libs/shared/core/components/SearchableSelect/SearchableSelect";
import { localISODate } from "@/libs/shared/core/utils/dateUtils";
import { DateInput } from "@/libs/shared/core/components/DateInput/DateInput";
import { exportToExcel } from "@/libs/shared/core/utils/exportCsv";

type ViewMode = "list" | "detail";

type UserForm = {
  username: string;
  fullName: string;
  email: string;
  roleId: number | "";
  jobTitle: string;
  isActive: boolean;
  dob: string;
  gender: string;
  province: string;
  ward: string;
  address: string;
};

type FieldErrors = {
  username?: string;
  fullName?: string;
  email?: string;
  password?: string;
  dob?: string;
  gender?: string;
};

const EMPTY_FORM: UserForm = {
  username: "",
  fullName: "",
  email: "",
  roleId: "",
  jobTitle: "",
  isActive: true,
  dob: "",
  gender: "",
  province: "",
  ward: "",
  address: "",
};

const FILTER_INPUT_CLASS =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] text-ink outline-none focus:border-[#3b82f6]";
const FORM_CONTROL_CLASS =
  "h-10 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] disabled:bg-[#f3f4f6] disabled:text-muted disabled:cursor-not-allowed";
const SELECT_CLASS = `${FORM_CONTROL_CLASS} cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8`;

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "#fecaca",
  "#fed7aa",
  "#fde68a",
  "#bbf7d0",
  "#bfdbfe",
  "#ddd6fe",
];
function avatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i += 1)
    hash = (hash + username.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

export default function UserPage() {
  const router = useRouter();
  const canCreate = useCan("create", "USER");
  const canUpdate = useCan("update", "USER");
  const canDelete = useCan("delete", "USER");
  const importRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [view, setView] = useState<ViewMode>("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Server-side pagination
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [fFullName, setFFullName] = useState("");
  const [fUsername, setFUsername] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fRoleId, setFRoleId] = useState("");
  const [fJobTitle, setFJobTitle] = useState("");
  const [fActive, setFActive] = useState("");
  const [fProvince, setFProvince] = useState("");

  const dFFullName = useDebounce(fFullName, 400);
  const dFUsername = useDebounce(fUsername, 400);
  const dFEmail = useDebounce(fEmail, 400);
  const dFJobTitle = useDebounce(fJobTitle, 400);

  // Detail form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAvatarUrl, setEditingAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetPwdError, setResetPwdError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Delete confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    getProfile()
      .then((p) => setCurrentUserId(p.id))
      .catch(() => {});
    getRoleList()
      .then(setRoles)
      .catch(() => {});
  }, []);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const isActiveParam =
        fActive === "1" ? true : fActive === "0" ? false : undefined;
      const res = await getUserList({
        page: currentPage,
        limit: pageSize,
        fullName: dFFullName || undefined,
        username: dFUsername || undefined,
        email: dFEmail || undefined,
        roleId: fRoleId ? Number(fRoleId) : undefined,
        jobTitle: dFJobTitle || undefined,
        isActive: isActiveParam,
        province: fProvince || undefined,
      });
      setUsers(res.data);
      setTotalItems(res.meta.totalItems);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setToast({
        message:
          err instanceof ApiError
            ? err.message
            : "Không thể tải danh sách người dùng",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    dFFullName,
    dFUsername,
    dFEmail,
    fRoleId,
    dFJobTitle,
    fActive,
    fProvince,
  ]);

  useEffect(() => {
    if (view === "list") loadUsers();
  }, [loadUsers, view]);

  const setField = <K extends keyof UserForm>(key: K, value: UserForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const clearFieldError = (key: keyof FieldErrors) =>
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));

  // Tên vai trò hiển thị: ưu tiên vai trò phân quyền (roleId), fallback role string (vd ADMIN).
  const roleName = (u: User) =>
    roles.find((r) => r.id === u.roleId)?.ten ?? u.role ?? "—";

  // User cấp cao (ADMIN / CEO / Quản trị viên hệ thống): không được xóa — phải đổi vai trò trước.
  const isHighRoleUser = (u: User) =>
    u.role === "ADMIN" ||
    Boolean(roles.find((r) => r.id === u.roleId)?.isSuper);

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  const selectableUsers = users.filter(
    (u) => u.id !== currentUserId && !isHighRoleUser(u),
  );
  const allPageChecked =
    selectableUsers.length > 0 &&
    selectableUsers.every((u) => selectedIds.has(u.id));

  const toggleRow = (id: string, checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      users.forEach((u) => {
        if (u.id === currentUserId || isHighRoleUser(u)) return;
        checked ? next.add(u.id) : next.delete(u.id);
      });
      return next;
    });

  const handleToggleStatus = async (user: User) => {
    try {
      const res = await toggleUserStatus(user.id);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: res.isActive } : u,
        ),
      );
    } catch (err) {
      setToast({
        message:
          err instanceof ApiError
            ? err.message
            : "Không thể thay đổi trạng thái",
        variant: "error",
      });
    }
  };

  // Giải phóng object URL của preview cũ để tránh rò rỉ bộ nhớ.
  const clearAvatarSelection = () => {
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAvatarFile(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(jpe?g|png)$/i.test(file.name)) {
      setToast({
        message: "Chỉ chấp nhận ảnh định dạng .jpeg, .jpg, .png",
        variant: "error",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: "Ảnh vượt quá 5 MB", variant: "error" });
      return;
    }
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setAvatarFile(file);
  };

  const openAdd = () => {
    setEditingId(null);
    setEditingAvatarUrl(null);
    clearAvatarSelection();
    setForm(EMPTY_FORM);
    setPassword("12345678");
    setFieldErrors({});
    setView("detail");
  };

  const openEdit = (user: User) => {
    setEditingId(user.id);
    setEditingAvatarUrl(user.avatarUrl ?? null);
    clearAvatarSelection();
    setForm({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      roleId: user.roleId ?? "",
      jobTitle: user.jobTitle ?? "",
      isActive: user.isActive,
      dob: user.dob ? String(user.dob).slice(0, 10) : "",
      gender: user.gender ?? "",
      province: user.province ?? "",
      ward: user.ward ?? "",
      address: user.address ?? "",
    });
    setPassword("");
    setFieldErrors({});
    setView("detail");
  };

  const saveUser = async () => {
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const username = form.username.trim();

    const errors: FieldErrors = {};
    if (!username) {
      errors.username = "Tên đăng nhập không được để trống";
    } else if (/\s/.test(username)) {
      errors.username = "Tên đăng nhập không được chứa khoảng trắng";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.username =
        "Tên đăng nhập chỉ được chứa chữ cái, chữ số và dấu gạch dưới (_)";
    }
    if (!fullName) {
      errors.fullName = "Họ và tên không được để trống";
    } else if (/\d/.test(fullName)) {
      errors.fullName = "Họ và tên không được chứa số";
    } else if (/\s/.test(fullName)) {
      errors.fullName = "Họ và tên không được chứa khoảng trắng";
    } else if (!/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]+$/.test(fullName)) {
      errors.fullName = "Họ và tên chỉ được chứa chữ cái";
    }
    if (!email) errors.email = "Email không được để trống";
    else if (!isValidEmail(email)) errors.email = "Email không đúng định dạng";
    // Tạo mới: bắt buộc giới tính + mật khẩu mạnh. Sửa: đổi mật khẩu xử lý ở luồng riêng.
    if (!editingId && !form.gender) errors.gender = "Vui lòng chọn giới tính";
    if (!editingId) {
      if (!password) errors.password = "Mật khẩu không được để trống";
      else if (!isStrongPassword(password)) errors.password = PASSWORD_RULE_MESSAGE;
    }
    if (form.dob && form.dob > localISODate(new Date()))
      errors.dob = "Ngày sinh không được là ngày tương lai";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSaving(true);
    try {
      if (editingId) {
        await updateUser(editingId, {
          fullName,
          email,
          roleId: form.roleId === "" ? undefined : form.roleId,
          jobTitle: form.jobTitle || undefined,
          isActive: form.isActive,
          avatar: avatarFile,
          dob: form.dob || undefined,
          gender: form.gender || undefined,
          province: form.province || undefined,
          ward: form.ward || undefined,
          address: form.address || undefined,
        });
        setToast({ message: "Cập nhật thành công", variant: "success" });
      } else {
        await createUser({
          username,
          password,
          email,
          fullName,
          roleId: form.roleId === "" ? undefined : form.roleId,
          jobTitle: form.jobTitle || undefined,
          isActive: form.isActive,
          avatar: avatarFile,
          dob: form.dob || undefined,
          gender: form.gender || undefined,
          province: form.province || undefined,
          ward: form.ward || undefined,
          address: form.address || undefined,
        });
        setToast({ message: "Thêm mới thành công", variant: "success" });
      }
      clearAvatarSelection();
      setView("list");
    } catch (err) {
      setToast({
        message:
          err instanceof ApiError ? err.message : "Lưu thông tin thất bại",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmResetPwd = async () => {
    if (!resetPwd.trim()) {
      setResetPwdError("Vui lòng nhập mật khẩu mới");
      return;
    }
    if (!isStrongPassword(resetPwd.trim())) {
      setResetPwdError(PASSWORD_RULE_MESSAGE);
      return;
    }
    if (!resetTarget) return;
    setIsResetting(true);
    setResetPwdError(null);
    const isSelf = resetTarget.id === currentUserId;
    try {
      await resetUserPassword(resetTarget.id, resetPwd.trim());
      setResetTarget(null);
      setResetPwd("");
      // Đổi mật khẩu chính tài khoản đang đăng nhập → phiên hiện tại bị vô hiệu,
      // tự đăng xuất ngay thay vì để user phải F5.
      if (isSelf) {
        setToast({
          message: "Đổi mật khẩu thành công. Đang đăng xuất...",
          variant: "success",
        });
        setTimeout(() => {
          clearToken();
          router.replace("/login");
        }, 1200);
        return;
      }
      setToast({
        message:
          "Đặt lại mật khẩu thành công. Người dùng sẽ phải đăng nhập lại.",
        variant: "success",
      });
    } catch (err) {
      setToast({
        message:
          err instanceof ApiError ? err.message : "Đặt lại mật khẩu thất bại",
        variant: "error",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const deleteSelected = async () => {
    setIsDeleting(true);
    // Phòng thủ: loại bỏ user cấp cao đã thấy trên trang (BE vẫn là chốt chặn cuối).
    const ids = Array.from(selectedIds).filter((id) => {
      const u = users.find((x) => x.id === id);
      return !u || !isHighRoleUser(u);
    });
    const results = await Promise.allSettled(ids.map((id) => deleteUser(id)));
    const failed = results.filter((r) => r.status === "rejected").length;
    setIsDeleting(false);
    setDeleteConfirmOpen(false);
    setSelectedIds(new Set());
    if (failed > 0) {
      setToast({
        message: `Xóa thất bại ${failed} tài khoản`,
        variant: "error",
      });
    } else {
      setToast({
        message: `Đã xóa ${ids.length} tài khoản`,
        variant: "success",
      });
    }
    loadUsers();
  };

  return (
    <>
      {view === "list" ? (
        <>
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <h1 className="text-base font-semibold text-ink">
              Danh sách người dùng
            </h1>
            <div className="flex gap-2.5">
              <input
                ref={importRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={() =>
                  setToast({
                    message: "Đã nhận file. Vui lòng chờ xử lý.",
                    variant: "success",
                  })
                }
              />
              <button
                type="button"
                onClick={() => importRef.current?.click()}
                className="flex h-9 items-center gap-1.5 rounded-md border border-primary bg-white px-4 text-[13px] font-medium text-primary hover:bg-[#eff6ff]"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import
              </button>
              <button
                type="button"
                onClick={openAdd}
                disabled={!canCreate}
                title={canCreate ? undefined : "Bạn không có quyền thêm"}
                className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Thêm mới
              </button>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr>
                      <th className="w-11 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left">
                        <TriCheckbox
                          checked={allPageChecked}
                          indeterminate={
                            selectedIds.size > 0 && !allPageChecked
                          }
                          onChange={toggleAll}
                        />
                      </th>
                      <th className="w-20 whitespace-nowrap border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                        Thao tác
                      </th>
                      <th className="whitespace-nowrap border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                        Họ và tên
                      </th>
                      <th className="whitespace-nowrap border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                        Tài khoản
                      </th>
                      <th className="whitespace-nowrap border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                        Email
                      </th>
                      <th className="whitespace-nowrap border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                        Vai trò
                      </th>
                      <th className="whitespace-nowrap border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                        Chức danh
                      </th>
                      <th className="whitespace-nowrap border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                        Tỉnh/Thành phố
                      </th>
                      <th className="whitespace-nowrap border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-center text-[13px] font-semibold text-[#374151]">
                        Trạng thái
                      </th>
                    </tr>
                    <tr>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input
                          className={FILTER_INPUT_CLASS}
                          value={fFullName}
                          onChange={(e) => {
                            setFFullName(e.target.value);
                            setCurrentPage(1);
                          }}
                        />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input
                          className={FILTER_INPUT_CLASS}
                          value={fUsername}
                          onChange={(e) => {
                            setFUsername(e.target.value);
                            setCurrentPage(1);
                          }}
                        />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input
                          className={FILTER_INPUT_CLASS}
                          value={fEmail}
                          onChange={(e) => {
                            setFEmail(e.target.value);
                            setCurrentPage(1);
                          }}
                        />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <select
                          className={`${FILTER_INPUT_CLASS} cursor-pointer bg-white`}
                          value={fRoleId}
                          onChange={(e) => {
                            setFRoleId(e.target.value);
                            setCurrentPage(1);
                          }}
                        >
                          <option value="">Tất cả</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.ten}
                            </option>
                          ))}
                        </select>
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input
                          className={FILTER_INPUT_CLASS}
                          value={fJobTitle}
                          onChange={(e) => {
                            setFJobTitle(e.target.value);
                            setCurrentPage(1);
                          }}
                        />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <SearchableSelect
                          compact
                          fixed
                          options={PROVINCES}
                          value={fProvince}
                          placeholder="Tất cả"
                          onChange={(v) => {
                            setFProvince(v);
                            setCurrentPage(1);
                          }}
                        />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <select
                          className={`${FILTER_INPUT_CLASS} cursor-pointer bg-white`}
                          value={fActive}
                          onChange={(e) => {
                            setFActive(e.target.value);
                            setCurrentPage(1);
                          }}
                        >
                          <option value="">Tất cả</option>
                          <option value="1">Kích hoạt</option>
                          <option value="0">Ngừng</option>
                        </select>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-3.5 py-8 text-center text-[13.5px] text-muted"
                        >
                          Đang tải...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-3.5 py-8 text-center text-[13.5px] text-muted"
                        >
                          Không có dữ liệu
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const selected = selectedIds.has(u.id);
                        return (
                          <tr
                            key={u.id}
                            className={`border-b border-[#f3f4f6] ${selected ? "bg-[#eff6ff]" : "hover:bg-[#f9fafb]"}`}
                          >
                            <td className="px-3.5 py-2.5">
                              {u.id === currentUserId || isHighRoleUser(u) ? (
                                <input
                                  type="checkbox"
                                  disabled
                                  title={
                                    u.id === currentUserId
                                      ? "Không thể tự xóa tài khoản của bạn"
                                      : "Người dùng cấp cao — đổi vai trò về cấp thường trước khi xóa"
                                  }
                                  className="h-[15px] w-[15px] cursor-not-allowed opacity-30 accent-primary"
                                />
                              ) : (
                                <TriCheckbox
                                  checked={selected}
                                  onChange={(c) => toggleRow(u.id, c)}
                                />
                              )}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <div className="flex gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => openEdit(u)}
                                  disabled={!canUpdate}
                                  title={
                                    canUpdate
                                      ? "Chỉnh sửa"
                                      : "Bạn không có quyền sửa"
                                  }
                                  className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
                                >
                                  <svg
                                    width="15"
                                    height="15"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetTarget(u);
                                    setResetPwd("");
                                    setResetPwdError(null);
                                  }}
                                  disabled={
                                    !canUpdate ||
                                    (isHighRoleUser(u) && u.id !== currentUserId)
                                  }
                                  title={
                                    !canUpdate
                                      ? "Bạn không có quyền sửa"
                                      : isHighRoleUser(u) && u.id !== currentUserId
                                        ? "Không thể đặt lại mật khẩu người dùng cấp cao"
                                        : "Đặt lại mật khẩu"
                                  }
                                  className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
                                >
                                  <svg
                                    width="15"
                                    height="15"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[#374151]"
                                  style={{
                                    background: avatarColor(u.username),
                                  }}
                                >
                                  {getInitials(u.fullName)}
                                </span>
                                <span className="text-[#374151]">
                                  {u.fullName}
                                </span>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 text-[#374151]">
                              {u.username}
                            </td>
                            <td className="px-3.5 py-2.5 text-[#374151]">
                              {u.email}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span className="inline-block rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs font-medium text-[#374151]">
                                {roleName(u)}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-[#374151]">
                              {u.jobTitle ?? "—"}
                            </td>
                            <td className="px-3.5 py-2.5 text-[#374151]">
                              {u.province ?? "—"}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <div className="flex justify-center">
                                <Switch
                                  checked={u.isActive}
                                  onChange={() => handleToggleStatus(u)}
                                  disabled={!canUpdate}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3 border-t border-[#f3f4f6] px-4 py-3 text-[13px] text-[#374151]">
                <button
                  type="button"
                  onClick={() => {
                    exportToExcel(
                      "danh-sach-nguoi-dung.xlsx",
                      [
                        "Họ và tên",
                        "Tài khoản",
                        "Email",
                        "Vai trò",
                        "Chức danh",
                        "Tỉnh/Thành phố",
                        "Trạng thái",
                      ],
                      users.map((u) => [
                        u.fullName,
                        u.username,
                        u.email,
                        roleName(u),
                        u.jobTitle ?? "",
                        u.province ?? "",
                        u.isActive ? "Kích hoạt" : "Ngừng",
                      ]),
                    );
                  }}
                  className="flex items-center gap-1.5 text-muted hover:text-primary"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export Data
                </button>
                <div className="ml-auto flex items-center gap-3">
                  <select
                    className="h-[30px] cursor-pointer rounded-[5px] border border-line px-1.5 text-[13px] outline-none"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-[#6b7280]">
                    {totalItems === 0
                      ? "0 - 0 of 0"
                      : `${start} - ${end} of ${totalItems}`}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-line bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage >= totalPages}
                      className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-line bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <h1 className="text-base font-semibold text-ink">
              Chi tiết người dùng
            </h1>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setView("list")}
                className="h-9 rounded-md border border-line bg-white px-4 text-[13px] text-[#374151] hover:bg-[#f9fafb]"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={saveUser}
                disabled={isSaving || (editingId ? !canUpdate : !canCreate)}
                className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                {isSaving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-start gap-7 rounded-[10px] bg-white p-7 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
              <div className="w-[240px] shrink-0 rounded-[10px] border border-[#e5e7eb] px-5 py-6">
                <div className="flex flex-col items-center gap-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept=".jpeg,.jpg,.png,image/jpeg,image/png"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    title="Chọn ảnh đại diện"
                    className="group relative flex h-[100px] w-[100px] overflow-hidden rounded-full bg-[#e5e7eb]"
                  >
                    <img
                      src={
                        avatarPreview ??
                        assetUrl(editingAvatarUrl) ??
                        "/avatar-default-svgrepo-com.svg"
                      }
                      alt="avatar"
                      className="block h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                      Chọn ảnh
                    </span>
                  </button>
                  {avatarFile ? (
                    <button
                      type="button"
                      onClick={clearAvatarSelection}
                      className="text-[11px] font-medium text-danger hover:underline"
                    >
                      Bỏ ảnh đã chọn
                    </button>
                  ) : null}
                  <div className="text-center text-[11px] text-[#9ca3af]">
                    *.jpeg, *.jpg, *.png.
                    <br />
                    Kích thước tối đa 5 MB
                  </div>
                  <div className="mt-3 flex items-center gap-2.5">
                    <span className="text-[13px] text-[#374151]">
                      Kích hoạt
                    </span>
                    <Switch
                      checked={form.isActive}
                      onChange={(c) => setField("isActive", c)}
                      disabled={editingId === currentUserId}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <div className="mb-5 text-sm font-semibold text-dark">
                  Thông tin cá nhân
                </div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted">
                      Tên đăng nhập<span className="text-danger">*</span>
                    </label>
                    <input
                      className={`${FORM_CONTROL_CLASS}${fieldErrors.username ? " border-danger" : ""}`}
                      value={form.username}
                      disabled={editingId !== null}
                      onChange={(e) => {
                        setField("username", e.target.value);
                        clearFieldError("username");
                      }}
                    />
                    {fieldErrors.username && (
                      <FormHelperText
                        error
                        sx={{ mt: 0, mx: 0, fontSize: "11px" }}
                      >
                        {fieldErrors.username}
                      </FormHelperText>
                    )}
                  </div>
                  {editingId === null ? (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted">
                        Mật khẩu<span className="text-danger">*</span>
                      </label>
                      <PasswordField
                        value={password}
                        onChange={(v) => {
                          setPassword(v);
                          clearFieldError("password");
                        }}
                        placeholder="Nhập mật khẩu"
                        autoComplete="new-password"
                        hasError={!!fieldErrors.password}
                      />
                      {fieldErrors.password && (
                        <FormHelperText
                          error
                          sx={{ mt: 0, mx: 0, fontSize: "11px" }}
                        >
                          {fieldErrors.password}
                        </FormHelperText>
                      )}
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted">
                      Họ và tên<span className="text-danger">*</span>
                    </label>
                    <input
                      className={`${FORM_CONTROL_CLASS}${fieldErrors.fullName ? " border-danger" : ""}`}
                      value={form.fullName}
                      onChange={(e) => {
                        setField("fullName", e.target.value);
                        clearFieldError("fullName");
                      }}
                    />
                    {fieldErrors.fullName && (
                      <FormHelperText
                        error
                        sx={{ mt: 0, mx: 0, fontSize: "11px" }}
                      >
                        {fieldErrors.fullName}
                      </FormHelperText>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted">
                      Ngày tháng năm sinh
                    </label>
                    <DateInput
                      value={form.dob}
                      onChange={(v) => {
                        setField("dob", v);
                        clearFieldError("dob");
                      }}
                      max={localISODate(new Date())}
                      error={!!fieldErrors.dob}
                    />
                    {fieldErrors.dob && (
                      <FormHelperText
                        error
                        sx={{ mt: 0, mx: 0, fontSize: "11px" }}
                      >
                        {fieldErrors.dob}
                      </FormHelperText>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted">
                      Giới tính{!editingId ? <span className="text-danger">*</span> : null}
                    </label>
                    <select
                      className={`${SELECT_CLASS}${fieldErrors.gender ? " border-danger" : ""}`}
                      value={form.gender}
                      onChange={(e) => {
                        setField("gender", e.target.value);
                        clearFieldError("gender");
                      }}
                    >
                      <option value="">Giới tính</option>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.gender && (
                      <FormHelperText error sx={{ mt: 0, mx: 0, fontSize: "11px" }}>
                        {fieldErrors.gender}
                      </FormHelperText>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted">Chức danh</label>
                    <input
                      className={FORM_CONTROL_CLASS}
                      placeholder="Chức danh"
                      value={form.jobTitle}
                      onChange={(e) => setField("jobTitle", e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted">Vai trò</label>
                    <select
                      className={SELECT_CLASS}
                      value={form.roleId}
                      onChange={(e) =>
                        setField(
                          "roleId",
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                    >
                      <option value="">-- Chọn vai trò --</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.ten}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-xs text-muted">
                      Email <span className="text-danger">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        className={`${FORM_CONTROL_CLASS} flex-1${fieldErrors.email ? " border-danger" : ""}`}
                        value={form.email}
                        disabled={editingId !== null}
                        onChange={(e) => {
                          setField("email", e.target.value);
                          clearFieldError("email");
                        }}
                      />
                      {editingId !== null ? (
                        <button
                          type="button"
                          onClick={() =>
                            setToast({
                              message: "Mở luồng đổi email OTP",
                              variant: "success",
                            })
                          }
                          className="whitespace-nowrap text-[13px] font-medium text-primary hover:underline"
                        >
                          Thay đổi
                        </button>
                      ) : null}
                    </div>
                    {fieldErrors.email && (
                      <FormHelperText
                        error
                        sx={{ mt: 0, mx: 0, fontSize: "11px" }}
                      >
                        {fieldErrors.email}
                      </FormHelperText>
                    )}
                  </div>
                </div>

                <hr className="my-7 border-t border-[#f3f4f6]" />

                <div className="mb-5 text-sm font-semibold text-dark">
                  Thông tin liên hệ
                </div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted">Tỉnh thành phố</label>
                    <SearchableSelect
                      dropUp
                      options={PROVINCES}
                      value={form.province}
                      placeholder="-- Chọn tỉnh --"
                      onChange={(v) => {
                        setField("province", v);
                        setField("ward", "");
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted">Phường / Xã</label>
                    <SearchableSelect
                      dropUp
                      options={WARDS_BY_PROVINCE[form.province] ?? []}
                      value={form.ward}
                      placeholder="-- Chọn phường/xã --"
                      disabled={!form.province}
                      onChange={(v) => setField("ward", v)}
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-xs text-muted">Địa chỉ</label>
                    <input
                      className={FORM_CONTROL_CLASS}
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
      )}

      {/* Modal đặt lại mật khẩu */}
      <div
        className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/45 transition-opacity duration-200 ${
          resetTarget ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`w-[400px] overflow-hidden rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
            resetTarget ? "translate-y-0" : "translate-y-3"
          }`}
        >
          <div className="bg-primary px-5 py-4 text-center">
            <h3 className="text-base font-semibold text-white">Xác nhận</h3>
          </div>
          <div className="px-6 py-5">
            <p className="mb-3.5 text-[13.5px] text-[#374151]">
              Khởi tạo mật khẩu cho tài khoản{" "}
              <strong>{resetTarget?.username}</strong>
            </p>
            <input
              className={`h-[42px] w-full rounded-md border px-3.5 text-sm outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] ${resetPwdError ? "border-danger" : "border-line"}`}
              value={resetPwd}
              onChange={(e) => {
                setResetPwd(e.target.value);
                if (resetPwdError) setResetPwdError(null);
              }}
              placeholder="Nhập mật khẩu mới mong muốn"
            />
            {resetPwdError && (
              <FormHelperText error sx={{ mt: 0.5, mx: 0, fontSize: "11px" }}>
                {resetPwdError}
              </FormHelperText>
            )}
          </div>
          <div className="flex justify-end gap-3 px-6 pb-5">
            <button
              type="button"
              onClick={() => setResetTarget(null)}
              className="h-[38px] rounded-md px-5 text-sm font-medium text-muted hover:bg-[#f9fafb] hover:text-[#374151]"
            >
              Huỷ bỏ
            </button>
            <button
              type="button"
              onClick={confirmResetPwd}
              disabled={isResetting}
              className="h-[38px] rounded-md bg-primary px-6 text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60"
            >
              {isResetting ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>

      {/* Floating bulk-action bar */}
      {selectedIds.size > 0 && view === "list" ? (
        <div className="fixed bottom-6 left-1/2 z-300 -translate-x-1/2">
          <div className="flex items-center gap-0 overflow-hidden rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.18)]">
            <div className="flex h-10 min-w-9 items-center justify-center bg-primary px-3 text-sm font-bold text-white">
              {selectedIds.size}
            </div>
            <div className="flex h-10 items-center bg-white px-3 text-[13px] font-medium text-ink">
              dữ liệu được chọn
            </div>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={!canDelete}
              title={canDelete ? undefined : "Bạn không có quyền xóa"}
              className="flex h-10 items-center gap-1.5 bg-danger px-3.5 text-[13px] font-semibold text-white hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-danger"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
              Xoá
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              aria-label="Bỏ chọn"
              className="flex h-10 w-10 items-center justify-center bg-white text-muted hover:bg-body hover:text-ink"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      {/* Modal xác nhận xóa */}
      <div
        className={`fixed inset-0 z-400 flex items-center justify-center bg-black/45 transition-opacity duration-200 ${
          deleteConfirmOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`w-100 overflow-hidden rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
            deleteConfirmOpen ? "translate-y-0" : "translate-y-3"
          }`}
        >
          <div className="bg-primary px-5 py-4 text-center">
            <h3 className="text-base font-semibold text-white">Xác nhận xóa</h3>
          </div>
          <div className="px-6 py-5">
            <p className="text-[13.5px] text-[#374151]">
              Bạn có chắc muốn xóa <strong>{selectedIds.size}</strong> tài khoản
              đã chọn? Hành động này không thể hoàn tác.
            </p>
          </div>
          <div className="flex justify-end gap-3 px-6 pb-5">
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              className="h-[38px] rounded-md px-5 text-sm font-medium text-muted hover:bg-[#f9fafb] hover:text-[#374151]"
            >
              Huỷ bỏ
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              disabled={isDeleting}
              className="h-[38px] rounded-md bg-danger px-6 text-sm font-semibold text-white hover:bg-[#dc2626] disabled:opacity-60"
            >
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </button>
          </div>
        </div>
      </div>

      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant}
        onDone={() => setToast(null)}
      />
    </>
  );
}
