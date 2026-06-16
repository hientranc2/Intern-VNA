"use client";

import { useEffect, useMemo, useState } from "react";
import { DateInput } from "@/libs/shared/core/components/DateInput/DateInput";
import { Switch } from "@/libs/shared/core/components/Switch/Switch";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { SlidePanel } from "@/libs/shared/core/components/SlidePanel/SlidePanel";
import {
  REPORT_NAME_OPTIONS,
  KY_OPTIONS,
  type ReportConfig,
} from "@/libs/tts/report-config/reportConfigData";
import {
  getReportConfigList,
  createReportConfig,
  updateReportConfig,
  toggleReportConfigActive,
} from "@/libs/tts/report-config/reportConfigApi";
import { useCan } from "@/libs/tts/auth/abilityContext";

const FILTER_INPUT_CLASS =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] text-ink outline-none focus:border-[#3b82f6]";
const FORM_CONTROL_CLASS =
  "h-[38px] w-full rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";
const SELECT_CONTROL_CLASS = `${FORM_CONTROL_CLASS} cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8`;

export default function ReportConfigPage() {
  const canCreate = useCan("create", "REPORT_CONFIG");
  const canUpdate = useCan("update", "REPORT_CONFIG");
  const [items, setItems] = useState<ReportConfig[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getReportConfigList()
      .then(setItems)
      .catch(() => setToast("Không tải được danh sách cấu hình báo cáo"));
  }, []);

  const [fNam, setFNam] = useState("");
  const [fTen, setFTen] = useState("");
  const [fKy, setFKy] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [inputTen, setInputTen] = useState("");
  const [inputNam, setInputNam] = useState("");
  const [inputKy, setInputKy] = useState("");
  const [inputBatDau, setInputBatDau] = useState("");
  const [inputKetThuc, setInputKetThuc] = useState("");
  const [inputActive, setInputActive] = useState("1");
  const [panelErrors, setPanelErrors] = useState<{
    ten?: string;
    nam?: string;
    ky?: string;
    batDau?: string;
    ketThuc?: string;
  }>({});

  const filtered = useMemo(() => {
    return items.filter(
      (r) =>
        r.nam.includes(fNam) &&
        (!fTen || r.ten === fTen) &&
        (!fKy || r.ky === fKy),
    );
  }, [items, fNam, fTen, fKy]);

  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(currentPage, lastPage);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paged = filtered.slice(start, end);

  const toggleStatus = (id: number, active: boolean) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, active } : r)));
    toggleReportConfigActive(id, active)
      .then(() => setToast("Cập nhật trạng thái thành công"))
      .catch(() => {
        setItems((prev) => prev.map((r) => (r.id === id ? { ...r, active: !active } : r)));
        setToast("Cập nhật thất bại");
      });
  };

  const openAdd = () => {
    setEditId(null);
    setInputTen("");
    setInputNam("");
    setInputKy("");
    setInputBatDau("");
    setInputKetThuc("");
    setInputActive("1");
    setPanelErrors({});
    setPanelOpen(true);
  };

  const openEdit = (r: ReportConfig) => {
    setEditId(r.id);
    setInputTen(r.ten);
    setInputNam(r.nam);
    setInputKy(r.ky);
    setInputBatDau("");
    setInputKetThuc("");
    setInputActive(r.active ? "1" : "0");
    setPanelErrors({});
    setPanelOpen(true);
  };

  const savePanel = async () => {
    const errors: typeof panelErrors = {};
    if (!inputTen) errors.ten = "Vui lòng chọn tên báo cáo";
    if (!inputNam.trim()) errors.nam = "Năm không được để trống";
    else if (!/^\d{4}$/.test(inputNam.trim())) errors.nam = "Năm phải là 4 chữ số";
    if (!inputKy) errors.ky = "Vui lòng chọn kỳ báo cáo";
    if (!editId) {
      if (!inputBatDau) errors.batDau = "Ngày bắt đầu không được để trống";
      if (!inputKetThuc) errors.ketThuc = "Ngày kết thúc không được để trống";
      else if (inputBatDau && inputKetThuc < inputBatDau)
        errors.ketThuc = "Ngày kết thúc phải sau ngày bắt đầu";
    } else if (inputBatDau && inputKetThuc && inputKetThuc < inputBatDau) {
      errors.ketThuc = "Ngày kết thúc phải sau ngày bắt đầu";
    }
    if (Object.keys(errors).length > 0) {
      setPanelErrors(errors);
      return;
    }
    setPanelErrors({});
    const active = inputActive === "1";
    setSaving(true);
    try {
      if (editId) {
        const payload: Parameters<typeof updateReportConfig>[1] = {
          nam: inputNam,
          ten: inputTen,
          ky: inputKy,
          active,
        };
        if (inputBatDau) payload.batDau = inputBatDau;
        if (inputKetThuc) payload.ketThuc = inputKetThuc;
        const updated = await updateReportConfig(editId, payload);
        setItems((prev) => prev.map((r) => (r.id === editId ? updated : r)));
      } else {
        const created = await createReportConfig({
          nam: inputNam,
          ten: inputTen,
          ky: inputKy,
          batDau: inputBatDau,
          ketThuc: inputKetThuc,
          active,
        });
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

  const thBase = "border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151] whitespace-nowrap";

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
          <h1 className="text-base font-semibold text-ink">Danh sách cấu hình báo cáo</h1>
          <button type="button" onClick={openAdd} disabled={!canCreate} title={canCreate ? undefined : "Bạn không có quyền thêm"} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Thêm mới
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    <th className={`${thBase} w-12`}>Thao tác</th>
                    <th className={`${thBase} w-28`}>Năm báo cáo</th>
                    <th className={thBase}>Tên báo cáo</th>
                    <th className={`${thBase} w-32`}>Kỳ báo cáo</th>
                    <th className={`${thBase} w-36`}>Thời gian bắt đầu</th>
                    <th className={`${thBase} w-36`}>Thời gian kết thúc</th>
                    <th className={`${thBase} w-32 text-center`}>Trạng thái</th>
                  </tr>
                  <tr>
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                      <input className={FILTER_INPUT_CLASS} value={fNam} onChange={(e) => { setFNam(e.target.value); setCurrentPage(1); }} placeholder="Năm" />
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                      <select className={`${FILTER_INPUT_CLASS} cursor-pointer bg-white`} value={fTen} onChange={(e) => { setFTen(e.target.value); setCurrentPage(1); }}>
                        <option value="">Tất cả</option>
                        {REPORT_NAME_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                      <select className={`${FILTER_INPUT_CLASS} cursor-pointer bg-white`} value={fKy} onChange={(e) => { setFKy(e.target.value); setCurrentPage(1); }}>
                        <option value="">Tất cả</option>
                        {KY_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3.5 py-8 text-center text-[13.5px] text-muted">Không có dữ liệu</td>
                    </tr>
                  ) : (
                    paged.map((r) => (
                      <tr key={r.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                        <td className="px-3.5 py-2.5">
                          <button type="button" onClick={() => openEdit(r)} disabled={!canUpdate} title={canUpdate ? "Chỉnh sửa" : "Bạn không có quyền sửa"} className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{r.nam}</td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{r.ten}</td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{r.ky}</td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{r.batDau}</td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{r.ketThuc}</td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex justify-center">
                            <Switch checked={r.active} onChange={(c) => toggleStatus(r.id, c)} disabled={!canUpdate} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

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

      <SlidePanel
        open={panelOpen}
        title={editId ? "Chỉnh sửa" : "Thêm mới"}
        onClose={() => setPanelOpen(false)}
        width={400}
        footer={
          <>
            <button type="button" onClick={() => setPanelOpen(false)} disabled={saving} className="h-9 rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50">Huỷ bỏ</button>
            <button type="button" onClick={savePanel} disabled={saving} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </>
        }
      >
        <div className="mb-4 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-[#374151]">Tên báo cáo <span className="text-danger">*</span></label>
          <select
            className={`${SELECT_CONTROL_CLASS}${panelErrors.ten ? " border-danger" : ""}`}
            value={inputTen}
            onChange={(e) => { setInputTen(e.target.value); if (panelErrors.ten) setPanelErrors((p) => ({ ...p, ten: undefined })); }}
          >
            <option value="">-- Chọn báo cáo --</option>
            {REPORT_NAME_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          {panelErrors.ten && <p className="mt-0.5 text-[11px] text-danger">{panelErrors.ten}</p>}
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-[#374151]">Năm <span className="text-danger">*</span></label>
            <input
              className={`${FORM_CONTROL_CLASS}${panelErrors.nam ? " border-danger" : ""}`}
              value={inputNam}
              onChange={(e) => { setInputNam(e.target.value); if (panelErrors.nam) setPanelErrors((p) => ({ ...p, nam: undefined })); }}
              placeholder="VD: 2024"
            />
            {panelErrors.nam && <p className="mt-0.5 text-[11px] text-danger">{panelErrors.nam}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-[#374151]">Kỳ báo cáo <span className="text-danger">*</span></label>
            <select
              className={`${SELECT_CONTROL_CLASS}${panelErrors.ky ? " border-danger" : ""}`}
              value={inputKy}
              onChange={(e) => { setInputKy(e.target.value); if (panelErrors.ky) setPanelErrors((p) => ({ ...p, ky: undefined })); }}
            >
              <option value="">-- Chọn kỳ --</option>
              {KY_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            {panelErrors.ky && <p className="mt-0.5 text-[11px] text-danger">{panelErrors.ky}</p>}
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-[#374151]">Ngày bắt đầu <span className="text-danger">*</span></label>
            <DateInput
              value={inputBatDau}
              onChange={(v) => { setInputBatDau(v); if (panelErrors.batDau) setPanelErrors((p) => ({ ...p, batDau: undefined })); }}
              error={!!panelErrors.batDau}
            />
            {panelErrors.batDau && <p className="mt-0.5 text-[11px] text-danger">{panelErrors.batDau}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-[#374151]">Ngày kết thúc <span className="text-danger">*</span></label>
            <DateInput
              value={inputKetThuc}
              onChange={(v) => { setInputKetThuc(v); if (panelErrors.ketThuc) setPanelErrors((p) => ({ ...p, ketThuc: undefined })); }}
              error={!!panelErrors.ketThuc}
            />
            {panelErrors.ketThuc && <p className="mt-0.5 text-[11px] text-danger">{panelErrors.ketThuc}</p>}
          </div>
        </div>
        <div className="mb-4 flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-[#374151]">Trạng thái</label>
          <select className={SELECT_CONTROL_CLASS} value={inputActive} onChange={(e) => setInputActive(e.target.value)}>
            <option value="1">Hoạt động</option>
            <option value="0">Ngừng hoạt động</option>
          </select>
        </div>
      </SlidePanel>

      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
