"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppTopbar } from "@/libs/tts/components/AppTopbar/AppTopbar";
import { AppSidebar } from "@/libs/tts/components/AppSidebar/AppSidebar";
import { TriCheckbox } from "@/libs/core/components/TriCheckbox/TriCheckbox";
import {
  INITIAL_ENTERPRISES,
  EMPTY_ENTERPRISE_FORM,
  LOAI_HINH_OPTIONS,
  LOAI_FILTER_OPTIONS,
  NGANH_OPTIONS,
  TINH_OPTIONS,
  PHUONG_DKKD_OPTIONS,
  PHUONG_FILTER_OPTIONS,
  type Enterprise,
  type EnterpriseForm,
} from "@/libs/tts/enterprise/enterpriseData";
import { getToken, clearToken } from "@/libs/tts/auth/authApi";
import { Switch } from "@/libs/core/components/Switch/Switch";

type WizardMode = "add" | "edit";

const FILTER_INPUT_CLASS =
  "h-7 w-full rounded-[5px] border border-line px-1.5 text-xs text-ink outline-none focus:border-[#3b82f6]";
const FORM_CONTROL_CLASS =
  "h-[38px] rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";
const SELECT_CONTROL_CLASS = `${FORM_CONTROL_CLASS} cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8`;

const FILE_ROWS = [
  { name: "Giấy phép kinh doanh", info: "GPKD.pdf" },
  { name: "Giấy tờ khác", info: "GTK1.pdf" },
];

function FieldGroup({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12.5px] font-medium text-[#374151]">
        {label} {required ? <span className="text-danger">*</span> : null}
      </label>
      {children}
    </div>
  );
}

