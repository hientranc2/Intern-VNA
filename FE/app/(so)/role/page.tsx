"use client";

import { useEffect, useMemo, useState } from "react";
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

type PermRow = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  isGroup: boolean;
};

const FILTER_INPUT_CLASS =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] text-ink outline-none focus:border-[#3b82f6]";
const FORM_CONTROL_CLASS =
  "h-[38px] rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] disabled:bg-[#f9fafb] disabled:text-muted";

export default function RolePage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRoleList()
      .then(setRoles)
      .catch(() => setToast("Không tải được danh sách vai trò"));
    getPermissionList()
      .then(setAllPerms)
      .catch(() => {});
  }, []);

  const permChildrenOf = (groupId: string) =>
    allPerms.filter((p) => p.parentId === groupId);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterMa, setFilterMa] = useState("");
  const [filterTen, setFilterTen] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formMa, setFormMa] = useState("");
  const [formTen, setFormTen] = useState("");
  const [formErrors, setFormErrors] = useState<{ ma?: string; ten?: string }>({});
  const [checkedPerms, setCheckedPerms] = useState<Set<string>>(new Set());
  const [permExpanded, setPermExpanded] = useState<Record<string, boolean>>({});
  const [permFilterMa, setPermFilterMa] = useState("");
  const [permFilterTen, setPermFilterTen] = useState("");

  const filteredRoles = useMemo(() => {
    const ma = filterMa.toLowerCase();
    const ten = filterTen.toLowerCase();
    return roles.filter((r) => r.ma.toLowerCase().includes(ma) && r.ten.toLowerCase().includes(ten));
  }, [roles, filterMa, filterTen]);

  const total = filteredRoles.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(currentPage, lastPage);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pagedRoles = filteredRoles.slice(start, end);

  const allPageChecked = pagedRoles.length > 0 && pagedRoles.every((r) => selectedIds.has(r.id));

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
      pagedRoles.forEach((r) => (checked ? next.add(r.id) : next.delete(r.id)));
      return next;
    });

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Xoá ${selectedIds.size} vai trò đã chọn?`)) return;
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => deleteRole(id)));
      setRoles((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setCurrentPage(1);
      setToast(`Đã xóa ${ids.length} vai trò`);
    } catch {
      setToast("Xóa thất bại. Vui lòng thử lại.");
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
      setToast(editingId ? "Cập nhật thành công" : "Thêm mới thành công");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Lưu thất bại. Vui lòng thử lại.");
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
      const groupMatch = g.code.toLowerCase().includes(fMa) && g.name.toLowerCase().includes(fTen);
      const anyChild = children.some(
        (c) => c.code.toLowerCase().includes(fMa) && c.name.toLowerCase().includes(fTen),
      );
      if (hasFilter && !groupMatch && !anyChild) return;
      rows.push({ id: g.id, code: g.code, name: g.name, parentId: null, isGroup: true });
      if (!permExpanded[g.id] && !hasFilter) return;
      children.forEach((c) => {
        if (!hasFilter || (c.code.toLowerCase().includes(fMa) && c.name.toLowerCase().includes(fTen))) {
          rows.push({ id: c.id, code: c.code, name: c.name, parentId: c.parentId, isGroup: false });
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
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <th className="w-11 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left">
                    <TriCheckbox checked={allPageChecked} onChange={toggleAll} />
                  </th>
                  <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                    Mã vai trò
                  </th>
                  <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                    Tên vai trò
                  </th>
                  <th className="w-12 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5" />
                </tr>
                <tr>
                  <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                  <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                    <input
                      className={FILTER_INPUT_CLASS}
                      value={filterMa}
                      onChange={(e) => {
                        setFilterMa(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </th>
                  <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                    <input
                      className={FILTER_INPUT_CLASS}
                      value={filterTen}
                      onChange={(e) => {
                        setFilterTen(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </th>
                  <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {pagedRoles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3.5 py-8 text-center text-[13.5px] text-muted">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  pagedRoles.map((r) => {
                    const selected = selectedIds.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-[#f3f4f6] ${selected ? "bg-[#eff6ff]" : "hover:bg-[#f9fafb]"}`}
                      >
                        <td className="px-3.5 py-2.5">
                          <TriCheckbox checked={selected} onChange={(c) => toggleRow(r.id, c)} />
                        </td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{r.ma}</td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{r.ten}</td>
                        <td className="px-3.5 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary"
                            title="Chỉnh sửa"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
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

      {/* Modal thêm / chỉnh sửa vai trò */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) setModalOpen(false);
        }}
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
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-[#374151]">
                  Mã vai trò <span className="text-danger">*</span>
                </label>
                <input
                  className={`${FORM_CONTROL_CLASS}${formErrors.ma ? " border-danger" : ""}`}
                  value={formMa}
                  disabled={editingId !== null}
                  onChange={(e) => { setFormMa(e.target.value); if (formErrors.ma) setFormErrors((p) => ({ ...p, ma: undefined })); }}
                  placeholder="VD: Role1"
                />
                {formErrors.ma && <p className="mt-0.5 text-[11px] text-danger">{formErrors.ma}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-[#374151]">
                  Tên vai trò <span className="text-danger">*</span>
                </label>
                <input
                  className={`${FORM_CONTROL_CLASS}${formErrors.ten ? " border-danger" : ""}`}
                  value={formTen}
                  onChange={(e) => { setFormTen(e.target.value); if (formErrors.ten) setFormErrors((p) => ({ ...p, ten: undefined })); }}
                  placeholder="VD: Manager"
                />
                {formErrors.ten && <p className="mt-0.5 text-[11px] text-danger">{formErrors.ten}</p>}
              </div>
            </div>

            <div className="mb-2.5 text-[13px] font-semibold text-[#374151]">Danh sách quyền</div>
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
                      const allChecked = children.length > 0 && children.every((c) => checkedPerms.has(c.code));
                      const someChecked = children.some((c) => checkedPerms.has(c.code));
                      const open = Boolean(permExpanded[row.id]);
                      return (
                        <tr key={row.id} className="border-b border-[#f3f4f6] bg-[#fafafa]">
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
                                setPermExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))
                              }
                              className={`mr-1 inline-flex items-center text-muted transition-transform ${
                                open ? "rotate-90" : ""
                              }`}
                              aria-label={open ? "Thu gọn" : "Mở rộng"}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M9 18l6-6-6-6" />
                              </svg>
                            </button>
                            {row.code}
                          </td>
                          <td className="px-2.5 py-2 font-semibold text-[#374151]">{row.name}</td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={row.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                        <td className="px-2.5 py-2">
                          <TriCheckbox
                            checked={checkedPerms.has(row.code)}
                            onChange={(c) => toggleSinglePerm(row.code, c)}
                          />
                        </td>
                        <td className="py-2 pl-7 pr-2.5 text-[#374151]">{row.code}</td>
                        <td className="px-2.5 py-2 text-[#374151]">{row.name}</td>
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
              disabled={saving}
              className="h-9 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
