"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useDebounce from "@/libs/shared/core/hooks/useDebounce";
import { TriCheckbox } from "@/libs/shared/core/components/TriCheckbox/TriCheckbox";
import { Switch } from "@/libs/shared/core/components/Switch/Switch";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { Modal } from "@/libs/shared/core/components/Modal/Modal";
import { type EnterpriseType } from "@/libs/tts/enterprise-type/enterpriseTypeData";
import {
  getEnterpriseTypeList,
  createEnterpriseType,
  updateEnterpriseType,
  deleteEnterpriseType,
  toggleEnterpriseTypeActive,
} from "@/libs/tts/enterprise-type/enterpriseTypeApi";
import { useCan } from "@/libs/tts/auth/abilityContext";

const FILTER_INPUT_CLASS =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] text-ink outline-none focus:border-[#3b82f6]";
const FORM_CONTROL_CLASS =
  "h-[38px] rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] disabled:bg-[#f9fafb] disabled:text-muted";
const SELECT_CONTROL_CLASS = `${FORM_CONTROL_CLASS} cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8`;

export default function EnterpriseTypePage() {
  const canCreate = useCan("create", "ENTERPRISE_TYPE");
  const canUpdate = useCan("update", "ENTERPRISE_TYPE");
  const canDelete = useCan("delete", "ENTERPRISE_TYPE");
  const importRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<EnterpriseType[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getEnterpriseTypeList().then(setItems).catch(() => {});
  }, []);

  const [fMa, setFMa] = useState("");
  const [fTen, setFTen] = useState("");
  const [fTrangThai, setFTrangThai] = useState("");
  const [pageSize, setPageSize] = useState(10);

  const dFMa = useDebounce(fMa, 300);
  const dFTen = useDebounce(fTen, 300);
  const [currentPage, setCurrentPage] = useState(1);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [inputMa, setInputMa] = useState("");
  const [inputTen, setInputTen] = useState("");
  const [inputActive, setInputActive] = useState("1");
  const [panelErrors, setPanelErrors] = useState<{ ma?: string; ten?: string }>({});

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    return items.filter(
      (r) =>
        r.ma.toLowerCase().includes(dFMa.toLowerCase()) &&
        r.ten.toLowerCase().includes(dFTen.toLowerCase()) &&
        (fTrangThai === "" || (fTrangThai === "1" ? r.active : !r.active)),
    );
  }, [items, dFMa, dFTen, fTrangThai]);

  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(currentPage, lastPage);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paged = filtered.slice(start, end);
  const allPageChecked = paged.length > 0 && paged.every((r) => selectedIds.has(r.id));

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
      paged.forEach((r) => (checked ? next.add(r.id) : next.delete(r.id)));
      return next;
    });

  const toggleStatus = (id: number, active: boolean) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, active } : r)));
    toggleEnterpriseTypeActive(id, active)
      .then(() => setToast("Cập nhật trạng thái thành công"))
      .catch(() => {
        setItems((prev) => prev.map((r) => (r.id === id ? { ...r, active: !active } : r)));
        setToast("Cập nhật thất bại");
      });
  };

  const openAdd = () => {
    setEditId(null);
    setInputMa("");
    setInputTen("");
    setInputActive("1");
    setPanelErrors({});
    setPanelOpen(true);
  };

  const openEdit = (r: EnterpriseType) => {
    setEditId(r.id);
    setInputMa(r.ma);
    setInputTen(r.ten);
    setInputActive(r.active ? "1" : "0");
    setPanelErrors({});
    setPanelOpen(true);
  };

  const savePanel = async () => {
    const ma = inputMa.trim();
    const ten = inputTen.trim();
    const errors: { ma?: string; ten?: string } = {};
    if (!ma) errors.ma = "Mã loại hình không được để trống";
    if (!ten) errors.ten = "Tên loại hình không được để trống";
    if (Object.keys(errors).length > 0) { setPanelErrors(errors); return; }
    setPanelErrors({});
    const active = inputActive === "1";
    setSaving(true);
    try {
      if (editId) {
        const updated = await updateEnterpriseType(editId, { ten, active });
        setItems((prev) => prev.map((r) => (r.id === editId ? updated : r)));
      } else {
        const created = await createEnterpriseType({ ma, ten, active });
        setItems((prev) => [created, ...prev]);
      }
      setPanelOpen(false);
      setToast(editId ? "Cập nhật thành công" : "Thêm mới thành công");
    } catch {
      setToast("Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => deleteEnterpriseType(id)));
      setItems((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setDeleteConfirmOpen(false);
      setToast(`Đã xóa ${ids.length} loại hình`);
    } catch {
      setDeleteConfirmOpen(false);
      setToast("Xóa thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
        <h1 className="text-base font-semibold text-ink">
          Danh sách loại hình kinh doanh
        </h1>
        <div className="flex gap-2.5">
          <input
            ref={importRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={() => setToast("Đã nhận file. Vui lòng chờ xử lý.")}
          />
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-[13px] text-[#374151] hover:bg-[#f9fafb]"
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
            Thêm từ file
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
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className="w-11 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left">
                  <TriCheckbox
                    checked={allPageChecked}
                    indeterminate={selectedIds.size > 0 && !allPageChecked}
                    onChange={toggleAll}
                  />
                </th>
                <th className="w-12 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5" />
                <th className="w-40 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                  Mã loại hình
                </th>
                <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                  Tên loại hình
                </th>
                <th className="w-40 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-center text-[13px] font-semibold text-[#374151]">
                  Trạng thái
                </th>
              </tr>
              <tr>
                <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                  <input
                    className={FILTER_INPUT_CLASS}
                    value={fMa}
                    onChange={(e) => {
                      setFMa(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </th>
                <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                  <input
                    className={FILTER_INPUT_CLASS}
                    value={fTen}
                    onChange={(e) => {
                      setFTen(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </th>
                <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                  <select
                    className={`${FILTER_INPUT_CLASS} cursor-pointer bg-white`}
                    value={fTrangThai}
                    onChange={(e) => {
                      setFTrangThai(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">Tất cả</option>
                    <option value="1">Sử dụng</option>
                    <option value="0">Ngừng sử dụng</option>
                  </select>
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3.5 py-8 text-center text-[13.5px] text-muted"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                paged.map((r) => {
                  const selected = selectedIds.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-[#f3f4f6] ${selected ? "bg-[#eff6ff]" : "hover:bg-[#f9fafb]"}`}
                    >
                      <td className="px-3.5 py-2.5">
                        <TriCheckbox
                          checked={selected}
                          onChange={(c) => toggleRow(r.id, c)}
                        />
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          disabled={!canUpdate}
                          title={
                            canUpdate ? "Chỉnh sửa" : "Bạn không có quyền sửa"
                          }
                          className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-3.5 py-2.5 text-[#374151]">{r.ma}</td>
                      <td className="px-3.5 py-2.5 text-[#374151]">{r.ten}</td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex justify-center">
                          <Switch
                            checked={r.active}
                            onChange={(c) => toggleStatus(r.id, c)}
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
              <option value={50}>50</option>
            </select>
            <span className="text-[#6b7280]">
              {total === 0 ? "0 of 0" : `${start + 1} - ${end} of ${total}`}
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

      <Modal
        open={panelOpen}
        title={
          editId
            ? "Cập nhật loại hình kinh doanh"
            : "Thêm mới loại hình kinh doanh"
        }
        onClose={() => setPanelOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              disabled={saving}
              className="h-9 rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
            >
              Huỷ bỏ
            </button>
            <button
              type="button"
              onClick={savePanel}
              disabled={saving}
              className="h-9 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        }
      >
        <div className="mb-4 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-[#374151]">
            Mã loại hình <span className="text-danger">*</span>
          </label>
          <input
            className={`${FORM_CONTROL_CLASS}${panelErrors.ma ? " border-danger" : ""}`}
            value={inputMa}
            disabled={editId !== null}
            onChange={(e) => {
              setInputMa(e.target.value);
              if (panelErrors.ma)
                setPanelErrors((p) => ({ ...p, ma: undefined }));
            }}
            placeholder="VD: 120"
          />
          {panelErrors.ma && (
            <p className="mt-0.5 text-[11px] text-danger">{panelErrors.ma}</p>
          )}
        </div>
        <div className="mb-4 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-[#374151]">
            Tên loại hình kinh doanh <span className="text-danger">*</span>
          </label>
          <input
            className={`${FORM_CONTROL_CLASS}${panelErrors.ten ? " border-danger" : ""}`}
            value={inputTen}
            onChange={(e) => {
              setInputTen(e.target.value);
              if (panelErrors.ten)
                setPanelErrors((p) => ({ ...p, ten: undefined }));
            }}
            placeholder="VD: Doanh nghiệp nhà nước"
          />
          {panelErrors.ten && (
            <p className="mt-0.5 text-[11px] text-danger">{panelErrors.ten}</p>
          )}
        </div>
        <div className="mb-4 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-[#374151]">
            Trạng thái <span className="text-danger">*</span>
          </label>
          <select
            className={SELECT_CONTROL_CLASS}
            value={inputActive}
            onChange={(e) => setInputActive(e.target.value)}
          >
            <option value="1">Sử dụng</option>
            <option value="0">Ngừng sử dụng</option>
          </select>
        </div>
      </Modal>

      {/* Thanh thao tác hàng loạt khi chọn checkbox */}
      {selectedIds.size > 0 ? (
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
      <Modal
        open={deleteConfirmOpen}
        title="Xác nhận xóa"
        onClose={() => setDeleteConfirmOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              className="h-9.5 rounded-md px-5 text-sm font-medium text-muted hover:bg-[#f9fafb] hover:text-[#374151]"
            >
              Huỷ bỏ
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              className="h-9.5 rounded-md bg-danger px-6 text-sm font-semibold text-white hover:bg-[#dc2626]"
            >
              Xóa
            </button>
          </div>
        }
      >
        <p className="text-[13.5px] text-[#374151]">
          Bạn có chắc muốn xóa <strong>{selectedIds.size}</strong> loại hình đã
          chọn? Hành động này không thể hoàn tác.
        </p>
      </Modal>

      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
