"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { TextField } from "@mui/material";
import { TriCheckbox } from "@/libs/shared/core/components/TriCheckbox/TriCheckbox";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { type Role } from "@/libs/tts/role/roleData";
import {
  getRoleList,
  createRole,
  updateRole,
  deleteRole,
} from "@/libs/tts/role/roleApi";
import { type Permission } from "@/libs/tts/permission/permissionData";
import { getPermissionList } from "@/libs/tts/permission/permissionApi";
import { useCan } from "@/libs/tts/auth/abilityContext";
import { getProfile, getRoleCode } from "@/libs/tts/auth/authApi";

type PermRow = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  isGroup: boolean;
};

const FILTER_INPUT_CLASS =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] font-normal text-ink outline-none focus:border-[#3b82f6]";

const isSuperAdminRole = (role: Role) =>
  role.ma.trim().toUpperCase() === "SUPER_ADMIN";

export default function RolePage() {
  const canCreate = useCan("create", "ROLE");
  const canUpdate = useCan("update", "ROLE");
  const canDelete = useCan("delete", "ROLE");
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [toast, setToast] = useState<{
    message: string;
    variant?: "success" | "error" | "warning";
  } | null>(null);
  const [saving, setSaving] = useState(false);
  // Chỉ Super Admin được sửa các vai trò hệ thống cấp cao.
  // Đọc 1 lần từ localStorage; server trả false để tránh hydration mismatch.
  const isSuperAdminFromStorage = useSyncExternalStore(
    () => () => {},
    () => getRoleCode() === "SUPER_ADMIN",
    () => false,
  );
  const [profileRoleCode, setProfileRoleCode] = useState<string | null>(null);
  const isSuperAdminAccount =
    profileRoleCode === "SUPER_ADMIN" || isSuperAdminFromStorage;
  const canCreateRole = isSuperAdminAccount || canCreate;
  const canUpdateRole = isSuperAdminAccount || canUpdate;
  const canDeleteRole = isSuperAdminAccount || canDelete;

  useEffect(() => {
    getProfile()
      .then((p) => setProfileRoleCode(p.roleCode ?? null))
      .catch(() => {});
    getRoleList()
      .then(setRoles)
      .catch(() =>
        setToast({
          message: "Không tải được danh sách vai trò",
          variant: "error",
        }),
      );
    getPermissionList()
      .then(setAllPerms)
      .catch(() => {});
  }, []);

  const permChildrenOf = (groupId: string) =>
    allPerms.filter((p) => p.parentId === groupId);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterMa, setFilterMa] = useState("");
  const [filterTen, setFilterTen] = useState("");
  const [searchMa, setSearchMa] = useState("");
  const [searchTen, setSearchTen] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formMa, setFormMa] = useState("");
  const [formTen, setFormTen] = useState("");
  const [formErrors, setFormErrors] = useState<{ ma?: string; ten?: string }>(
    {},
  );
  const [checkedPerms, setCheckedPerms] = useState<Set<string>>(new Set());
  const [permExpanded, setPermExpanded] = useState<Record<string, boolean>>({});
  const [permFilterMa, setPermFilterMa] = useState("");
  const [permFilterTen, setPermFilterTen] = useState("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasActiveFilters = Boolean(
    filterMa || searchMa || filterTen || searchTen,
  );

  const handleClearFilters = () => {
    setFilterMa("");
    setSearchMa("");
    setFilterTen("");
    setSearchTen("");
    setCurrentPage(1);
  };

  const filteredRoles = useMemo(() => {
    const ma = searchMa.toLowerCase();
    const ten = searchTen.toLowerCase();
    return roles.filter(
      (r) =>
        !isSuperAdminRole(r) &&
        r.ma.toLowerCase().includes(ma) && r.ten.toLowerCase().includes(ten),
    );
  }, [roles, searchMa, searchTen]);

  const total = filteredRoles.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(currentPage, lastPage);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pagedRoles = filteredRoles.slice(start, end);

  // Vai trò hệ thống cấp cao chỉ bị khóa với user thường; super admin được quản lý các role khác.
  const selectableRoles = pagedRoles.filter(
    (r) => isSuperAdminAccount || !r.isProtected,
  );
  const allPageChecked =
    selectableRoles.length > 0 &&
    selectableRoles.every((r) => selectedIds.has(r.id));

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
      selectableRoles.forEach((r) =>
        checked ? next.add(r.id) : next.delete(r.id),
      );
      return next;
    });

  const deleteSelected = async () => {
    const protectedIds = new Set(
      roles
        .filter(
          (r) => isSuperAdminRole(r) || (!isSuperAdminAccount && r.isProtected),
        )
        .map((r) => r.id),
    );
    const ids = [...selectedIds].filter((id) => !protectedIds.has(id));
    if (ids.length === 0) {
      setToast({
        message: "⚠️ Vai trò hệ thống cấp cao không thể xóa",
        variant: "warning",
      });
      setDeleteConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => deleteRole(id)));

      const successIds: number[] = [];
      const errorMessages: string[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          successIds.push(ids[index]);
        } else {
          const error = result.reason;
          let msg = `Role ID ${ids[index]}: Xóa thất bại`;
          if (error?.response?.data?.message) {
            msg = error.response.data.message;
          } else if (error?.message) {
            msg = error.message;
          }
          errorMessages.push(msg);
        }
      });

      if (successIds.length > 0) {
        setRoles((prev) => prev.filter((r) => !successIds.includes(r.id)));
        setSelectedIds(new Set());
        setCurrentPage(1);
      }

      if (errorMessages.length === 0) {
        setToast({
          message: `✅ Đã xóa thành công ${successIds.length} vai trò`,
          variant: "success",
        });
      } else if (successIds.length === 0) {
        // Tất cả đều thất bại - hiển thị lỗi với xuống dòng
        setToast({
          message: `❌ Không thể xóa các vai trò:\n${errorMessages.join("\n")}`,
          variant: "warning",
        });
      } else {
        // Một phần thành công
        setToast({
          message: `⚠️ Đã xóa ${successIds.length} vai trò.\nKhông thể xóa ${errorMessages.length} vai trò:\n${errorMessages.join("\n")}`,
          variant: "warning",
        });
      }
    } catch (e) {
      setToast({
        message:
          e instanceof Error ? e.message : "Xóa thất bại. Vui lòng thử lại.",
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setFormMa("");
    setFormTen("");
    setFormErrors({});
    setCheckedPerms(new Set());
    resetPermView();
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingId(role.id);
    setFormMa(role.ma);
    setFormTen(role.ten);
    setFormErrors({});
    setCheckedPerms(new Set(role.perms));
    resetPermView();
    setModalOpen(true);
  };

  const resetPermView = () => {
    setPermFilterMa("");
    setPermFilterTen("");
    // Mở rộng sẵn mọi nhóm quyền load từ API (không cứng id g1/g2/g3)
    const expandedGroups = Object.fromEntries(
      allPerms.filter((p) => p.parentId === null).map((g) => [g.id, true]),
    );
    setPermExpanded(expandedGroups);
  };

  const isFormChanged = useMemo(() => {
    if (!editingId) return true;
    const originalRole = roles.find((r) => r.id === editingId);
    if (!originalRole) return true;

    if (formTen.trim() !== originalRole.ten) return true;

    const origPerms = originalRole.perms ?? [];
    if (checkedPerms.size !== origPerms.length) return true;
    for (const code of origPerms) {
      if (!checkedPerms.has(code)) return true;
    }

    return false;
  }, [editingId, roles, formTen, checkedPerms]);

  const saveRole = async () => {
    const ma = formMa.trim();
    const ten = formTen.trim();
    const errors: { ma?: string; ten?: string } = {};
    if (!ma) errors.ma = "Mã vai trò không được để trống";
    if (!ten) errors.ten = "Tên vai trò không được để trống";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    const perms = [...checkedPerms];
    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateRole(editingId, { ten, perms });
        setRoles((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
      } else {
        if (roles.some((r) => r.ma === ma)) {
          setFormErrors({ ma: "Mã vai trò đã tồn tại" });
          setSaving(false);
          return;
        }
        const created = await createRole({ ma, ten, perms });
        setRoles((prev) => [...prev, created]);
      }
      setFormErrors({});
      setModalOpen(false);
      setToast({
        message: editingId ? "Cập nhật thành công" : "Thêm mới thành công",
        variant: "success",
      });
    } catch (e) {
      setToast({
        message:
          e instanceof Error ? e.message : "Lưu thất bại. Vui lòng thử lại.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const permRows = useMemo<PermRow[]>(() => {
    const fMa = permFilterMa.toLowerCase();
    const fTen = permFilterTen.toLowerCase();
    const hasFilter = Boolean(fMa || fTen);
    const rows: PermRow[] = [];
    const permGroups = allPerms.filter((p) => p.parentId === null);
    const childrenOf = (groupId: string) =>
      allPerms.filter((p) => p.parentId === groupId);
    permGroups.forEach((g) => {
      const children = childrenOf(g.id);
      const groupMatch =
        g.code.toLowerCase().includes(fMa) &&
        g.name.toLowerCase().includes(fTen);
      const anyChild = children.some(
        (c) =>
          c.code.toLowerCase().includes(fMa) &&
          c.name.toLowerCase().includes(fTen),
      );
      if (hasFilter && !groupMatch && !anyChild) return;
      rows.push({
        id: g.id,
        code: g.code,
        name: g.name,
        parentId: null,
        isGroup: true,
      });
      if (!permExpanded[g.id] && !hasFilter) return;
      children.forEach((c) => {
        if (
          !hasFilter ||
          (c.code.toLowerCase().includes(fMa) &&
            c.name.toLowerCase().includes(fTen))
        ) {
          rows.push({
            id: c.id,
            code: c.code,
            name: c.name,
            parentId: c.parentId,
            isGroup: false,
          });
        }
      });
    });
    return rows;
  }, [allPerms, permFilterMa, permFilterTen, permExpanded]);

  const toggleGroupPerm = (groupId: string, checked: boolean) => {
    const codes = permChildrenOf(groupId).map((c) => c.code);
    setCheckedPerms((prev) => {
      const next = new Set(prev);
      codes.forEach((code) => (checked ? next.add(code) : next.delete(code)));
      return next;
    });
  };

  const toggleSinglePerm = (code: string, checked: boolean) =>
    setCheckedPerms((prev) => {
      const next = new Set(prev);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
        <h1 className="text-base font-semibold text-ink">Danh sách vai trò</h1>
        <div className="flex gap-2.5">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex h-9 items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-4 text-[13px] text-[#6b7280] hover:border-[#f87171] hover:text-[#ef4444] transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Xóa bộ lọc
            </button>
          )}
          <button
            type="button"
            onClick={openAdd}
            disabled={!canCreateRole}
            title={canCreateRole ? undefined : "Bạn không có quyền thêm"}
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
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className="w-11 border-b border-[#e5e7eb] bg-[#f9fafb] pl-3.5 pr-1 py-2.5 text-left">
                  <TriCheckbox checked={allPageChecked} onChange={toggleAll} />
                </th>
                <th className="w-10 border-b border-[#e5e7eb] bg-[#f9fafb] pl-1 pr-3.5 py-2.5" />
                <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                  Mã vai trò
                </th>
                <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                  Tên vai trò
                </th>
              </tr>
              <tr>
                <th className="border-b border-[#e5e7eb] bg-white pl-3.5 pr-1 py-1.5" />
                <th className="border-b border-[#e5e7eb] bg-white pl-1 pr-3.5 py-1.5" />
                <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                  <input
                    className={FILTER_INPUT_CLASS}
                    value={filterMa}
                    onChange={(e) => {
                      setFilterMa(e.target.value);
                      if (e.target.value === "") {
                        setSearchMa("");
                        setCurrentPage(1);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setSearchMa(filterMa);
                        setCurrentPage(1);
                      }
                    }}
                  />
                </th>
                <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                  <input
                    className={FILTER_INPUT_CLASS}
                    value={filterTen}
                    onChange={(e) => {
                      setFilterTen(e.target.value);
                      if (e.target.value === "") {
                        setSearchTen("");
                        setCurrentPage(1);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setSearchTen(filterTen);
                        setCurrentPage(1);
                      }
                    }}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedRoles.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3.5 py-8 text-center text-[13.5px] text-muted"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                pagedRoles.map((r) => {
                  const selected = selectedIds.has(r.id);
                  const showLockIcon = r.isProtected && !isSuperAdminAccount;
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-[#f3f4f6] ${selected ? "bg-[#eff6ff]" : "hover:bg-[#f9fafb]"}`}
                    >
                      <td className="pl-3.5 pr-1 py-2.5">
                        <TriCheckbox
                          checked={selected}
                          disabled={!isSuperAdminAccount && r.isProtected}
                          title={
                            !isSuperAdminAccount && r.isProtected
                              ? "Vai trò hệ thống cấp cao — không thể xóa"
                              : undefined
                          }
                          onChange={(c) => toggleRow(r.id, c)}
                        />
                      </td>
                      <td className="pl-1 pr-3.5 py-2.5">
                        {(() => {
                          const lockedSuper =
                            r.isProtected && !isSuperAdminAccount;
                          const editDisabled = !canUpdateRole || lockedSuper;
                          const editTitle = !canUpdateRole
                            ? "Bạn không có quyền sửa"
                            : lockedSuper
                              ? "Chỉ Super Admin mới được sửa vai trò cấp cao"
                              : "Chỉnh sửa";
                          return (
                            <button
                              type="button"
                              onClick={() => openEdit(r)}
                              disabled={editDisabled}
                              className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
                              title={editTitle}
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
                          );
                        })()}
                      </td>
                      <td className="px-3.5 py-2.5 text-[#374151]">{r.ma}</td>
                      <td className="px-3.5 py-2.5 text-[#374151]">
                        <span className="inline-flex items-center gap-1.5">
                          {showLockIcon ? (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#9ca3af"
                              strokeWidth="2"
                            >
                              <title>Vai trò hệ thống</title>
                              <rect
                                x="3"
                                y="11"
                                width="18"
                                height="11"
                                rx="2"
                              />
                              <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                          ) : null}
                          {r.ten}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-end gap-3 border-t border-[#f3f4f6] px-4 py-3 text-[13px] text-[#374151]">
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
                onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                disabled={end >= total}
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

      {/* Modal thêm / chỉnh sửa vai trò */}
      <div
        className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/45 transition-opacity duration-200 ${
          modalOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`flex max-h-[88vh] w-[600px] flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
            modalOpen ? "translate-y-0" : "translate-y-2.5"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
            <h3 className="text-[15px] font-bold text-ink">
              {editingId ? "Chỉnh sửa vai trò" : "Thêm mới vai trò"}
            </h3>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="text-xl leading-none text-[#9ca3af] hover:text-[#374151]"
              aria-label="Đóng"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="mb-[18px] grid grid-cols-2 gap-3.5">
              <TextField
                label="Mã vai trò"
                value={formMa}
                disabled={editingId !== null}
                onChange={(e) => {
                  setFormMa(e.target.value);
                  if (formErrors.ma)
                    setFormErrors((p) => ({ ...p, ma: undefined }));
                }}
                error={!!formErrors.ma}
                helperText={formErrors.ma}
                size="small"
                fullWidth
                required
              />
              <TextField
                label="Tên vai trò"
                value={formTen}
                onChange={(e) => {
                  setFormTen(e.target.value);
                  if (formErrors.ten)
                    setFormErrors((p) => ({ ...p, ten: undefined }));
                }}
                error={!!formErrors.ten}
                helperText={formErrors.ten}
                size="small"
                fullWidth
                required
              />
            </div>

            <div className="mb-2.5 text-[13px] font-semibold text-[#374151]">
              Danh sách quyền
            </div>
            <div className="overflow-hidden rounded-md border border-[#e5e7eb]">
              <div className="max-h-[340px] overflow-y-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="w-11 border-b border-[#e5e7eb] bg-[#f9fafb] px-2.5 py-2.5" />
                      <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-2.5 py-2.5 text-left text-[12.5px] font-semibold text-[#374151]">
                        Mã quyền
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-2.5 py-2.5 text-left text-[12.5px] font-semibold text-[#374151]">
                        Tên quyền
                      </th>
                    </tr>
                    <tr>
                      <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5" />
                      <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5">
                        <input
                          className="h-7 w-full rounded border border-line px-1.5 text-xs outline-none focus:border-[#3b82f6]"
                          value={permFilterMa}
                          onChange={(e) => setPermFilterMa(e.target.value)}
                        />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5">
                        <input
                          className="h-7 w-full rounded border border-line px-1.5 text-xs outline-none focus:border-[#3b82f6]"
                          value={permFilterTen}
                          onChange={(e) => setPermFilterTen(e.target.value)}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {permRows.map((row) => {
                      if (row.isGroup) {
                        const children = permChildrenOf(row.id);
                        const allChecked =
                          children.length > 0 &&
                          children.every((c) => checkedPerms.has(c.code));
                        const someChecked = children.some((c) =>
                          checkedPerms.has(c.code),
                        );
                        const open = Boolean(permExpanded[row.id]);
                        return (
                          <tr
                            key={row.id}
                            className="border-b border-[#f3f4f6] bg-[#fafafa]"
                          >
                            <td className="px-2.5 py-2">
                              <TriCheckbox
                                checked={allChecked}
                                indeterminate={someChecked}
                                onChange={(c) => toggleGroupPerm(row.id, c)}
                              />
                            </td>
                            <td className="px-2.5 py-2 font-semibold text-[#374151]">
                              <button
                                type="button"
                                onClick={() =>
                                  setPermExpanded((prev) => ({
                                    ...prev,
                                    [row.id]: !prev[row.id],
                                  }))
                                }
                                className={`mr-1 inline-flex items-center text-muted transition-transform ${
                                  open ? "rotate-90" : ""
                                }`}
                                aria-label={open ? "Thu gọn" : "Mở rộng"}
                              >
                                <svg
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                >
                                  <path d="M9 18l6-6-6-6" />
                                </svg>
                              </button>
                              {row.code}
                            </td>
                            <td className="px-2.5 py-2 font-semibold text-[#374151]">
                              {row.name}
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]"
                        >
                          <td className="px-2.5 py-2">
                            <TriCheckbox
                              checked={checkedPerms.has(row.code)}
                              onChange={(c) => toggleSinglePerm(row.code, c)}
                            />
                          </td>
                          <td className="py-2 pl-7 pr-2.5 text-[#374151]">
                            {row.code}
                          </td>
                          <td className="px-2.5 py-2 text-[#374151]">
                            {row.name}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-[#e5e7eb] px-5 py-3.5">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="h-9 rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={saveRole}
              disabled={saving || !isFormChanged}
              className="h-9 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>

      {/* Floating bulk-action bar */}
      {selectedIds.size > 0 ? (
        <div className="fixed bottom-6 left-1/2 z-[300] -translate-x-1/2">
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
              disabled={!canDeleteRole}
              title={canDeleteRole ? undefined : "Bạn không có quyền xóa"}
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
        className={`fixed inset-0 z-[400] flex items-center justify-center bg-black/45 transition-opacity duration-200 ${
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
              Bạn có chắc muốn xóa <strong>{selectedIds.size}</strong> vai trò
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
        message={toast?.message || null}
        variant={toast?.variant || "success"}
        onDone={() => setToast(null)}
      />
    </>
  );
}
