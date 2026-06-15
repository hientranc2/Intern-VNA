"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useDebounce from "@/libs/shared/core/hooks/useDebounce";
import { TriCheckbox } from "@/libs/shared/core/components/TriCheckbox/TriCheckbox";
import { Switch } from "@/libs/shared/core/components/Switch/Switch";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { Modal } from "@/libs/shared/core/components/Modal/Modal";
import {
  CAP_LABELS,
  INJURY_TYPE_PARENTS,
  OCCUPATION_PARENTS,
  type CategoryTab,
  type InjuryFactor,
  type TreeNode,
} from "@/libs/tts/category/categoryData";
import {
  getInjuryFactorList,
  createInjuryFactor,
  deleteInjuryFactor,
  toggleInjuryFactorActive,
  getInjuryTypeList,
  createInjuryType,
  updateInjuryType,
  deleteInjuryType,
  getOccupationList,
  createOccupation,
  updateOccupation,
  deleteOccupation,
} from "@/libs/tts/category/categoryApi";

const TAB_META: Record<CategoryTab, { label: string; option: string }> = {
  factor: { label: "Yếu tố gây chấn thương", option: "Yếu tố chấn thương" },
  injuryType: { label: "Loại chấn thương", option: "Loại chấn thương" },
  occupation: { label: "Danh mục nghề nghiệp", option: "Danh mục nghề nghiệp" },
};

