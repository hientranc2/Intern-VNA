"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppTopbar } from "@/libs/tts/components/AppTopbar/AppTopbar";
import { AppSidebar } from "@/libs/tts/components/AppSidebar/AppSidebar";
import { TriCheckbox } from "@/libs/core/components/TriCheckbox/TriCheckbox";
import { PasswordField } from "@/libs/core/components/PasswordField/PasswordField";
import { Alert } from "@/libs/core/components/Alert/Alert";
import {
  INITIAL_USERS,
  ROLE_OPTIONS,
  PROVINCE_OPTIONS,
  WARD_OPTIONS,
  GENDER_OPTIONS,
  type User,
} from "@/libs/tts/user/userData";
import { isValidEmail } from "@/libs/tts/auth/authValidation";
import { getToken, clearToken } from "@/libs/tts/auth/authApi";

type ViewMode = "list" | "detail";

const EMPTY_FORM: Omit<User, "id"> = {
  username: "",
  fullname: "",
  email: "",
  role: "",
  chucdanh: "",
  active: true,
  dob: "",
  gender: "",
  tinh: "Thành phố Hồ Chí Minh",
  phuong: "Phường Gò Vấp",
  diachi: "",
};

const FILTER_INPUT_CLASS =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] text-ink outline-none focus:border-[#3b82f6]";
const FORM_CONTROL_CLASS =
  "h-10 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] disabled:bg-[#f9fafb] disabled:text-muted";
const SELECT_CLASS = `${FORM_CONTROL_CLASS} cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8`;

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = ["#fecaca", "#fed7aa", "#fde68a", "#bbf7d0", "#bfdbfe", "#ddd6fe"];
function avatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i += 1) hash = (hash + username.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-[38px] rounded-full transition-colors ${checked ? "bg-primary" : "bg-[#d1d5db]"}`}
    >
      <span
        className={`absolute top-[3px] h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-[21px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

export default function UserPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [view, setView] = useState<ViewMode>("list");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  // List filters
  const [fFullname, setFFullname] = useState("");
  const [fUsername, setFUsername] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fRole, setFRole] = useState("");
  const [fChucDanh, setFChucDanh] = useState("");
  const [fActive, setFActive] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Detail form
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<User, "id">>(EMPTY_FORM);
  const [password, setPassword] = useState("");
  const [detailError, setDetailError] = useState<string | null>(null);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };

  const setField = <K extends keyof Omit<User, "id">>(key: K, value: Omit<User, "id">[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.fullname.toLowerCase().includes(fFullname.toLowerCase()) &&
        u.username.toLowerCase().includes(fUsername.toLowerCase()) &&
        u.email.toLowerCase().includes(fEmail.toLowerCase()) &&
        (!fRole || u.role === fRole) &&
        u.chucdanh.toLowerCase().includes(fChucDanh.toLowerCase()) &&
        (fActive === "" || (fActive === "1" ? u.active : !u.active)),
    );
  }, [users, fFullname, fUsername, fEmail, fRole, fChucDanh, fActive]);

  const total = filteredUsers.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(currentPage, lastPage);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pagedUsers = filteredUsers.slice(start, end);
  const allPageChecked = pagedUsers.length > 0 && pagedUsers.every((u) => selectedIds.has(u.id));

  const toggleRow = (id: number, checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pagedUsers.forEach((u) => (checked ? next.add(u.id) : next.delete(u.id)));
      return next;
    });

  const toggleStatus = (id: number, active: boolean) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active } : u)));

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Xoá ${selectedIds.size} người dùng đã chọn?`)) return;
    setUsers((prev) => prev.filter((u) => !selectedIds.has(u.id)));
    setSelectedIds(new Set());
    setCurrentPage(1);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPassword("");
    setDetailError(null);
    setView("detail");
  };

  const openEdit = (user: User) => {
    setEditingId(user.id);
    setForm(user);
    setPassword("");
    setDetailError(null);
    setView("detail");
  };

  const saveUser = () => {
    const username = form.username.trim();
    const fullname = form.fullname.trim();
    const email = form.email.trim();
    if (!username || !fullname || !email || !form.role) {
      setDetailError("Vui lòng nhập đầy đủ các trường bắt buộc (*)");
      return;
    }
    if (!isValidEmail(email)) {
      setDetailError("Email không đúng định dạng");
      return;
    }
    const payload = { ...form, username, fullname, email };
    if (editingId) {
      setUsers((prev) => prev.map((u) => (u.id === editingId ? { ...u, ...payload } : u)));
      setView("list");
      setToast("Cập nhật thành công");
      return;
    }
    if (!password) {
      setDetailError("Vui lòng nhập mật khẩu");
      return;
    }
    if (users.some((u) => u.username === username)) {
      setDetailError("Tên đăng nhập đã tồn tại");
      return;
    }
    setUsers((prev) => [...prev, { id: Date.now(), ...payload }]);
    setView("list");
    setToast("Thêm mới thành công");
  };

  const confirmResetPwd = () => {
    if (!resetPwd.trim()) {
      setResetError("Vui lòng nhập mật khẩu mới");
      return;
    }
    setResetTarget(null);
    setResetPwd("");
    setResetError(null);
    setToast("Đặt lại mật khẩu thành công");
  };

  return (
    <div className="min-h-screen bg-body text-ink">
      <AppTopbar orgName="Ủy ban nhân dân thành phố Hồ Chí Minh" />
      <AppSidebar active="Tài khoản" onLogout={handleLogout} />

      {view === "list" ? (
        <main className="ml-[220px] pt-[52px]">
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <h1 className="text-base font-semibold text-ink">Danh sách người dùng</h1>
            <div className="flex gap-2.5">
              <button
                type="button"
                className="flex h-9 items-center gap-1.5 rounded-md border border-primary bg-white px-4 text-[13px] font-medium text-primary hover:bg-[#eff6ff]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import
              </button>
              <button
                type="button"
                onClick={openAdd}
                className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Thêm mới
              </button>
            </div>
          </div>

          <div className="px-6 py-5">
            {selectedIds.size > 0 ? (
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-4 py-2 text-[13px] font-medium text-primary">
                <span className="flex-1">{selectedIds.size} dữ liệu được chọn</span>
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="flex h-[30px] items-center gap-1.5 rounded-[5px] bg-danger px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#dc2626]"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                  Xoá
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-lg leading-none text-muted hover:text-[#374151]"
                  aria-label="Bỏ chọn"
                >
                  ×
                </button>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr>
                      <th className="w-11 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left">
                        <TriCheckbox checked={allPageChecked} onChange={toggleAll} />
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
                      <th className="whitespace-nowrap border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-center text-[13px] font-semibold text-[#374151]">
                        Trạng thái
                      </th>
                    </tr>
                    <tr>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input className={FILTER_INPUT_CLASS} value={fFullname} onChange={(e) => { setFFullname(e.target.value); setCurrentPage(1); }} />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input className={FILTER_INPUT_CLASS} value={fUsername} onChange={(e) => { setFUsername(e.target.value); setCurrentPage(1); }} />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input className={FILTER_INPUT_CLASS} value={fEmail} onChange={(e) => { setFEmail(e.target.value); setCurrentPage(1); }} />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <select className={`${FILTER_INPUT_CLASS} cursor-pointer bg-white`} value={fRole} onChange={(e) => { setFRole(e.target.value); setCurrentPage(1); }}>
                          <option value="">Tất cả</option>
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input className={FILTER_INPUT_CLASS} value={fChucDanh} onChange={(e) => { setFChucDanh(e.target.value); setCurrentPage(1); }} />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <select className={`${FILTER_INPUT_CLASS} cursor-pointer bg-white`} value={fActive} onChange={(e) => { setFActive(e.target.value); setCurrentPage(1); }}>
                          <option value="">Tất cả</option>
                          <option value="1">Kích hoạt</option>
                          <option value="0">Ngừng</option>
                        </select>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3.5 py-8 text-center text-[13.5px] text-muted">
                          Không có dữ liệu
                        </td>
                      </tr>
                    ) : (
                      pagedUsers.map((u) => {
                        const selected = selectedIds.has(u.id);
                        return (
                          <tr key={u.id} className={`border-b border-[#f3f4f6] ${selected ? "bg-[#eff6ff]" : "hover:bg-[#f9fafb]"}`}>
                            <td className="px-3.5 py-2.5">
                              <TriCheckbox checked={selected} onChange={(c) => toggleRow(u.id, c)} />
                            </td>
                            <td className="px-3.5 py-2.5">
                              <div className="flex gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => openEdit(u)}
                                  title="Chỉnh sửa"
                                  className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary"
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setResetTarget(u); setResetPwd(""); setResetError(null); }}
                                  title="Đặt lại mật khẩu"
                                  className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary"
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[#374151]"
                                  style={{ background: avatarColor(u.username) }}
                                >
                                  {getInitials(u.fullname)}
                                </span>
                                <span className="text-[#374151]">{u.fullname}</span>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 text-[#374151]">{u.username}</td>
                            <td className="px-3.5 py-2.5 text-[#374151]">{u.email}</td>
                            <td className="px-3.5 py-2.5">
                              <span className="inline-block rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs font-medium text-[#374151]">
                                {u.role}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-[#374151]">{u.chucdanh}</td>
                            <td className="px-3.5 py-2.5">
                              <div className="flex justify-center">
                                <Switch checked={u.active} onChange={(c) => toggleStatus(u.id, c)} />
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
                  onClick={() => setToast("Xuất dữ liệu thành công")}
                  className="flex items-center gap-1.5 text-muted hover:text-primary"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-[#6b7280]">
                    {total === 0 ? "0 - 0 of 0" : `${start + 1} - ${end} of ${total}`}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-line bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                      disabled={end >= total}
                      className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-line bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="ml-[220px] pt-[52px]">
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <h1 className="text-base font-semibold text-ink">Chi tiết người dùng</h1>
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
                className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Lưu
              </button>
            </div>
          </div>

          <div className="p-6">
            {detailError ? <Alert variant="error" message={detailError} onClose={() => setDetailError(null)} /> : null}

            <div className="flex items-start gap-7 rounded-[10px] bg-white p-7 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
              <div className="w-[240px] shrink-0 rounded-[10px] border border-[#e5e7eb] px-5 py-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-[100px] w-[100px] cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-[#9ca3af] bg-[#e5e7eb] hover:border-primary">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span className="mt-1 text-[11px] text-muted">Tải ảnh đại diện</span>
                  </div>
                  <div className="text-center text-[11px] text-[#9ca3af]">
                    *.jpeg, *.jpg, *.png.
                    <br />
                    Kích thước tối đa 5 MB
                  </div>
                  <div className="mt-3 flex items-center gap-2.5 self-start">
                    <span className="text-[13px] text-[#374151]">Kích hoạt</span>
                    <Switch checked={form.active} onChange={(c) => setField("active", c)} />
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <div className="mb-5 text-sm font-semibold text-dark">Thông tin cá nhân</div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted">Tên đăng nhập<span className="text-danger">*</span></label>
                    <input
                      className={FORM_CONTROL_CLASS}
                      value={form.username}
                      disabled={editingId !== null}
                      onChange={(e) => setField("username", e.target.value)}
                    />
                  </div>
                  {editingId === null ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-muted">Mật khẩu<span className="text-danger">*</span></label>
                      <PasswordField value={password} onChange={setPassword} placeholder="Nhập mật khẩu" autoComplete="new-password" />
                    </div>
                  ) : (
                    <div />
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted">Họ và tên<span className="text-danger">*</span></label>
                    <input className={FORM_CONTROL_CLASS} value={form.fullname} onChange={(e) => setField("fullname", e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted">Ngày tháng năm sinh</label>
                    <input type="date" className={FORM_CONTROL_CLASS} value={form.dob} onChange={(e) => setField("dob", e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted">Giới tính</label>
                    <select className={SELECT_CLASS} value={form.gender} onChange={(e) => setField("gender", e.target.value)}>
                      <option value="">Giới tính</option>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted">Chức danh</label>
                    <input className={FORM_CONTROL_CLASS} placeholder="Chức danh" value={form.chucdanh} onChange={(e) => setField("chucdanh", e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted">Vai trò <span className="text-danger">*</span></label>
                    <select className={SELECT_CLASS} value={form.role} onChange={(e) => setField("role", e.target.value)}>
                      <option value="">-- Chọn vai trò --</option>
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs text-muted">Email <span className="text-danger">*</span></label>
                    <div className="flex items-center gap-2">
                      <input type="email" className={`${FORM_CONTROL_CLASS} flex-1`} value={form.email} onChange={(e) => setField("email", e.target.value)} />
                      {editingId !== null ? (
                        <button type="button" onClick={() => setToast("Mở luồng đổi email OTP")} className="whitespace-nowrap text-[13px] font-medium text-primary hover:underline">
                          Thay đổi
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <hr className="my-7 border-t border-[#f3f4f6]" />

                <div className="mb-5 text-sm font-semibold text-dark">Thông tin liên hệ</div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted">Tỉnh thành phố</label>
                    <select className={SELECT_CLASS} value={form.tinh} onChange={(e) => setField("tinh", e.target.value)}>
                      {PROVINCE_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted">Phường xã</label>
                    <select className={SELECT_CLASS} value={form.phuong} onChange={(e) => setField("phuong", e.target.value)}>
                      {WARD_OPTIONS.map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs text-muted">Địa chỉ</label>
                    <input className={FORM_CONTROL_CLASS} placeholder="Địa chỉ" value={form.diachi} onChange={(e) => setField("diachi", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Modal đặt lại mật khẩu */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) setResetTarget(null);
        }}
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
              Khởi tạo mật khẩu cho tài khoản <strong>{resetTarget?.username}</strong>
            </p>
            {resetError ? <Alert variant="error" message={resetError} /> : null}
            <input
              className="h-[42px] w-full rounded-md border border-line px-3.5 text-sm outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              value={resetPwd}
              onChange={(e) => setResetPwd(e.target.value)}
              placeholder="Nhập mật khẩu mới mong muốn"
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
              className="h-[38px] rounded-md bg-primary px-6 text-sm font-semibold text-white hover:bg-[#1e40af]"
            >
              Lưu
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast ? (
        <div className="fixed right-5 top-[68px] z-[999] flex items-center gap-2 rounded-lg border border-[#86efac] bg-[#f0fdf4] px-4 py-2.5 text-[13px] text-[#166534] shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toast}</span>
        </div>
      ) : null}
    </div>
  );
}
