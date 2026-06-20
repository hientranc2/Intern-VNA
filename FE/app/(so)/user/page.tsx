"use client";

import * as XLSX from "xlsx";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { Autocomplete, FormHelperText, MenuItem } from "@mui/material";
import useDebounce from "@/libs/shared/core/hooks/useDebounce";
import { TriCheckbox } from "@/libs/shared/core/components/TriCheckbox/TriCheckbox";
import { PasswordField } from "@/libs/shared/core/components/PasswordField/PasswordField";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { GENDER_OPTIONS, type User } from "@/libs/tts/user/userData";
import { type Role } from "@/libs/tts/role/roleData";
import { getRoleList } from "@/libs/tts/role/roleApi";
import { PROVINCES, WARDS_BY_PROVINCE } from "@/libs/tts/location/locationData";
import { TextField } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import {
  getUserList,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  deleteUser,
  importUsers,
} from "@/libs/tts/user/userApi";
import { ApiError, assetUrl } from "@/libs/tts/auth/apiClient";
import { getProfile, clearToken, getIsSuper } from "@/libs/tts/auth/authApi";
import { useCan } from "@/libs/tts/auth/abilityContext";
import {
  isValidEmail,
  isStrongPassword,
  PASSWORD_RULE_MESSAGE,
} from "@/libs/tts/auth/authValidation";
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
  roleId?: string;
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
  // User hiện tại là ADMIN/Super Admin? — họ được phép sửa/xóa mọi user kể cả cấp cao.
  const isPrivileged = useSyncExternalStore(
    () => () => {},
    () => getIsSuper(),
    () => false,
  );
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

  // Import preview states
  const [importFileName, setImportFileName] = useState("");
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<Record<number, Record<string, string>>>({});
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);

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

  // User cấp cao (ADMIN / CEO / Quản trị viên hệ thống): vai trò is_super.
  const isHighRoleUser = (u: User) =>
    u.role === "ADMIN" ||
    Boolean(roles.find((r) => r.id === u.roleId)?.isSuper);

  // User giữ vai trò SUPER_ADMIN cụ thể — bất khả xâm phạm, không ai được xóa/reset pw.
  const isSuperAdminUser = (u: User) =>
    roles.find((r) => r.id === u.roleId)?.ma === "SUPER_ADMIN";

  // Người đang đăng nhập có phải Super Admin không? (chỉ Super Admin mới quản lý được admin cùng cấp)
  const currentIsSuperAdmin = Boolean(
    currentUserId &&
    users.find(
      (u) =>
        u.id === currentUserId &&
        roles.find((r) => r.id === u.roleId)?.ma === "SUPER_ADMIN",
    ),
  );

  // Khi đang edit: target user có phải admin cùng cấp không?
  // → Nếu có + người gọi KHÔNG phải Super Admin → disable Vai trò + Email.
  const editingIsHighRole = Boolean(
    editingId && users.find((u) => u.id === editingId && isHighRoleUser(u)),
  );
  const lockRoleAndEmail = editingIsHighRole && !currentIsSuperAdmin;

  // Cho phép chọn user để xóa:
  // - Không chọn chính mình
  // - Không chọn Super Admin (bất khả xâm phạm)
  // - Chỉ Super Admin mới chọn được admin cùng cấp
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  const selectableUsers = users.filter(
    (u) =>
      u.id !== currentUserId &&
      !isSuperAdminUser(u) &&
      (!isHighRoleUser(u) || currentIsSuperAdmin),
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
        if (
          u.id === currentUserId ||
          isSuperAdminUser(u) ||
          (isHighRoleUser(u) && !currentIsSuperAdmin)
        )
          return;
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

  const normalizeUserRows = (rawRows: any[]) => {
    return rawRows.map((row) => {
      const pick = (candidates: string[]) => {
        for (const k of Object.keys(row)) {
          if (candidates.map(c => c.toLowerCase().trim()).includes(k.toLowerCase().trim())) {
            return String(row[k] ?? "").trim();
          }
        }
        return "";
      };

      return {
        'Tên đăng nhập': pick(['Tên đăng nhập', 'Username', 'Tài khoản']),
        'Họ và tên': pick(['Họ và tên', 'Họ tên', 'Tên đầy đủ']),
        'Email': pick(['Email', 'E-mail']),
        'Vai trò': pick(['Vai trò', 'Role']),
        'Chức danh': pick(['Chức danh', 'Chức vụ']),
        'Tỉnh/Thành': pick(['Tỉnh/Thành', 'Tỉnh', 'Thành phố']),
        'Phường/Xã': pick(['Phường/Xã', 'Phường', 'Xã']),
        'Địa chỉ': pick(['Địa chỉ']),
        'Ngày sinh': pick(['Ngày sinh']),
        'Giới tính': pick(['Giới tính']),
      };
    });
  };

  const validateUserImport = (rows: any[]) => {
    const errs: Record<number, Record<string, string>> = {};
    const seenUsernames = new Set<string>();
    const seenEmails = new Set<string>();

    rows.forEach((row, idx) => {
      const rowErrs: Record<string, string> = {};
      const username = (row['Tên đăng nhập'] || '').toString().trim();
      const email = (row['Email'] || '').toString().trim().toLowerCase();
      const fullName = (row['Họ và tên'] || '').toString().trim();
      const roleMa = (row['Vai trò'] || '').toString().trim();

      if (!username) {
        rowErrs['Tên đăng nhập'] = 'Thiếu tên đăng nhập';
      } else if (!/^[a-zA-Z0-9_ ]+$/.test(username)) {
        rowErrs['Tên đăng nhập'] = 'Chỉ được chứa chữ, số, khoảng trắng và _';
      } else if (seenUsernames.has(username)) {
        rowErrs['Tên đăng nhập'] = 'Trùng tên đăng nhập trong file';
      } else {
        seenUsernames.add(username);
      }

      if (!email) {
        rowErrs['Email'] = 'Thiếu email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrs['Email'] = 'Email không hợp lệ';
      } else if (seenEmails.has(email)) {
        rowErrs['Email'] = 'Trùng email trong file';
      } else {
        seenEmails.add(email);
      }

      if (!fullName) {
        rowErrs['Họ và tên'] = 'Thiếu họ và tên';
      }

      if (roleMa) {
        const roleExists = roles.some((r) => r.ma === roleMa);
        if (!roleExists) {
          rowErrs['Vai trò'] = `Vai trò "${roleMa}" không tồn tại`;
        }
      }

      if (Object.keys(rowErrs).length > 0) {
        errs[idx] = rowErrs;
      }
    });

    return errs;
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error("Không đọc được dữ liệu file");
        
        const workbook = XLSX.read(new Uint8Array(data as ArrayBuffer), { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("File không có sheet nào");

        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
        if (rawRows.length === 0) throw new Error("File không có dòng dữ liệu nào");

        const normalized = normalizeUserRows(rawRows);
        const errs = validateUserImport(normalized);

        setImportRows(normalized);
        setImportErrors(errs);
        setImportPreviewOpen(true);
      } catch (err) {
        setToast({
          message: err instanceof Error ? err.message : "Đọc file Excel thất bại",
          variant: "error",
        });
      } finally {
        setIsLoading(false);
        if (importRef.current) importRef.current.value = "";
      }
    };

    reader.onerror = () => {
      setToast({ message: "Không thể đọc file", variant: "error" });
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleCellChange = (rowIdx: number, field: string, val: string) => {
    const updated = [...importRows];
    updated[rowIdx] = { ...updated[rowIdx], [field]: val };
    setImportRows(updated);

    const clientErrs = validateUserImport(updated);
    const newErrs: Record<number, Record<string, string>> = {};

    Object.keys(importErrors).forEach((idxStr) => {
      const idx = parseInt(idxStr, 10);
      const rowErrs = importErrors[idx];
      if (rowErrs) {
        Object.keys(rowErrs).forEach((col) => {
          const isEditedCell = idx === rowIdx && col === field;
          const isDbError = rowErrs[col].includes("tồn tại trong hệ thống");
          if (isDbError && !isEditedCell) {
            if (!newErrs[idx]) newErrs[idx] = {};
            newErrs[idx][col] = rowErrs[col];
          }
        });
      }
    });

    Object.keys(clientErrs).forEach((idxStr) => {
      const idx = parseInt(idxStr, 10);
      if (!newErrs[idx]) newErrs[idx] = {};
      newErrs[idx] = { ...newErrs[idx], ...clientErrs[idx] };
    });

    setImportErrors(newErrs);
  };

  const confirmImport = async () => {
    const errs = validateUserImport(importRows);
    if (Object.keys(errs).length > 0) {
      setImportErrors(errs);
      setToast({ message: "Vui lòng sửa hết lỗi trước khi import!", variant: "error" });
      return;
    }

    setIsImportSubmitting(true);
    try {
      const worksheet = XLSX.utils.json_to_sheet(importRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const file = new File([blob], importFileName || "users.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      const res = await importUsers(file);
      setToast({
        message: res.message || "Import thành công người dùng",
        variant: "success",
      });
      setImportPreviewOpen(false);
      loadUsers();
    } catch (err) {
      if (err instanceof ApiError && err.message) {
        const lines = err.message.split("\n");
        const newErrs = { ...importErrors };
        let hasMappedErrors = false;

        lines.forEach((line) => {
          const match = line.match(/^Dòng\s+(\d+):\s*"([^"]+)"\s*(.+)$/);
          if (match) {
            const rowIdx = parseInt(match[1], 10) - 1;
            const column = match[2];
            const msg = match[3];

            if (rowIdx >= 0 && rowIdx < importRows.length) {
              if (!newErrs[rowIdx]) newErrs[rowIdx] = {};
              newErrs[rowIdx][column] = msg;
              hasMappedErrors = true;
            }
          }
        });

        if (hasMappedErrors) {
          setImportErrors(newErrs);
          setToast({ message: "Phát hiện một số lỗi dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra các ô màu đỏ.", variant: "error" });
          return;
        }
      }
      setToast({
        message: err instanceof ApiError ? err.message : "Import thất bại",
        variant: "error",
      });
    } finally {
      setIsImportSubmitting(false);
    }
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
    // Trim đầu/cuối + gộp nhiều khoảng trắng liên tiếp thành 1 khoảng trắng.
    const fullName = form.fullName.trim().replace(/\s+/g, " ");
    const email = form.email.trim();
    const username = form.username.trim();

    const errors: FieldErrors = {};
    if (!username) {
      errors.username = "Tên đăng nhập không được để trống";
    } else if (!/^[a-zA-Z0-9_ ]+$/.test(username)) {
      errors.username =
        "Tên đăng nhập chỉ được chứa chữ cái, chữ số, khoảng trắng và dấu gạch dưới (_)";
    }
    if (!fullName) {
      errors.fullName = "Họ và tên không được để trống";
    } else if (/\d/.test(fullName)) {
      errors.fullName = "Họ và tên không được chứa số";
    } else if (
      !/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ ]+$/.test(
        fullName,
      )
    ) {
      errors.fullName = "Họ và tên chỉ được chứa chữ cái và khoảng trắng";
    }
    if (!email) errors.email = "Email không được để trống";
    else if (!isValidEmail(email)) errors.email = "Email không đúng định dạng";
    // Tạo mới: bắt buộc giới tính + mật khẩu mạnh. Sửa: đổi mật khẩu xử lý ở luồng riêng.
    if (!editingId && !form.gender) errors.gender = "Vui lòng chọn giới tính";
    if (!editingId) {
      if (!password) errors.password = "Mật khẩu không được để trống";
      else if (!isStrongPassword(password))
        errors.password = PASSWORD_RULE_MESSAGE;
    }
    if (form.dob && form.dob > localISODate(new Date()))
      errors.dob = "Ngày sinh không được là ngày tương lai";

    if (!form.roleId) errors.roleId = "Vui lòng chọn vai trò";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setField("fullName", fullName); // đồng bộ lại input với giá trị đã làm sạch
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
    // Phòng thủ: loại Super Admin + admin cùng cấp (nếu người gọi không phải Super Admin).
    const ids = Array.from(selectedIds).filter((id) => {
      const u = users.find((x) => x.id === id);
      if (!u) return true;
      if (isSuperAdminUser(u)) return false;
      if (isHighRoleUser(u) && !currentIsSuperAdmin) return false;
      return true;
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
                onChange={handleImport}
              />
              <button
                type="button"
                onClick={() => importRef.current?.click()}
                disabled={!canCreate}
                title={canCreate ? undefined : "Bạn không có quyền thêm mới người dùng"}
                className="flex h-9 items-center gap-1.5 rounded-md border border-primary bg-white px-4 text-[13px] font-medium text-primary hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
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
                              {u.id === currentUserId ||
                              isSuperAdminUser(u) ||
                              (isHighRoleUser(u) && !currentIsSuperAdmin) ? (
                                <input
                                  type="checkbox"
                                  disabled
                                  title={
                                    u.id === currentUserId
                                      ? "Không thể tự xóa tài khoản của bạn"
                                      : isSuperAdminUser(u)
                                        ? "Tài khoản Super Admin không thể xóa"
                                        : "Chỉ Super Admin mới được xóa người dùng cấp cao"
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
                                    (isSuperAdminUser(u) &&
                                      u.id !== currentUserId) ||
                                    (isHighRoleUser(u) &&
                                      !currentIsSuperAdmin &&
                                      u.id !== currentUserId)
                                  }
                                  title={
                                    !canUpdate
                                      ? "Bạn không có quyền sửa"
                                      : isSuperAdminUser(u) &&
                                          u.id !== currentUserId
                                        ? "Không thể đặt lại mật khẩu tài khoản Super Admin"
                                        : isHighRoleUser(u) &&
                                            !currentIsSuperAdmin &&
                                            u.id !== currentUserId
                                          ? "Chỉ Super Admin mới được đặt lại mật khẩu người dùng cấp cao"
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
                            <td className="px-3.5 py-2.5 text-[#374151]">
                              {roleName(u)}
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

                <div className="grid grid-cols-2 gap-x-5 gap-y-6">
                  <TextField
                    label="Tên đăng nhập"
                    value={form.username}
                    disabled={editingId !== null}
                    onChange={(e) => {
                      setField("username", e.target.value);
                      clearFieldError("username");
                    }}
                    error={!!fieldErrors.username}
                    helperText={fieldErrors.username}
                    size="small"
                    fullWidth
                    required
                  />

                  {editingId === null ? (
                    <PasswordField
                      label="Mật khẩu"
                      value={password}
                      onChange={(v) => {
                        setPassword(v);
                        clearFieldError("password");
                      }}
                      autoComplete="new-password"
                      hasError={!!fieldErrors.password}
                      helperText={fieldErrors.password}
                      required
                    />
                  ) : null}

                  <TextField
                    label="Họ và tên"
                    value={form.fullName}
                    onChange={(e) => {
                      setField("fullName", e.target.value);
                      clearFieldError("fullName");
                    }}
                    error={!!fieldErrors.fullName}
                    helperText={fieldErrors.fullName}
                    size="small"
                    fullWidth
                    required
                  />

                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Ngày tháng năm sinh"
                      value={form.dob ? dayjs(form.dob) : null}
                      onChange={(val) => {
                        setField("dob", val ? val.format("YYYY-MM-DD") : "");
                        clearFieldError("dob");
                      }}
                      maxDate={dayjs(localISODate(new Date()))}
                      format="DD/MM/YYYY"
                      slotProps={{
                        textField: {
                          size: "small",
                          fullWidth: true,
                          error: !!fieldErrors.dob,
                          helperText: fieldErrors.dob,
                        },
                      }}
                    />
                  </LocalizationProvider>

                  <TextField
                    label={!editingId ? "Giới tính *" : "Giới tính"}
                    select
                    value={form.gender}
                    onChange={(e) => {
                      setField("gender", e.target.value);
                      clearFieldError("gender");
                    }}
                    error={!!fieldErrors.gender}
                    helperText={fieldErrors.gender}
                    size="small"
                    fullWidth
                  >
                    <MenuItem value="">Giới tính</MenuItem>
                    {GENDER_OPTIONS.map((g) => (
                      <MenuItem key={g} value={g}>
                        {g}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    label="Chức danh"
                    value={form.jobTitle}
                    onChange={(e) => setField("jobTitle", e.target.value)}
                    size="small"
                    fullWidth
                  />

                  <TextField
                    label="Vai trò *"
                    select
                    value={form.roleId}
                    disabled={lockRoleAndEmail}
                    onChange={(e) => {
                      setField(
                        "roleId",
                        e.target.value === "" ? "" : Number(e.target.value),
                      );
                      clearFieldError("roleId");
                    }}
                    error={!!fieldErrors.roleId}
                    helperText={
                      fieldErrors.roleId
                        ? fieldErrors.roleId
                        : lockRoleAndEmail
                          ? "Chỉ Super Admin mới đổi được vai trò"
                          : ""
                    }
                    size="small"
                    fullWidth
                  >
                    <MenuItem value="">-- Chọn vai trò --</MenuItem>
                    {roles.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.ten}
                      </MenuItem>
                    ))}
                  </TextField>

                  <div className="flex items-start gap-2">
                    <TextField
                      label="Email"
                      type="email"
                      value={form.email}
                      disabled={editingId !== null || lockRoleAndEmail}
                      onChange={(e) => {
                        setField("email", e.target.value);
                        clearFieldError("email");
                      }}
                      error={!!fieldErrors.email}
                      helperText={fieldErrors.email}
                      size="small"
                      fullWidth
                      required
                    />
                    {editingId !== null && !lockRoleAndEmail ? (
                      <button
                        type="button"
                        onClick={() =>
                          setToast({
                            message: "Mở luồng đổi email OTP",
                            variant: "success",
                          })
                        }
                        className="mt-1 whitespace-nowrap text-[13px] font-medium text-primary hover:underline"
                      >
                        Thay đổi
                      </button>
                    ) : null}
                  </div>
                </div>

                <hr className="my-7 border-t border-[#f3f4f6]" />

                <div className="mb-5 text-sm font-semibold text-dark">
                  Thông tin liên hệ
                </div>

                <div className="grid grid-cols-2 gap-x-5 gap-y-6">
                  <Autocomplete
                    options={PROVINCES}
                    value={form.province || null}
                    onChange={(_, v) => {
                      setField("province", v ?? "");
                      setField("ward", "");
                    }}
                    slotProps={{
                      popper: {
                        modifiers: [
                          { name: "offset", options: { offset: [0, 8] } },
                        ],
                      },
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Tỉnh/ thành phố"
                        size="small"
                        fullWidth
                      />
                    )}
                  />

                  <Autocomplete
                    options={WARDS_BY_PROVINCE[form.province] ?? []}
                    value={form.ward || null}
                    disabled={!form.province}
                    onChange={(_, v) => setField("ward", v ?? "")}
                    slotProps={{
                      popper: {
                        modifiers: [
                          { name: "offset", options: { offset: [0, 8] } },
                        ],
                      },
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Phường / Xã"
                        size="small"
                        fullWidth
                      />
                    )}
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

            <PasswordField
              label="Mật khẩu mới"
              value={resetPwd}
              onChange={(v) => {
                setResetPwd(v);
                if (resetPwdError) setResetPwdError(null);
              }}
              autoComplete="new-password"
              hasError={!!resetPwdError}
              helperText={resetPwdError ?? undefined}
            />
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

      {/* Modal Preview & Sửa lỗi Import */}
      {importPreviewOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/45 transition-opacity duration-200">
          <div className="w-11/12 max-w-6xl h-[85vh] flex flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="bg-primary px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Kiểm tra dữ liệu Import: {importFileName}</h3>
              <button
                type="button"
                onClick={() => setImportPreviewOpen(false)}
                className="text-white hover:text-white/80 transition-colors"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <div className="bg-[#f8fafc] px-6 py-3 border-b border-line flex items-center justify-between text-[13px] text-ink font-medium">
              <div className="flex gap-4">
                <span>Tổng số dòng: <strong className="text-primary">{importRows.length}</strong></span>
                <span>Hợp lệ: <strong className="text-success">{importRows.length - Object.keys(importErrors).length}</strong></span>
                <span>Lỗi: <strong className="text-danger">{Object.keys(importErrors).length}</strong></span>
              </div>
            
            </div>

            <div className="flex-1 overflow-auto p-6 bg-body">
              <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-sm">
                <table className="w-full border-collapse text-[13px] min-w-[1200px]">
                  <thead>
                    <tr className="bg-[#f9fafb] border-b border-line">
                      <th className="border-r border-line px-3 py-2.5 text-center text-ink font-semibold w-12">STT</th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-40">Tên đăng nhập *</th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-48">Họ và tên *</th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-56">Email *</th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-32">Vai trò</th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-36">Chức danh</th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-36">Tỉnh/Thành</th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-36">Phường/Xã</th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-48">Địa chỉ</th>
                      <th className="border-r border-line px-3 py-2.5 text-left text-ink font-semibold w-36">Ngày sinh</th>
                      <th className="px-3 py-2.5 text-left text-ink font-semibold w-28">Giới tính</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((row, idx) => {
                      const rowErrs = importErrors[idx] || {};
                      const hasErr = Object.keys(rowErrs).length > 0;
                      return (
                        <tr key={idx} className={`border-b border-line ${hasErr ? "bg-red-50/20" : "hover:bg-[#f9fafb]"}`}>
                          <td className="border-r border-line px-3 py-3 text-center text-muted font-medium bg-[#f9fafb]">{idx + 1}</td>
                          {[
                            { key: 'Tên đăng nhập', type: 'text' },
                            { key: 'Họ và tên', type: 'text' },
                            { key: 'Email', type: 'text' },
                            { key: 'Vai trò', type: 'text' },
                            { key: 'Chức danh', type: 'text' },
                            { key: 'Tỉnh/Thành', type: 'text' },
                            { key: 'Phường/Xã', type: 'text' },
                            { key: 'Địa chỉ', type: 'text' },
                            { key: 'Ngày sinh', type: 'text' },
                            { key: 'Giới tính', type: 'text' },
                          ].map((field, colIdx) => {
                            const err = rowErrs[field.key];
                            const isLast = colIdx === 9;
                            return (
                              <td key={field.key} className={`p-2 relative align-top ${isLast ? "" : "border-r border-line"}`}>
                                <input
                                  type="text"
                                  value={row[field.key] || ""}
                                  onChange={(e) => handleCellChange(idx, field.key, e.target.value)}
                                  className={`w-full h-8 px-2 rounded border text-[12.5px] outline-none transition-all ${
                                    err
                                      ? "border-danger bg-red-50/40 focus:border-danger focus:ring-2 focus:ring-danger/10"
                                      : "border-line focus:border-primary focus:ring-2 focus:ring-primary/10"
                                  }`}
                                />
                                {err && (
                                  <div className="text-[11px] text-danger font-medium mt-1.5 leading-tight">{err}</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-line bg-[#f8fafc]">
              <button
                type="button"
                onClick={() => setImportPreviewOpen(false)}
                className="h-[38px] rounded-md px-5 text-sm font-medium text-muted hover:bg-white hover:text-ink border border-line transition-colors bg-white"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={isImportSubmitting || Object.keys(importErrors).length > 0}
                className="h-[38px] rounded-md bg-primary px-6 text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isImportSubmitting ? "Đang import..." : "Xác nhận & Gửi"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant}
        onDone={() => setToast(null)}
      />
    </>
  );
}
