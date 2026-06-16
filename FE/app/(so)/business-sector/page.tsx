"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useDebounce from "@/libs/shared/core/hooks/useDebounce";
import { TriCheckbox } from "@/libs/shared/core/components/TriCheckbox/TriCheckbox";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { Modal } from "@/libs/shared/core/components/Modal/Modal";
import { CAP_LABELS, type BusinessSector } from "@/libs/tts/business-sector/businessSectorData";
import {
  getBusinessSectorList,
  createBusinessSector,
  updateBusinessSector,
} from "@/libs/tts/business-sector/businessSectorApi";
import { useCan } from "@/libs/tts/auth/abilityContext";

const FILTER_INPUT_CLASS =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] text-ink outline-none focus:border-[#3b82f6]";
const FORM_CONTROL_CLASS =
  "h-[38px] rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] disabled:bg-[#f9fafb] disabled:text-muted";
const SELECT_CONTROL_CLASS = `${FORM_CONTROL_CLASS} cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8`;

const CAP_BADGE_CLASS = ["", "bg-[#eff6ff] text-[#1d4ed8]", "bg-[#f0fdf4] text-[#166534]", "bg-[#fefce8] text-[#92400e]", "bg-[#fdf4ff] text-[#7c3aed]"];
const INDENT_PX = ["0", "0", "14px", "28px", "42px"];

export default function BusinessSectorPage() {
  const canCreate = useCan("create", "BUSINESS_SECTOR");
  const canUpdate = useCan("update", "BUSINESS_SECTOR");
  const importRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<BusinessSector[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBusinessSectorList().then(setItems).catch(() => {});
  }, []);

  const parentOptions = useMemo(
    () => items.filter((s) => s.cap < 4).map((s) => ({ value: s.ma, label: `${s.ma} - ${s.ten.replace(/^[–-]\s*/, "")}` })),
    [items],
  );

  const [fMa, setFMa] = useState("");
  const [fTen, setFTen] = useState("");
  const [pageSize, setPageSize] = useState(10);

  const dFMa = useDebounce(fMa, 300);
  const dFTen = useDebounce(fTen, 300);
  const [currentPage, setCurrentPage] = useState(1);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [inputMa, setInputMa] = useState("");
  const [inputTen, setInputTen] = useState("");
  const [inputCha, setInputCha] = useState("");
  const [inputActive, setInputActive] = useState("1");
  const [panelErrors, setPanelErrors] = useState<{ ma?: string; ten?: string }>({});

  const filtered = useMemo(() => {
    return items.filter(
      (r) => r.ma.toLowerCase().includes(dFMa.toLowerCase()) && r.ten.toLowerCase().includes(dFTen.toLowerCase()),
    );
  }, [items, dFMa, dFTen]);

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

  const openAdd = () => {
    setEditId(null);
    setInputMa("");
    setInputTen("");
    setInputCha("");
    setInputActive("1");
    setPanelErrors({});
    setPanelOpen(true);
  };

  const openEdit = (r: BusinessSector) => {
    setEditId(r.id);
    setInputMa(r.ma);
    setInputTen(r.ten);
    setInputCha(r.cha);
    setInputActive("1");
    setPanelErrors({});
    setPanelOpen(true);
  };

  const savePanel = async () => {
    const ma = inputMa.trim();
    const ten = inputTen.trim();
    const errors: { ma?: string; ten?: string } = {};
    if (!ma) errors.ma = "Mã ngành không được để trống";
    if (!ten) errors.ten = "Tên ngành không được để trống";
    if (Object.keys(errors).length > 0) { setPanelErrors(errors); return; }
    setPanelErrors({});
    setSaving(true);
    try {
      if (editId) {
        const updated = await updateBusinessSector(editId, { ten });
        setItems((prev) => prev.map((r) => (r.id === editId ? updated : r)));
      } else {
        const parent = items.find((x) => x.ma === inputCha);
        const cap = inputCha ? Math.min((parent?.cap ?? 0) + 1, 4) : 1;
        const created = await createBusinessSector({ ma, ten, cap, cha: inputCha || undefined });
        setItems((prev) => [...prev, created]);
      }
      setPanelOpen(false);
      setToast(editId ? "Cập nhật thành công" : "Thêm mới thành công");
    } catch {
      setToast("Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
          <h1 className="text-base font-semibold text-ink">Danh sách ngành nghề kinh doanh</h1>
          <div className="flex gap-2.5">
            <input ref={importRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={() => setToast("Đã nhận file. Vui lòng chờ xử lý.")} />
            <button type="button" onClick={() => importRef.current?.click()} className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-[13px] text-[#374151] hover:bg-[#f9fafb]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Thêm từ file
            </button>
            <button type="button" onClick={openAdd} disabled={!canCreate} title={canCreate ? undefined : "Bạn không có quyền thêm"} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                    <TriCheckbox checked={allPageChecked} onChange={toggleAll} />
                  </th>
                  <th className="w-12 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5" />
                  <th className="w-36 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">Mã ngành</th>
                  <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">Tên ngành nghề</th>
                  <th className="w-24 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">Cấp</th>
                </tr>
                <tr>
                  <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                  <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                  <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                    <input className={FILTER_INPUT_CLASS} value={fMa} onChange={(e) => { setFMa(e.target.value); setCurrentPage(1); }} />
                  </th>
                  <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                    <input className={FILTER_INPUT_CLASS} value={fTen} onChange={(e) => { setFTen(e.target.value); setCurrentPage(1); }} />
                  </th>
                  <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3.5 py-8 text-center text-[13.5px] text-muted">Không có dữ liệu</td>
                  </tr>
                ) : (
                  paged.map((r) => {
                    const selected = selectedIds.has(r.id);
                    return (
                      <tr key={r.id} className={`border-b border-[#f3f4f6] ${selected ? "bg-[#eff6ff]" : "hover:bg-[#f9fafb]"}`}>
                        <td className="px-3.5 py-2.5">
                          <TriCheckbox checked={selected} onChange={(c) => toggleRow(r.id, c)} />
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <button type="button" onClick={() => openEdit(r)} disabled={!canUpdate} title={canUpdate ? "Chỉnh sửa" : "Bạn không có quyền sửa"} className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{r.ma}</td>
                        <td className="px-3.5 py-2.5 text-[#374151]" style={{ paddingLeft: INDENT_PX[r.cap] }}>{r.ten}</td>
                        <td className="px-3.5 py-2.5">
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${CAP_BADGE_CLASS[r.cap]}`}>
                            {CAP_LABELS[r.cap]}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-end gap-3 border-t border-[#f3f4f6] px-4 py-3 text-[13px] text-[#374151]">
              <select className="h-[30px] cursor-pointer rounded-[5px] border border-line px-1.5 text-[13px] outline-none" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-[#6b7280]">{total === 0 ? "0 of 0" : `${start + 1} - ${end} of ${total}`}</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-line bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-40">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <button type="button" onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))} disabled={end >= total} className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-line bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-40">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

      <Modal
        open={panelOpen}
        title={editId ? "Cập nhật ngành nghề kinh doanh" : "Thêm mới ngành nghề kinh doanh"}
        onClose={() => setPanelOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setPanelOpen(false)} disabled={saving} className="h-9 rounded-md border border-line px-4.5 text-[13.5px] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50">Huỷ bỏ</button>
            <button type="button" onClick={savePanel} disabled={saving} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Lưu
            </button>
          </div>
        }
      >
        <div className="mb-4 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-[#374151]">Mã ngành <span className="text-danger">*</span></label>
          <input
            className={`${FORM_CONTROL_CLASS}${panelErrors.ma ? " border-danger" : ""}`}
            value={inputMa}
            disabled={editId !== null}
            onChange={(e) => { setInputMa(e.target.value); if (panelErrors.ma) setPanelErrors((p) => ({ ...p, ma: undefined })); }}
            placeholder="VD: 1222"
          />
          {panelErrors.ma && <p className="mt-0.5 text-[11px] text-danger">{panelErrors.ma}</p>}
        </div>
        <div className="mb-4 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-[#374151]">Tên ngành <span className="text-danger">*</span></label>
          <input
            className={`${FORM_CONTROL_CLASS}${panelErrors.ten ? " border-danger" : ""}`}
            value={inputTen}
            onChange={(e) => { setInputTen(e.target.value); if (panelErrors.ten) setPanelErrors((p) => ({ ...p, ten: undefined })); }}
            placeholder="VD: Khai thác đá tổ ong"
          />
          {panelErrors.ten && <p className="mt-0.5 text-[11px] text-danger">{panelErrors.ten}</p>}
        </div>
        <div className="mb-4 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-[#374151]">Nhóm ngành cha</label>
          <select className={SELECT_CONTROL_CLASS} value={inputCha} onChange={(e) => setInputCha(e.target.value)}>
            <option value="">-- Không có (Cấp 1) --</option>
            {parentOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="mb-4 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-[#374151]">Trạng thái <span className="text-danger">*</span></label>
          <select className={SELECT_CONTROL_CLASS} value={inputActive} onChange={(e) => setInputActive(e.target.value)}>
            <option value="1">Sử dụng</option>
            <option value="0">Ngừng sử dụng</option>
          </select>
        </div>
      </Modal>

      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
