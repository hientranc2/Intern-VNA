"use client";

import { useState } from "react";
import { Toast } from "@/libs/core/components/Toast/Toast";

type PageView = "list" | "form";
type FormSection = "ttct" | "tnld" | "tongquan";
type SubTab = "tongSo" | "chiTiet";

type ReportRecord = {
  id: number;
  ten: string;
  mst: string;
  ky: string;
  tt: "Đang báo cáo" | "Đã nộp";
};

const INITIAL_REPORTS: ReportRecord[] = [
  { id: 1, ten: "Công ty TNHH Thương mại Dịch vụ Vận tải Phạm Thiên Ân", mst: "0317118106", ky: "6 tháng", tt: "Đang báo cáo" },
  { id: 2, ten: "Công ty TNHH Thương mại Dịch vụ Vận tải Phạm Thiên Ân", mst: "0317118106", ky: "Cả năm", tt: "Đã nộp" },
];

const SECTION_OPTIONS: { value: FormSection; label: string }[] = [
  { value: "ttct", label: "Thông tin doanh nghiệp" },
  { value: "tnld", label: "2. Tai nạn lao động được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ" },
  { value: "tongquan", label: "Xem tổng quan báo cáo tai nạn lao động" },
];

const FORM_CONTROL_CLASS =
  "h-[38px] rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] disabled:bg-[#f9fafb] disabled:text-muted";
const SELECT_CONTROL_CLASS = `${FORM_CONTROL_CLASS} min-w-[280px] cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8`;

const CT_TH = "border border-line bg-[#f9fafb] px-2 py-1.5 text-center text-[11px] font-semibold text-[#374151] align-middle";
const CT_TD = "border border-line px-2 py-1.5 text-center text-[11px] text-[#374151] align-middle";