export default function EnterprisePage() {
  const router = useRouter();

  const [enterprises, setEnterprises] = useState<Enterprise[]>(INITIAL_ENTERPRISES);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const [fTen, setFTen] = useState("");
  const [fMST, setFMST] = useState("");
  const [fLoai, setFLoai] = useState("");
  const [fNganh, setFNganh] = useState("");
  const [fPhuong, setFPhuong] = useState("");
  const [fTT, setFTT] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<WizardMode>("add");
  const [wizardStep, setWizardStep] = useState(1);
  const [form, setForm] = useState<EnterpriseForm>(EMPTY_ENTERPRISE_FORM);
  const [wizardError, setWizardError] = useState<string | null>(null);

  const [accountPopup, setAccountPopup] = useState<string | null>(null);

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

  const setField = <K extends keyof EnterpriseForm>(key: K, value: EnterpriseForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const filtered = useMemo(() => {
    return enterprises.filter(
      (e) =>
        e.ten.toLowerCase().includes(fTen.toLowerCase()) &&
        e.mst.toLowerCase().includes(fMST.toLowerCase()) &&
        (!fLoai || e.loai === fLoai) &&
        e.nganh.toLowerCase().includes(fNganh.toLowerCase()) &&
        (!fPhuong || e.phuong === fPhuong) &&
        (fTT === "" || (fTT === "1" ? e.active : !e.active)),
    );
  }, [enterprises, fTen, fMST, fLoai, fNganh, fPhuong, fTT]);

  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(currentPage, lastPage);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paged = filtered.slice(start, end);
  const allPageChecked = paged.length > 0 && paged.every((e) => selectedIds.has(e.id));

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
      paged.forEach((e) => (checked ? next.add(e.id) : next.delete(e.id)));
      return next;
    });

  const toggleStatus = (id: number, active: boolean) =>
    setEnterprises((prev) => prev.map((e) => (e.id === id ? { ...e, active } : e)));

  const openWizard = (mode: WizardMode, ent?: Enterprise) => {
    setWizardMode(mode);
    setWizardStep(1);
    setWizardError(null);
    if (mode === "edit" && ent) {
      setForm({
        ...EMPTY_ENTERPRISE_FORM,
        ten: ent.ten,
        mst: ent.mst,
        loai: ent.loai,
        nganh: ent.nganh,
        phuong: ent.phuong,
        email: "vnagroup@gmail.com",
      });
    } else {
      setForm(EMPTY_ENTERPRISE_FORM);
    }
    setWizardOpen(true);
  };

  const goStep2 = () => {
    if (!form.ten.trim() || !form.mst.trim()) {
      setWizardError("Vui lòng nhập đầy đủ thông tin bắt buộc.");
      return;
    }
    setWizardError(null);
    setWizardStep(2);
  };

  const confirmWizard = () => {
    setWizardOpen(false);
    setToast(wizardMode === "add" ? "Thêm mới doanh nghiệp thành công" : "Cập nhật thành công");
    if (wizardMode === "add") {
      const acc = "0" + Math.floor(Math.random() * 9e9).toString().padStart(9, "0");
      setAccountPopup(acc);
    }
  };

  const reviewRows: [string, string][] = [
    ["Mã số thuế :", form.mst || "210987802"],
    ["Tên doanh nghiệp :", form.ten],
    ["Tên viết bằng tiếng nước ngoài :", form.tenNN || "VNA Group"],
    ["Email :", form.email || "vna@gmail.com"],
    ["Ngày cấp GPKD:", form.ngayCap || ""],
    ["Loại hình kinh doanh:", form.loai || "Công ty TNHH"],
    ["Ngành nghề kinh doanh", form.nganh || "4669 - Bán buôn chuyên doanh khác chưa được phân vào đâu"],
    ["Địa chỉ đăng ký giấy phép kinh doanh :", "Vạn phúc City, Phường Tân Định, Thành phố Hồ Chí Minh"],
    ["Địa điểm kinh doanh :", form.diaDiem || "Vạn phúc City, Phường Tân Định, Thành phố Hồ Chí Minh"],
    ["Người đứng đầu doanh nghiệp", form.nguoiDD || "111111"],
    ["SDT người đứng đầu", form.sdtDD || "0932768093"],
  ];

  const thBase =
    "whitespace-nowrap border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2.5 text-left text-[12.5px] font-semibold text-[#374151]";

  return (
    <div className="min-h-screen bg-body text-ink">
      <AppTopbar orgName="Ủy ban nhân dân thành phố Hồ Chí Minh" />
      <AppSidebar active="Quản lý doanh nghiệp" onLogout={handleLogout} />

      <main className="ml-[220px] pt-[52px]">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
          <h1 className="text-base font-semibold text-ink">Danh sách doanh nghiệp</h1>
          <div className="flex gap-2.5">
            <button
              type="button"
              className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-[13px] text-[#374151] hover:bg-[#f9fafb]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Thêm từ file
            </button>
            <button
              type="button"
              onClick={() => openWizard("add")}
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
          <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="w-11 border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2.5 text-left">
                      <TriCheckbox checked={allPageChecked} onChange={toggleAll} />
                    </th>
                    <th className={`${thBase} w-24`}>Thao tác</th>
                    <th className={thBase}>Tên doanh nghiệp</th>
                    <th className={thBase}>Mã số thuế</th>
                    <th className={thBase}>Loại hình kinh doanh</th>
                    <th className={thBase}>Ngành nghề kinh doanh</th>
                    <th className={thBase}>Phường/ xã</th>
                    <th className={`${thBase} text-center`}>Trạng thái</th>
                  </tr>
                  <tr>
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5" />
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5" />
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5">
                      <input className={FILTER_INPUT_CLASS} value={fTen} onChange={(e) => { setFTen(e.target.value); setCurrentPage(1); }} />
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5">
                      <input className={FILTER_INPUT_CLASS} value={fMST} onChange={(e) => { setFMST(e.target.value); setCurrentPage(1); }} />
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5">
                      <select className={`${FILTER_INPUT_CLASS} cursor-pointer bg-white`} value={fLoai} onChange={(e) => { setFLoai(e.target.value); setCurrentPage(1); }}>
                        <option value="">Tất cả</option>
                        {LOAI_FILTER_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5">
                      <input className={FILTER_INPUT_CLASS} value={fNganh} onChange={(e) => { setFNganh(e.target.value); setCurrentPage(1); }} />
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5">
                      <select className={`${FILTER_INPUT_CLASS} cursor-pointer bg-white`} value={fPhuong} onChange={(e) => { setFPhuong(e.target.value); setCurrentPage(1); }}>
                        <option value="">Tất cả</option>
                        {PHUONG_FILTER_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2 py-1.5">
                      <select className={`${FILTER_INPUT_CLASS} cursor-pointer bg-white`} value={fTT} onChange={(e) => { setFTT(e.target.value); setCurrentPage(1); }}>
                        <option value="">Tất cả</option>
                        <option value="1">Hoạt động</option>
                        <option value="0">Ngừng</option>
                      </select>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-[13px] text-muted">
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    paged.map((e) => {
                      const selected = selectedIds.has(e.id);
                      return (
                        <tr key={e.id} className={`border-b border-[#f3f4f6] ${selected ? "bg-[#eff6ff]" : "hover:bg-[#f9fafb]"}`}>
                          <td className="px-3 py-2.5">
                            <TriCheckbox checked={selected} onChange={(c) => toggleRow(e.id, c)} />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-0.5">
                              <button
                                type="button"
                                onClick={() => setToast(`Xem chi tiết doanh nghiệp #${e.id}`)}
                                title="Xem"
                                className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => openWizard("edit", e)}
                                title="Chỉnh sửa"
                                className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                title="Cấu hình"
                                className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="3" />
                                  <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-[#374151]">{e.ten}</td>
                          <td className="px-3 py-2.5 text-[#374151]">{e.mst}</td>
                          <td className="px-3 py-2.5 text-[#374151]">{e.loai}</td>
                          <td className="px-3 py-2.5 text-[#374151]">{e.nganh}</td>
                          <td className="px-3 py-2.5 text-[#374151]">{e.phuong}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex justify-center">
                              <Switch checked={e.active} onChange={(c) => toggleStatus(e.id, c)} />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#f3f4f6] px-4 py-3 text-[13px] text-[#374151]">
              <select
                className="h-[30px] cursor-pointer rounded-[5px] border border-line px-1.5 text-[13px] outline-none"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-[#6b7280]">{total === 0 ? "0 of 0" : `${start + 1} - ${end} of ${total}`}</span>
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
      </main>

      {/* Wizard */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) setWizardOpen(false);
        }}
        className={`fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-black/50 pt-10 transition-opacity duration-200 ${
          wizardOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`mb-10 w-[760px] max-w-[96vw] rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)] transition-transform duration-200 ${
            wizardOpen ? "translate-y-0" : "translate-y-3"
          }`}
        >
          {/* Stepper */}
          <div className="flex items-center justify-center gap-0 pb-4 pt-6">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[13px] font-bold ${
                  wizardStep === 1 ? "border-primary bg-white text-primary" : "border-primary bg-primary text-white"
                }`}
              >
                {wizardStep === 1 ? (
                  "1"
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className={`text-[13px] ${wizardStep >= 1 ? "font-medium text-ink" : "text-[#9ca3af]"}`}>
                Thông tin doanh nghiệp
              </span>
            </div>
            <div className={`mx-2 h-0.5 w-[60px] ${wizardStep === 2 ? "bg-primary" : "bg-[#e5e7eb]"}`} />
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[13px] font-bold ${
                  wizardStep === 2 ? "border-primary bg-white text-primary" : "border-[#d1d5db] bg-white text-[#9ca3af]"
                }`}
              >
                2
              </div>
              <span className={`text-[13px] ${wizardStep === 2 ? "font-medium text-ink" : "text-[#9ca3af]"}`}>
                Xác nhận đăng ký
              </span>
            </div>
          </div>

          {wizardStep === 1 ? (
            <>
              <div className="px-7 pb-6">
                <div className="mb-4 text-[15px] font-bold text-ink">
                  {wizardMode === "add" ? "Thêm mới doanh nghiệp" : "Cập nhật doanh nghiệp"}
                </div>
                {wizardError ? (
                  <div className="mb-4 rounded-md border border-[#fca5a5] bg-[#fff1f0] px-3.5 py-2.5 text-[13px] text-[#b91c1c]">
                    {wizardError}
                  </div>
                ) : null}

                <div className="mb-4 rounded-lg border border-[#e5e7eb] p-5">
                  <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                    <FieldGroup label="Tên doanh nghiệp" required>
                      <input className={FORM_CONTROL_CLASS} value={form.ten} onChange={(e) => setField("ten", e.target.value)} placeholder="VD: Công ty cổ phần ABC" />
                    </FieldGroup>
                    <FieldGroup label="Mã số thuế" required>
                      <input className={FORM_CONTROL_CLASS} value={form.mst} onChange={(e) => setField("mst", e.target.value)} placeholder="VD: 0310000888292" />
                    </FieldGroup>
                    <FieldGroup label="Loại hình kinh doanh" required>
                      <select className={SELECT_CONTROL_CLASS} value={form.loai} onChange={(e) => setField("loai", e.target.value)}>
                        <option value="">-- Chọn loại hình --</option>
                        {LOAI_HINH_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </FieldGroup>
                  </div>
                  <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                    <FieldGroup label="Ngành nghề kinh doanh, chính" required>
                      <select className={SELECT_CONTROL_CLASS} value={form.nganh} onChange={(e) => setField("nganh", e.target.value)}>
                        <option value="">-- Chọn ngành nghề --</option>
                        {NGANH_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </FieldGroup>
                    <FieldGroup label="Ngày cấp GPKD">
                      <input type="date" className={FORM_CONTROL_CLASS} value={form.ngayCap} onChange={(e) => setField("ngayCap", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Tỉnh/Thành phố ĐKKD" required>
                      <select className={SELECT_CONTROL_CLASS} value={form.tinh} onChange={(e) => setField("tinh", e.target.value)}>
                        {TINH_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </FieldGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <FieldGroup label="Phường/Xã ĐKKD" required>
                      <select className={SELECT_CONTROL_CLASS} value={form.phuong} onChange={(e) => setField("phuong", e.target.value)}>
                        {PHUONG_DKKD_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </FieldGroup>
                    <FieldGroup label="Địa chỉ">
                      <input className={FORM_CONTROL_CLASS} value={form.diaChi} onChange={(e) => setField("diaChi", e.target.value)} placeholder="VD: 162 đường số 2, khu đô thị Vạn Phúc" />
                    </FieldGroup>
                  </div>
                </div>

                <div className="my-3 text-[13.5px] font-semibold text-[#374151]">Thông tin liên hệ</div>
                <div className="mb-4 rounded-lg border border-[#e5e7eb] p-5">
                  <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                    <FieldGroup label="Tên viết bằng tiếng nước ngoài">
                      <input className={FORM_CONTROL_CLASS} value={form.tenNN} onChange={(e) => setField("tenNN", e.target.value)} placeholder="VD: VNA Group" />
                    </FieldGroup>
                    <FieldGroup label="Email" required>
                      <input type="email" className={FORM_CONTROL_CLASS} value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="vna@gmail.com" />
                    </FieldGroup>
                    <FieldGroup label="Số điện thoại cơ quan">
                      <input className={FORM_CONTROL_CLASS} value={form.sdt} onChange={(e) => setField("sdt", e.target.value)} placeholder="VD: 0283xxxxxxx" />
                    </FieldGroup>
                  </div>
                  <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                    <FieldGroup label="Tỉnh/TP hoạt động KD">
                      <select className={SELECT_CONTROL_CLASS} value={form.tinhHD} onChange={(e) => setField("tinhHD", e.target.value)}>
                        <option value="">-- Chọn tỉnh --</option>
                        {TINH_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </FieldGroup>
                    <FieldGroup label="Phường/xã hoạt động KD">
                      <select className={SELECT_CONTROL_CLASS} value={form.phuongHD} onChange={(e) => setField("phuongHD", e.target.value)}>
                        <option value="">-- Chọn phường/xã --</option>
                        {PHUONG_FILTER_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </FieldGroup>
                    <div />
                  </div>
                  <div className="grid grid-cols-3 gap-3.5">
                    <FieldGroup label="Địa điểm kinh doanh">
                      <input className={FORM_CONTROL_CLASS} value={form.diaDiem} onChange={(e) => setField("diaDiem", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Người đứng đầu doanh nghiệp">
                      <input className={FORM_CONTROL_CLASS} value={form.nguoiDD} onChange={(e) => setField("nguoiDD", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="SĐT liên hệ người đứng đầu">
                      <input className={FORM_CONTROL_CLASS} value={form.sdtDD} onChange={(e) => setField("sdtDD", e.target.value)} />
                    </FieldGroup>
                  </div>
                </div>

                <div className="my-3 text-[13.5px] font-semibold text-[#374151]">File đính kèm</div>
                <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        <th className="w-[200px] border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Tên file</th>
                        <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Thông tin file</th>
                        <th className="w-[120px] border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FILE_ROWS.map((f) => (
                        <tr key={f.name} className="border-b border-[#f3f4f6] last:border-b-0">
                          <td className="px-3 py-2 text-[#374151]">{f.name}</td>
                          <td className="px-3 py-2 text-[#374151]">{f.info}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1.5 text-muted">
                              <button type="button" className="hover:text-primary" title="Xem">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                              <button type="button" className="hover:text-primary" title="Tải lên">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                  <polyline points="17 8 12 3 7 8" />
                                  <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                              </button>
                              <button type="button" className="hover:text-danger" title="Xóa">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4h6v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 border-t border-[#e5e7eb] px-7 py-4">
                <button type="button" onClick={() => setWizardOpen(false)} className="h-[38px] rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb]">
                  Huỷ bỏ
                </button>
                <button type="button" onClick={goStep2} className="flex h-[38px] items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af]">
                  Tiếp tục
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="px-7 pb-6">
                <div className="mb-4 text-[15px] font-bold text-ink">Thông tin về hồ sơ</div>
                <div className="rounded-lg border border-[#e5e7eb] p-5">
                  {reviewRows.map(([label, value]) => (
                    <div key={label} className="flex border-b border-[#f3f4f6] py-2.5 last:border-b-0">
                      <span className="w-[280px] shrink-0 text-[13.5px] font-semibold text-[#374151]">{label}</span>
                      <span className="text-[13.5px] text-ink">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 overflow-hidden rounded-lg border border-[#e5e7eb]">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        <th className="w-[200px] border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Tên file</th>
                        <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Thông tin file</th>
                        <th className="w-20 border-b border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left text-[12.5px] text-[#374151]">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FILE_ROWS.map((f) => (
                        <tr key={f.name} className="border-b border-[#f3f4f6] last:border-b-0">
                          <td className="px-3 py-2 text-[#374151]">{f.name}</td>
                          <td className="px-3 py-2 text-[#374151]">{f.info}</td>
                          <td className="px-3 py-2">
                            <button type="button" className="text-muted hover:text-primary" title="Xem">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 border-t border-[#e5e7eb] px-7 py-4">
                <button type="button" onClick={() => setWizardStep(1)} className="h-[38px] rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb]">
                  Trở về
                </button>
                <button type="button" onClick={confirmWizard} className="flex h-[38px] items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Xác nhận
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Account popup */}
      {accountPopup ? (
        <>
          <div className="fixed inset-0 z-[399] bg-black/50" onClick={() => setAccountPopup(null)} />
          <div className="fixed left-1/2 top-1/2 z-[400] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="rounded-t-[10px] bg-primary px-5 py-3.5">
              <h3 className="text-center text-[15px] font-bold text-white">Thông tin tài khoản</h3>
            </div>
            <div className="px-5 pb-3 pt-4">
              <p className="mb-2 text-[13.5px] text-ink">
                • Tài khoản: <strong>{accountPopup}</strong>
              </p>
              <p className="mb-2 text-[13.5px] text-ink">
                • Mật khẩu: <strong>12345678</strong>
              </p>
            </div>
            <div className="px-5 pb-3.5 text-right">
              <button type="button" onClick={() => setAccountPopup(null)} className="text-[13px] text-muted hover:text-[#374151]">
                Huỷ bỏ
              </button>
            </div>
          </div>
        </>
      ) : null}

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