const FILTER_INPUT_CLASS =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] text-ink outline-none focus:border-[#3b82f6]";
const FORM_CONTROL_CLASS =
  "h-[38px] rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] disabled:bg-[#f9fafb] disabled:text-muted";
const SELECT_CONTROL_CLASS = `${FORM_CONTROL_CLASS} cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8`;

const CAP_BADGE_CLASS = ["", "bg-[#eff6ff] text-[#1d4ed8]", "bg-[#f0fdf4] text-[#166534]", "bg-[#fefce8] text-[#92400e]", "bg-[#fdf4ff] text-[#7c3aed]"];
const INDENT_PX = ["0", "0", "14px", "28px", "42px"];

export default function CategoryPage() {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const [factors, setFactors] = useState<InjuryFactor[]>([]);
  const [injuryTypes, setInjuryTypes] = useState<TreeNode[]>([]);
  const [occupations, setOccupations] = useState<TreeNode[]>([]);
  const [tab, setTab] = useState<CategoryTab>("factor");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    getInjuryFactorList().then(setFactors).catch(() => {});
    getInjuryTypeList().then(setInjuryTypes).catch(() => {});
    getOccupationList().then(setOccupations).catch(() => {});
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [fMa, setFMa] = useState("");
  const [fTen, setFTen] = useState("");
  const [fTT, setFTT] = useState("");
  const [pageSize, setPageSize] = useState(10);

  const dFMa = useDebounce(fMa, 300);
  const dFTen = useDebounce(fTen, 300);
  const [currentPage, setCurrentPage] = useState(1);

  const [panelOpen, setPanelOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [inputMa, setInputMa] = useState("");
  const [inputTen, setInputTen] = useState("");
  const [inputCha, setInputCha] = useState("");
  const [inputActive, setInputActive] = useState("1");
  const [panelErrors, setPanelErrors] = useState<{ ma?: string; ten?: string }>({});

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const switchTab = (next: CategoryTab) => {
    setTab(next);
    setDropdownOpen(false);
    setFMa("");
    setFTen("");
    setFTT("");
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const filteredFactors = useMemo(() => {
    return factors.filter(
      (r) =>
        r.ma.toLowerCase().includes(dFMa.toLowerCase()) &&
        r.ten.toLowerCase().includes(dFTen.toLowerCase()) &&
        (fTT === "" || (fTT === "1" ? r.active : !r.active)),
    );
  }, [factors, dFMa, dFTen, fTT]);

  const filteredTree = useMemo(() => {
    const source = tab === "injuryType" ? injuryTypes : occupations;
    return source.filter(
      (r) => r.ma.toLowerCase().includes(dFMa.toLowerCase()) && r.ten.toLowerCase().includes(dFTen.toLowerCase()),
    );
  }, [tab, injuryTypes, occupations, dFMa, dFTen]);

  const total = tab === "factor" ? filteredFactors.length : filteredTree.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(currentPage, lastPage);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pagedFactors = filteredFactors.slice(start, end);
  const pagedTree = filteredTree.slice(start, end);

  const toggleFactor = (id: number, active: boolean) => {
    setFactors((prev) => prev.map((r) => (r.id === id ? { ...r, active } : r)));
    toggleInjuryFactorActive(id, active)
      .then(() => setToast("Cập nhật trạng thái thành công"))
      .catch(() => {
        setFactors((prev) => prev.map((r) => (r.id === id ? { ...r, active: !active } : r)));
        setToast("Cập nhật thất bại");
      });
  };

  const openAdd = () => {
    setIsEdit(false);
    setEditId(null);
    setInputMa("");
    setInputTen("");
    setInputCha("");
    setInputActive("1");
    setPanelErrors({});
    setPanelOpen(true);
  };

  const openEditTree = (r: TreeNode) => {
    setIsEdit(true);
    setEditId(r.id);
    setInputMa(r.ma);
    setInputTen(r.ten);
    setInputCha(r.cha);
    setInputActive("1");
    setPanelErrors({});
    setPanelOpen(true);
  };

  const savePanel = async () => {
    const errors: { ma?: string; ten?: string } = {};
    if (!inputMa.trim()) errors.ma = "Mã không được để trống";
    if (!inputTen.trim()) errors.ten = "Tên không được để trống";
    if (Object.keys(errors).length > 0) {
      setPanelErrors(errors);
      return;
    }
    setPanelErrors({});
    const ma = inputMa.trim();
    const ten = inputTen.trim();
    setSaving(true);
    try {
      if (tab === "factor") {
        const created = await createInjuryFactor({ ma, ten, active: inputActive === "1" });
        setFactors((prev) => [created, ...prev]);
      } else {
        const isType = tab === "injuryType";
        const list = isType ? injuryTypes : occupations;
        const setter = isType ? setInjuryTypes : setOccupations;
        if (isEdit && editId != null) {
          const updated = isType
            ? await updateInjuryType(editId, { ten })
            : await updateOccupation(editId, { ten });
          setter((prev) => prev.map((r) => (r.id === editId ? updated : r)));
        } else {
          const cha = inputCha.trim();
          const parent = cha ? list.find((n) => n.ma === cha) : undefined;
          const cap = parent ? Math.min(parent.cap + 1, 4) : 1;
          const payload = { ma, ten, cap, cha: cha || undefined };
          const created = isType
            ? await createInjuryType(payload)
            : await createOccupation(payload);
          setter((prev) => [created, ...prev]);
        }
      }
      setPanelOpen(false);
      setToast(isEdit ? "Cập nhật thành công" : "Thêm mới thành công");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    const ids = [...selectedIds];
    const remove = <T extends { id: number }>(list: T[]) => list.filter((r) => !selectedIds.has(r.id));
    try {
      if (tab === "factor") {
        await Promise.all(ids.map((id) => deleteInjuryFactor(id)));
        setFactors(remove);
      } else if (tab === "injuryType") {
        await Promise.all(ids.map((id) => deleteInjuryType(id)));
        setInjuryTypes(remove);
      } else {
        await Promise.all(ids.map((id) => deleteOccupation(id)));
        setOccupations(remove);
      }
      setSelectedIds(new Set());
      setDeleteConfirmOpen(false);
      setToast(`Đã xóa ${ids.length} mục`);
    } catch {
      setDeleteConfirmOpen(false);
      setToast("Xóa thất bại. Vui lòng thử lại.");
    }
  };

  const parentOptions = tab === "injuryType" ? INJURY_TYPE_PARENTS : OCCUPATION_PARENTS;

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
          <h1 className="text-base font-semibold text-ink">Khai báo danh mục</h1>
          <div className="flex gap-2.5">
            {tab !== "occupation" ? (
              <button type="button" className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-[13px] text-[#374151] hover:bg-[#f9fafb]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Xuất danh sách
              </button>
            ) : null}
            <input ref={importRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={() => setToast("Đã nhận file. Vui lòng chờ xử lý.")} />
            <button type="button" onClick={() => importRef.current?.click()} className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-[13px] text-[#374151] hover:bg-[#f9fafb]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Thêm từ file
            </button>
            <button type="button" onClick={openAdd} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Thêm mới
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="relative mb-4 inline-block" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex h-[38px] min-w-[220px] items-center justify-between gap-2 rounded-md border border-line bg-white px-4 text-[13.5px] text-[#374151]"
            >
              <span>{TAB_META[tab].label}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {dropdownOpen ? (
              <div className="absolute left-0 top-[42px] z-50 min-w-[220px] rounded-lg border border-[#e5e7eb] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                {(Object.keys(TAB_META) as CategoryTab[]).map((key) => (
                  <div
                    key={key}
                    onClick={() => switchTab(key)}
                    className={`cursor-pointer px-4 py-2.5 text-[13.5px] hover:bg-[#f3f4f6] ${
                      tab === key ? "font-semibold text-primary" : "text-[#374151]"
                    }`}
                  >
                    {TAB_META[key].option}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
            {tab === "factor" ? (
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    <th className="w-11 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5" />
                    <th className="w-40 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">Mã yếu tố</th>
                    <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">Yếu tố gây chấn thương</th>
                    <th className="w-40 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-center text-[13px] font-semibold text-[#374151]">Trạng thái</th>
                  </tr>
                  <tr>
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                      <input className={FILTER_INPUT_CLASS} value={fMa} onChange={(e) => { setFMa(e.target.value); setCurrentPage(1); }} />
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                      <input className={FILTER_INPUT_CLASS} value={fTen} onChange={(e) => { setFTen(e.target.value); setCurrentPage(1); }} />
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                      <select className={`${FILTER_INPUT_CLASS} cursor-pointer bg-white`} value={fTT} onChange={(e) => { setFTT(e.target.value); setCurrentPage(1); }}>
                        <option value="">Tất cả</option>
                        <option value="1">Sử dụng</option>
                        <option value="0">Ngừng</option>
                      </select>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedFactors.length === 0 ? (
                    <tr><td colSpan={4} className="px-3.5 py-8 text-center text-[13.5px] text-muted">Không có dữ liệu</td></tr>
                  ) : (
                    pagedFactors.map((r) => (
                      <tr key={r.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                        <td className="px-3.5 py-2.5"><TriCheckbox checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{r.ma}</td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{r.ten}</td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex justify-center"><Switch checked={r.active} onChange={(c) => toggleFactor(r.id, c)} /></div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    <th className="w-11 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5" />
                    {tab === "occupation" ? (
                      <th className="w-16 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">Thao tác</th>
                    ) : null}
                    <th className="w-40 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                      {tab === "injuryType" ? "Mã số" : "Mã nghề"}
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                      {tab === "injuryType" ? "Tên loại chấn thương" : "Tên nghề nghiệp"}
                    </th>
                    <th className="w-24 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">Cấp</th>
                    {tab === "injuryType" ? (
                      <th className="w-16 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">Thao tác</th>
                    ) : null}
                  </tr>
                  <tr>
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                    {tab === "occupation" ? <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" /> : null}
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                      <input className={FILTER_INPUT_CLASS} value={fMa} onChange={(e) => { setFMa(e.target.value); setCurrentPage(1); }} />
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                      <input className={FILTER_INPUT_CLASS} value={fTen} onChange={(e) => { setFTen(e.target.value); setCurrentPage(1); }} />
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                    {tab === "injuryType" ? <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {pagedTree.length === 0 ? (
                    <tr><td colSpan={5} className="px-3.5 py-8 text-center text-[13.5px] text-muted">Không có dữ liệu</td></tr>
                  ) : (
                    pagedTree.map((r) => {
                      const editBtn = (
                        <button type="button" onClick={() => openEditTree(r)} title="Chỉnh sửa" className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      );
                      return (
                        <tr key={r.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                          <td className="px-3.5 py-2.5"><TriCheckbox checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                          {tab === "occupation" ? <td className="px-3.5 py-2.5">{editBtn}</td> : null}
                          <td className="px-3.5 py-2.5 text-[#374151]">{r.ma}</td>
                          <td className="px-3.5 py-2.5 text-[#374151]" style={{ paddingLeft: INDENT_PX[r.cap] }}>{r.ten}</td>
                          <td className="px-3.5 py-2.5">
                            <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${CAP_BADGE_CLASS[r.cap]}`}>{CAP_LABELS[r.cap]}</span>
                          </td>
                          {tab === "injuryType" ? <td className="px-3.5 py-2.5">{editBtn}</td> : null}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

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
        title={isEdit ? "Chỉnh sửa" : "Thêm mới"}
        onClose={() => setPanelOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setPanelOpen(false)} disabled={saving} className="h-9 rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50">Huỷ bỏ</button>
            <button type="button" onClick={savePanel} disabled={saving} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {saving ? "Đang lưu..." : "Lưu lại"}
            </button>
          </div>
        }
      >
        <div className="mb-4 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-[#374151]">
            {tab === "factor" ? "Mã yếu tố chấn thương" : tab === "injuryType" ? "Mã số" : "Mã ngành"} <span className="text-danger">*</span>
          </label>
          <input
            className={`${FORM_CONTROL_CLASS}${panelErrors.ma ? " border-danger" : ""}`}
            value={inputMa}
            disabled={isEdit}
            onChange={(e) => { setInputMa(e.target.value); if (panelErrors.ma) setPanelErrors((p) => ({ ...p, ma: undefined })); }}
          />
          {panelErrors.ma && <p className="mt-0.5 text-[11px] text-danger">{panelErrors.ma}</p>}
        </div>
        <div className="mb-4 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-[#374151]">
            {tab === "factor" ? "Tên yếu tố chấn thương" : tab === "injuryType" ? "Tên loại chấn thương" : "Tên ngành"} <span className="text-danger">*</span>
          </label>
          <input
            className={`${FORM_CONTROL_CLASS}${panelErrors.ten ? " border-danger" : ""}`}
            value={inputTen}
            onChange={(e) => { setInputTen(e.target.value); if (panelErrors.ten) setPanelErrors((p) => ({ ...p, ten: undefined })); }}
          />
          {panelErrors.ten && <p className="mt-0.5 text-[11px] text-danger">{panelErrors.ten}</p>}
        </div>
        {tab === "factor" ? (
          <div className="mb-4 flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-[#374151]">Trạng thái <span className="text-danger">*</span></label>
            <select className={SELECT_CONTROL_CLASS} value={inputActive} onChange={(e) => setInputActive(e.target.value)}>
              <option value="1">Sử dụng</option>
              <option value="0">Ngừng sử dụng</option>
            </select>
          </div>
        ) : (
          <div className="mb-4 flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-[#374151]">
              {tab === "injuryType" ? "Tên loại chấn thương cha" : "Nhóm ngành cha"} {tab === "injuryType" ? <span className="text-danger">*</span> : null}
            </label>
            <select className={SELECT_CONTROL_CLASS} value={inputCha} onChange={(e) => setInputCha(e.target.value)}>
              <option value="">-- Không có (Cấp 1) --</option>
              {parentOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
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
              className="flex h-10 items-center gap-1.5 bg-danger px-3.5 text-[13px] font-semibold text-white hover:bg-[#dc2626]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
            <button type="button" onClick={() => setDeleteConfirmOpen(false)} className="h-9.5 rounded-md px-5 text-sm font-medium text-muted hover:bg-[#f9fafb] hover:text-[#374151]">Huỷ bỏ</button>
            <button type="button" onClick={deleteSelected} className="h-9.5 rounded-md bg-danger px-6 text-sm font-semibold text-white hover:bg-[#dc2626]">Xóa</button>
          </div>
        }
      >
        <p className="text-[13.5px] text-[#374151]">
          Bạn có chắc muốn xóa <strong>{selectedIds.size}</strong> mục đã chọn? Hành động này không thể hoàn tác.
        </p>
      </Modal>

      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