export default function EnterpriseReportPage() {
  const [view, setView] = useState<PageView>("list");
  const [section, setSection] = useState<FormSection>("ttct");
  const [subTab, setSubTab] = useState<SubTab>("tongSo");
  const [toast, setToast] = useState<string | null>(null);

  // Form fields
  const [totalLao, setTotalLao] = useState("10");
  const [totalNu, setTotalNu] = useState("5");
  const [tongLuong, setTongLuong] = useState("10.2");
  const [tongVu, setTongVu] = useState("1");
  const [vuChet, setVuChet] = useState("1");
  const [vuNhieu, setVuNhieu] = useState("0");

  const nextSection = () => {
    const idx = SECTION_OPTIONS.findIndex((o) => o.value === section);
    if (idx < SECTION_OPTIONS.length - 1) setSection(SECTION_OPTIONS[idx + 1].value);
  };

  const saveReport = () => {
    setView("list");
    setToast("Lưu báo cáo thành công");
  };

  const sendReport = () => {
    setView("list");
    setToast("Gửi báo cáo thành công");
  };

  return (
    <>
      <Toast message={toast} onDone={() => setToast(null)} />

      {view === "list" ? (
        <>
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <h1 className="text-base font-semibold text-ink">Báo cáo định kỳ Tai nạn lao động</h1>
            <div className="flex items-center gap-2.5">
              <select
                className="h-[34px] cursor-pointer appearance-none rounded-md border border-line bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat px-3 pr-8 text-[13px] outline-none"
                defaultValue="2023"
              >
                <option>2022</option>
                <option>2023</option>
                <option>2024</option>
              </select>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    <th className="w-28 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">Thao tác</th>
                    <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">Tên doanh nghiệp</th>
                    <th className="w-36 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">Mã số thuế</th>
                    <th className="w-32 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">Kỳ báo cáo</th>
                    <th className="w-40 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {INITIAL_REPORTS.map((r) => (
                    <tr key={r.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                      <td className="px-3.5 py-2.5">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => { setSection("ttct"); setView("form"); }}
                            title="Xem / Nộp"
                            className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSection("ttct"); setView("form"); }}
                            title="Nhập báo cáo"
                            className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-[#374151]">{r.ten}</td>
                      <td className="px-3.5 py-2.5 text-[#374151]">{r.mst}</td>
                      <td className="px-3.5 py-2.5 text-[#374151]">{r.ky}</td>
                      <td className="px-3.5 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-[#374151]">
                          <span className={`h-2 w-2 rounded-full ${r.tt === "Đang báo cáo" ? "bg-[#d1d5db]" : "bg-[#3b82f6]"}`} />
                          {r.tt}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-end gap-3 border-t border-[#f3f4f6] px-4 py-3 text-[13px] text-[#374151]">
                <span className="text-[#6b7280]">1 - {INITIAL_REPORTS.length} of {INITIAL_REPORTS.length}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <h1 className="text-base font-semibold text-ink">Báo cáo định kỳ Tai nạn lao động</h1>
            <div className="flex items-center gap-2">
              <span className="mr-2 flex h-[34px] items-center rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-3.5 text-[13.5px] text-[#374151]">2022</span>
              <button type="button" onClick={() => setView("list")} className="mr-1 text-[13px] font-medium text-[#374151] hover:text-ink">Huỷ bỏ</button>
              {section !== "tongquan" ? (
                <button
                  type="button"
                  onClick={nextSection}
                  className="flex h-9 items-center gap-1.5 rounded-md border border-primary px-4 text-[13px] font-semibold text-primary hover:bg-[#eff6ff]"
                >
                  Tiếp tục <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              ) : null}
              <button
                type="button"
                onClick={saveReport}
                className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Lưu
              </button>
              {section === "tongquan" ? (
                <button
                  type="button"
                  onClick={sendReport}
                  className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Gửi báo cáo
                </button>
              ) : null}
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="mb-4">
              <select
                className={SELECT_CONTROL_CLASS}
                value={section}
                onChange={(e) => setSection(e.target.value as FormSection)}
              >
                {SECTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {section === "ttct" ? (
              <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="mb-2 text-[14px] font-bold text-ink">1. Thông tin công ty</div>
                <p className="mb-4 text-[12.5px] font-medium text-danger">
                  *** Lưu ý: nhập tổng quỹ lương 6 tháng khi khai báo TNLĐ 6 tháng hoặc tổng quỹ lương 12 tháng khi khai báo TNLĐ cả năm
                </p>
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Tên công ty</label>
                    <input className={FORM_CONTROL_CLASS} defaultValue="Công ty TNHH ABC" disabled />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Loại hình công ty</label>
                    <input className={FORM_CONTROL_CLASS} defaultValue="Công ty trách nhiệm hữu hạn tư nhân" disabled />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Ngành nghề kinh doanh</label>
                    <input className={FORM_CONTROL_CLASS} defaultValue="Sản xuất cơ khí hàng tiêu dùng" disabled />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Tổng số lao động của cơ sở <span className="text-danger">*</span></label>
                    <input type="number" className={FORM_CONTROL_CLASS} value={totalLao} onChange={(e) => setTotalLao(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Tổng số lao động nữ <span className="text-danger">*</span></label>
                    <input type="number" className={FORM_CONTROL_CLASS} value={totalNu} onChange={(e) => setTotalNu(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Tổng quỹ lương <span className="text-danger">*</span></label>
                    <input type="number" className={FORM_CONTROL_CLASS} value={tongLuong} onChange={(e) => setTongLuong(e.target.value)} />
                    <span className="text-xs text-muted">(1.000đ)</span>
                  </div>
                </div>
              </div>
            ) : section === "tnld" ? (
              <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="mb-4 flex border-b-2 border-[#e5e7eb]">
                  <button
                    type="button"
                    onClick={() => setSubTab("tongSo")}
                    className={`-mb-0.5 border-b-2 px-[18px] py-2.5 text-[13.5px] transition-colors ${
                      subTab === "tongSo" ? "border-primary font-semibold text-primary" : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    (1) Tổng số vụ tai nạn lao động
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab("chiTiet")}
                    className={`-mb-0.5 border-b-2 px-[18px] py-2.5 text-[13.5px] transition-colors ${
                      subTab === "chiTiet" ? "border-primary font-semibold text-primary" : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    (2) Chi tiết các vụ tai nạn lao động
                  </button>
                </div>

                {subTab === "tongSo" ? (
                  <>
                    <p className="mb-3 text-[12.5px] font-medium text-danger">
                      **** Doanh nghiệp xảy ra tai nạn lao động vui lòng nhập theo từng bước
                    </p>
                    <div className="mb-2 text-[14px] font-semibold text-ink">1. Tổng số vụ tai nạn lao động & số nạn nhân tai nạn lao động</div>
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[
                        ["Tổng số vụ *", tongVu, setTongVu],
                        ["Số vụ có người chết *", vuChet, setVuChet],
                        ["Số vụ ≥ 2 người bị nạn *", vuNhieu, setVuNhieu],
                        ["Tổng số người bị nạn *", "10", () => {}],
                      ].map(([label, val, setter]) => (
                        <div key={label as string} className="flex flex-col gap-1.5">
                          <label className="text-[12.5px] font-medium text-[#374151]">{label as string}</label>
                          <input type="number" className={FORM_CONTROL_CLASS} value={val as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-[13.5px] text-muted py-4">Chi tiết từng vụ tai nạn lao động sẽ được nhập ở đây.</div>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="mb-4 text-[14px] font-bold text-ink">Tổng quan báo cáo tai nạn lao động</div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className={`${CT_TH} min-w-[200px] text-left`} rowSpan={2}>Chỉ tiêu</th>
                        <th className={CT_TH} colSpan={3}>Số vụ TNLĐ</th>
                        <th className={CT_TH} colSpan={4}>Số người bị nạn</th>
                      </tr>
                      <tr>
                        <th className={CT_TH}>Tổng số</th>
                        <th className={CT_TH}>Có người chết</th>
                        <th className={CT_TH}>Từ 2 người trở lên</th>
                        <th className={CT_TH}>Tổng số</th>
                        <th className={CT_TH}>Lao động nữ</th>
                        <th className={CT_TH}>Số người chết</th>
                        <th className={CT_TH}>Thương nặng</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-[#f9fafb]">
                        <td className={`${CT_TD} text-left font-bold`}>Tổng số TNLĐ</td>
                        <td className={CT_TD}>{tongVu}</td>
                        <td className={CT_TD}>{vuChet}</td>
                        <td className={CT_TD}>{vuNhieu}</td>
                        <td className={CT_TD}>{totalLao}</td>
                        <td className={CT_TD}>{totalNu}</td>
                        <td className={CT_TD}>{vuChet}</td>
                        <td className={CT_TD}>0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
