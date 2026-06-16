"use client";

import { Fragment, useEffect, useState } from "react";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { localISODate } from "@/libs/shared/core/utils/dateUtils";
import { DateInput } from "@/libs/shared/core/components/DateInput/DateInput";
import {
  getDnReportList,
  getDnReportById,
  updateDnReport,
  type ReportTongHop,
} from "@/libs/tts/accident-report/enterpriseReportApi";
import { TONGHOP_II_GROUPS, PHAN_LOAI_COLS } from "@/libs/tts/accident-report/accidentReportData";

type PageView = "list" | "form";
type FormSection = "ttct" | "tnld" | "phanloai" | "tongquan";
type SubTab = "tongSo" | "chiTiet";

type ReportRecord = {
  id: number;
  ten: string;
  mst: string;
  ky: string;
  tt: "Đang báo cáo" | "Đã nộp";
};

type AccidentDetail = {
  id: number;
  hoTen: string;
  ngaySinh: string;
  gioiTinh: string;
  ngheNghiep: string;
  loaiHopDong: string;
  mucDo: string;
  ngayXayRa: string;
  diaDiem: string;
  yeuTo: string;
};

const SECTION_OPTIONS: { value: FormSection; label: string }[] = [
  { value: "ttct", label: "Thông tin doanh nghiệp" },
  { value: "tnld", label: "2. Tai nạn lao động được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ" },
  { value: "phanloai", label: "3. Phân loại TNLĐ (theo ngành nghề / nguyên nhân / yếu tố)" },
  { value: "tongquan", label: "Xem tổng quan báo cáo tai nạn lao động" },
];

// Danh sách mã hạng mục phần II (1..24) và state rỗng cho lưới nhập phân loại.
const PHAN_LOAI_MAS = TONGHOP_II_GROUPS.flatMap((g) => g.items.map((i) => i.ma));
const emptyPhanLoai = (): Record<string, string[]> =>
  Object.fromEntries(PHAN_LOAI_MAS.map((ma) => [ma, Array(PHAN_LOAI_COLS.length).fill("0")]));

// Bỏ ký tự phân tách nghìn ("10.000.000" -> 10000000), trả về số nguyên không âm.
const parseNum = (s: string): number => Number(String(s).replace(/[^\d]/g, "")) || 0;

const FC = "h-[38px] rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] disabled:bg-[#f9fafb] disabled:text-muted";
const SC = `${FC} w-full cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8`;
const SELECT_TOP_CLASS = `${FC} min-w-[280px] cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8`;

const CT_TH = "border border-line bg-[#f9fafb] px-2 py-1.5 text-center text-[11px] font-semibold text-[#374151] align-middle";
const CT_TD = "border border-line px-2 py-1.5 text-center text-[11px] text-[#374151] align-middle";

const EMPTY_DETAIL: Omit<AccidentDetail, "id"> = {
  hoTen: "", ngaySinh: "", gioiTinh: "Nam", ngheNghiep: "",
  loaiHopDong: "Hợp đồng xác định thời hạn", mucDo: "Thương nhẹ",
  ngayXayRa: "", diaDiem: "", yeuTo: "",
};

export default function EnterpriseReportPage() {
  const [view, setView] = useState<PageView>("list");
  const [section, setSection] = useState<FormSection>("ttct");
  const [subTab, setSubTab] = useState<SubTab>("tongSo");
  const [toast, setToast] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportRecord[]>([]);

  useEffect(() => {
    getDnReportList()
      .then(setReports)
      .catch(() => {});
  }, []);

  // Thông tin công ty
  const [totalLao, setTotalLao] = useState("10");
  const [totalNu, setTotalNu] = useState("5");
  const [tongLuong, setTongLuong] = useState("10.2");

  // Tổng số vụ
  const [tongVu, setTongVu] = useState("1");
  const [vuChet, setVuChet] = useState("1");
  const [vuNhieu, setVuNhieu] = useState("0");

  // Số nạn nhân
  const [tongNan, setTongNan] = useState("10");
  const [tongNanNu, setTongNanNu] = useState("5");
  const [tongChetNN, setTongChetNN] = useState("5");
  const [tongThuongNang, setTongThuongNang] = useState("10");

  // Không thuộc quyền quản lý
  const [nanKhongQL, setNanKhongQL] = useState("0");
  const [nuKhongQL, setNuKhongQL] = useState("0");
  const [chetKhongQL, setChetKhongQL] = useState("0");
  const [thuongKhongQL, setThuongKhongQL] = useState("0");

  // Thiệt hại
  const [chiPhiYTe, setChiPhiYTe] = useState("10.000.000");
  const [chiPhiLuong, setChiPhiLuong] = useState("10.000.000");
  const [chiPhiBTTC, setChiPhiBTTC] = useState("10.000.000");
  const [tongChiPhi, setTongChiPhi] = useState("30.000.000");
  const [soNgayNghi, setSoNgayNghi] = useState("20");
  const [thiHaiTaiSan, setThiHaiTaiSan] = useState("10.000.000");

  // Chi tiết từng vụ
  const [accidentDetails, setAccidentDetails] = useState<AccidentDetail[]>([]);

  // Báo cáo đang chỉnh + lưới phân loại phần II + cờ đang lưu
  const [editingId, setEditingId] = useState<number | null>(null);
  const [phanLoai, setPhanLoai] = useState<Record<string, string[]>>(emptyPhanLoai);
  const [saving, setSaving] = useState(false);

  const setPhanLoaiCell = (ma: string, col: number, val: string) =>
    setPhanLoai((prev) => ({
      ...prev,
      [ma]: prev[ma].map((c, i) => (i === col ? val : c)),
    }));

  const openReport = (r: ReportRecord) => {
    setEditingId(r.id);
    setSection("ttct");
    setSubTab("tongSo");
    setView("form");
    getDnReportById(r.id)
      .then((res) => {
        const t = res.form.tongHop;
        setTotalLao(String(t.soLaoDong));
        setTongVu(String(t.soVu));
        setVuChet(String(t.soVuCoNguoiChet));
        setVuNhieu(String(t.soVuCo2NguoiBiNan));
        setTongNan(String(t.soNguoiBiNan));
        setTongNanNu(String(t.soLDNu));
        setTongChetNN(String(t.soNguoiBiChet));
        setTongThuongNang(String(t.soNguoiBiThuongNang));
        setSoNgayNghi(String(t.soNgayNghi));
        setChiPhiYTe(String(t.chiPhiYTe));
        setChiPhiLuong(String(t.chiPhiTraLuong));
        setChiPhiBTTC(String(t.boiThuongTroCap));
        setTongChiPhi(String(t.tongSoTien));
        setThiHaiTaiSan(String(t.thiethaiTaiSan));
        const next = emptyPhanLoai();
        for (const ma of PHAN_LOAI_MAS) {
          const arr = res.form.phanLoaiRows?.[ma];
          if (Array.isArray(arr))
            next[ma] = next[ma].map((d, i) => (arr[i] !== undefined ? String(arr[i]) : d));
        }
        setPhanLoai(next);
      })
      .catch(() => {});
  };

  const buildTongHop = (): ReportTongHop => ({
    soLaoDong: parseNum(totalLao),
    soLDCoBaoHiem: 0,
    soLDNu: parseNum(tongNanNu),
    soVu: parseNum(tongVu),
    soVuCoNguoiChet: parseNum(vuChet),
    soVuCo2NguoiBiNan: parseNum(vuNhieu),
    soNguoiBiNan: parseNum(tongNan),
    soNguoiBiChet: parseNum(tongChetNN),
    soNguoiBiThuongNang: parseNum(tongThuongNang),
    soNgayNghi: parseNum(soNgayNghi),
    tongSoTien: parseNum(tongChiPhi),
    chiPhiYTe: parseNum(chiPhiYTe),
    chiPhiTraLuong: parseNum(chiPhiLuong),
    boiThuongTroCap: parseNum(chiPhiBTTC),
    thiethaiTaiSan: parseNum(thiHaiTaiSan),
  });

  const buildPhanLoai = (): Record<string, number[]> =>
    Object.fromEntries(PHAN_LOAI_MAS.map((ma) => [ma, phanLoai[ma].map(parseNum)]));

  const nextSection = () => {
    const idx = SECTION_OPTIONS.findIndex((o) => o.value === section);
    if (idx < SECTION_OPTIONS.length - 1) setSection(SECTION_OPTIONS[idx + 1].value);
  };

  const validateReport = (): boolean => {
    const ttctFields: [string, string][] = [
      ["Tổng số lao động của cơ sở", totalLao],
      ["Tổng số lao động nữ", totalNu],
      ["Tổng quỹ lương", tongLuong],
    ];
    const tnldFields: [string, string][] = [
      ["Tổng số vụ", tongVu],
      ["Số vụ có người chết", vuChet],
      ["Số vụ ≥ 2 người bị nạn", vuNhieu],
      ["Tổng số người bị nạn", tongNan],
      ["Tổng số lao động nữ bị nạn", tongNanNu],
      ["Tổng số người bị chết", tongChetNN],
      ["Tổng số người bị thương nặng", tongThuongNang],
      ["Số người bị nạn không QL", nanKhongQL],
      ["Lao động nữ bị nạn không QL", nuKhongQL],
      ["Số người chết không QL", chetKhongQL],
      ["Người bị thương nặng không QL", thuongKhongQL],
      ["Chi phí y tế", chiPhiYTe],
      ["Chi phí trả lương trong thời gian điều trị", chiPhiLuong],
      ["Chi phí bồi thường trợ cấp", chiPhiBTTC],
      ["Tổng số tiền chi phí", tongChiPhi],
      ["Tổng số ngày nghỉ vì TNLĐ", soNgayNghi],
    ];

    const emptyTtct = ttctFields.find(([, v]) => !v.trim());
    if (emptyTtct) {
      setSection("ttct");
      setToast(`Vui lòng nhập: ${emptyTtct[0]}`);
      return false;
    }
    const emptyTnld = tnldFields.find(([, v]) => !v.trim());
    if (emptyTnld) {
      setSection("tnld");
      setSubTab("tongSo");
      setToast(`Vui lòng nhập: ${emptyTnld[0]}`);
      return false;
    }
    const negative = [...ttctFields, ...tnldFields].find(([, v]) => v.trim().startsWith("-"));
    if (negative) {
      setToast(`${negative[0]} không được là số âm`);
      return false;
    }
    return true;
  };

  const submit = async (status: string, successMsg: string) => {
    if (!validateReport()) return;
    if (editingId == null) {
      setToast("Không xác định được báo cáo để lưu");
      return;
    }
    setSaving(true);
    try {
      await updateDnReport(editingId, {
        status,
        ...buildTongHop(),
        phanLoaiRows: buildPhanLoai(),
      });
      const list = await getDnReportList();
      setReports(list);
      setView("list");
      setToast(successMsg);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Lưu báo cáo thất bại");
    } finally {
      setSaving(false);
    }
  };

  const saveReport = () => submit("Đang báo cáo", "Lưu báo cáo thành công");
  const sendReport = () => submit("Đã nộp", "Gửi báo cáo thành công");

  const addDetail = () => {
    setAccidentDetails((prev) => [...prev, { id: Date.now(), ...EMPTY_DETAIL }]);
  };

  const updateDetail = <K extends keyof AccidentDetail>(id: number, key: K, val: AccidentDetail[K]) => {
    setAccidentDetails((prev) => prev.map((d) => (d.id === id ? { ...d, [key]: val } : d)));
  };

  const removeDetail = (id: number) => {
    setAccidentDetails((prev) => prev.filter((d) => d.id !== id));
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
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                      <td className="px-3.5 py-2.5">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => openReport(r)}
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
                            onClick={() => openReport(r)}
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
                <span className="text-[#6b7280]">1 - {reports.length} of {reports.length}</span>
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
                disabled={saving}
                className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
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
                  disabled={saving}
                  className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
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
                className={SELECT_TOP_CLASS}
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
                    <input className={FC} defaultValue="Công ty TNHH ABC" disabled />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Loại hình công ty</label>
                    <input className={FC} defaultValue="Công ty trách nhiệm hữu hạn tư nhân" disabled />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Ngành nghề kinh doanh</label>
                    <input className={FC} defaultValue="Sản xuất cơ khí hàng tiêu dùng" disabled />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Tổng số lao động của cơ sở <span className="text-danger">*</span></label>
                    <input type="number" min={0} className={FC} value={totalLao} onChange={(e) => setTotalLao(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Tổng số lao động nữ <span className="text-danger">*</span></label>
                    <input type="number" min={0} className={FC} value={totalNu} onChange={(e) => setTotalNu(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Tổng quỹ lương <span className="text-danger">*</span></label>
                    <input type="number" min={0} className={FC} value={tongLuong} onChange={(e) => setTongLuong(e.target.value)} />
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

                    <div className="mb-3 grid grid-cols-4 gap-3">
                      {([
                        ["Tổng số vụ *", tongVu, setTongVu],
                        ["Số vụ có người chết *", vuChet, setVuChet],
                        ["Số vụ ≥ 2 người bị nạn *", vuNhieu, setVuNhieu],
                        [null, null, null],
                      ] as [string | null, string | null, ((v: string) => void) | null][]).map(([label, val, setter], i) =>
                        label ? (
                          <div key={i} className="flex flex-col gap-1.5">
                            <label className="text-[12.5px] font-medium text-[#374151]">{label}</label>
                            <input type="number" min={0} className={FC} value={val ?? ""} onChange={(e) => setter?.(e.target.value)} />
                          </div>
                        ) : <div key={i} />
                      )}
                    </div>

                    <div className="mb-3 grid grid-cols-4 gap-3">
                      {([
                        ["Tổng số người bị nạn *", tongNan, setTongNan],
                        ["Tổng số lao động nữ bị nạn *", tongNanNu, setTongNanNu],
                        ["Tổng số người bị chết *", tongChetNN, setTongChetNN],
                        ["Tổng số người bị thương nặng *", tongThuongNang, setTongThuongNang],
                      ] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
                        <div key={label} className="flex flex-col gap-1.5">
                          <label className="text-[12.5px] font-medium text-[#374151]">{label}</label>
                          <input type="number" min={0} className={FC} value={val} onChange={(e) => setter(e.target.value)} />
                        </div>
                      ))}
                    </div>

                    <div className="mb-5 grid grid-cols-4 gap-3">
                      {([
                        ["Số người bị nạn không QL *", nanKhongQL, setNanKhongQL],
                        ["Lao động nữ bị nạn không QL *", nuKhongQL, setNuKhongQL],
                        ["Số người chết không QL *", chetKhongQL, setChetKhongQL],
                        ["Người bị thương nặng không QL *", thuongKhongQL, setThuongKhongQL],
                      ] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
                        <div key={label} className="flex flex-col gap-1.5">
                          <label className="text-[12.5px] font-medium text-[#374151]">{label}</label>
                          <input type="number" min={0} className={FC} value={val} onChange={(e) => setter(e.target.value)} />
                        </div>
                      ))}
                    </div>

                    <div className="mb-2 text-[14px] font-semibold text-ink">2. Thiệt hại do tai nạn lao động</div>

                    <div className="mb-3 grid grid-cols-4 gap-3">
                      {([
                        ["Chi phí y tế *", chiPhiYTe, setChiPhiYTe],
                        ["Chi phí trả lương trong thời gian điều trị *", chiPhiLuong, setChiPhiLuong],
                        ["Chi phí bồi thường trợ cấp *", chiPhiBTTC, setChiPhiBTTC],
                        ["Tổng số tiền chi phí *", tongChiPhi, setTongChiPhi],
                      ] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
                        <div key={label} className="flex flex-col gap-1.5">
                          <label className="text-[12.5px] font-medium text-[#374151]">{label}</label>
                          <input className={FC} value={val} onChange={(e) => setter(e.target.value)} />
                          <span className="text-xs text-muted">(1.000đ)</span>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12.5px] font-medium text-[#374151]">Tổng số ngày nghỉ vì TNLĐ *</label>
                        <input type="number" min={0} className={FC} value={soNgayNghi} onChange={(e) => setSoNgayNghi(e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12.5px] font-medium text-[#374151]">Thiệt hại tài sản</label>
                        <input className={FC} value={thiHaiTaiSan} onChange={(e) => setThiHaiTaiSan(e.target.value)} />
                        <span className="text-xs text-muted">(1.000đ)</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mb-4 text-[12.5px] font-medium text-danger">Chi tiết từng vụ tai nạn lao động</p>
                    {accidentDetails.length === 0 ? (
                      <div className="mb-4 rounded-md border border-dashed border-[#d1d5db] bg-[#f9fafb] py-8 text-center text-[13.5px] text-muted">
                        Chưa có vụ tai nạn nào. Nhấn &quot;Thêm vụ&quot; để bắt đầu nhập.
                      </div>
                    ) : (
                      accidentDetails.map((d, idx) => (
                        <div key={d.id} className="mb-4 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-5">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-[13.5px] font-semibold text-ink">Vụ {idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeDetail(d.id)}
                              className="rounded p-1 text-muted hover:bg-[#fee2e2] hover:text-danger"
                              title="Xoá vụ này"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                              </svg>
                            </button>
                          </div>
                          <div className="mb-3 grid grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[12.5px] font-medium text-[#374151]">Họ và tên nạn nhân <span className="text-danger">*</span></label>
                              <input className={FC} placeholder="VD: Nguyễn Văn A" value={d.hoTen} onChange={(e) => updateDetail(d.id, "hoTen", e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[12.5px] font-medium text-[#374151]">Ngày sinh</label>
                              <DateInput value={d.ngaySinh} onChange={(v) => updateDetail(d.id, "ngaySinh", v)} max={localISODate(new Date())} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[12.5px] font-medium text-[#374151]">Giới tính</label>
                              <select className={SC} value={d.gioiTinh} onChange={(e) => updateDetail(d.id, "gioiTinh", e.target.value)}>
                                <option>Nam</option>
                                <option>Nữ</option>
                              </select>
                            </div>
                          </div>
                          <div className="mb-3 grid grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[12.5px] font-medium text-[#374151]">Nghề nghiệp</label>
                              <input className={FC} placeholder="VD: Thợ hàn" value={d.ngheNghiep} onChange={(e) => updateDetail(d.id, "ngheNghiep", e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[12.5px] font-medium text-[#374151]">Loại hợp đồng lao động</label>
                              <select className={SC} value={d.loaiHopDong} onChange={(e) => updateDetail(d.id, "loaiHopDong", e.target.value)}>
                                <option>Hợp đồng xác định thời hạn</option>
                                <option>Hợp đồng không xác định thời hạn</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[12.5px] font-medium text-[#374151]">Mức độ thương tật</label>
                              <select className={SC} value={d.mucDo} onChange={(e) => updateDetail(d.id, "mucDo", e.target.value)}>
                                <option>Chết</option>
                                <option>Thương nặng</option>
                                <option>Thương nhẹ</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[12.5px] font-medium text-[#374151]">Ngày xảy ra tai nạn</label>
                              <DateInput value={d.ngayXayRa} onChange={(v) => updateDetail(d.id, "ngayXayRa", v)} max={localISODate(new Date())} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[12.5px] font-medium text-[#374151]">Địa điểm xảy ra tai nạn</label>
                              <input className={FC} placeholder="VD: Xưởng sản xuất" value={d.diaDiem} onChange={(e) => updateDetail(d.id, "diaDiem", e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[12.5px] font-medium text-[#374151]">Yếu tố gây chấn thương</label>
                              <select className={SC} value={d.yeuTo} onChange={(e) => updateDetail(d.id, "yeuTo", e.target.value)}>
                                <option value="">-- Chọn yếu tố --</option>
                                <option>Điện</option>
                                <option>Vật rơi, đổ, sập</option>
                                <option>Thiết bị nâng</option>
                                <option>Máy, thiết bị</option>
                                <option>Phương tiện vận tải</option>
                                <option>Khác</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <button
                      type="button"
                      onClick={addDetail}
                      className="flex h-9 items-center gap-1.5 rounded-md border border-dashed border-primary px-4 text-[13px] font-medium text-primary hover:bg-[#eff6ff]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Thêm vụ
                    </button>
                  </>
                )}
              </div>
            ) : section === "phanloai" ? (
              <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="mb-1 text-[14px] font-bold text-ink">3. Phân loại tai nạn lao động</div>
                <p className="mb-4 text-[12.5px] text-muted">
                  Nhập số liệu theo từng hạng mục (để 0 nếu không có). Dữ liệu này tổng hợp vào báo cáo phần II của Sở.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr>
                        <th className={`${CT_TH} sticky left-0 z-10 min-w-[220px] bg-[#f9fafb] text-left`}>Hạng mục</th>
                        {PHAN_LOAI_COLS.map((c) => (
                          <th key={c} className={`${CT_TH} min-w-[72px]`}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TONGHOP_II_GROUPS.map((group) => (
                        <Fragment key={group.category}>
                          <tr className="bg-[#f1f5f9]">
                            <td className={`${CT_TD} text-left font-semibold`} colSpan={PHAN_LOAI_COLS.length + 1}>
                              {group.category}
                            </td>
                          </tr>
                          {group.items.map((item) => (
                            <tr key={item.ma}>
                              <td className={`${CT_TD} sticky left-0 z-10 bg-white text-left`}>{item.label}</td>
                              {PHAN_LOAI_COLS.map((_, col) => (
                                <td key={col} className="border border-line p-0">
                                  <input
                                    type="number"
                                    min={0}
                                    value={phanLoai[item.ma]?.[col] ?? "0"}
                                    onChange={(e) => setPhanLoaiCell(item.ma, col, e.target.value)}
                                    className="h-8 w-full min-w-[64px] px-1.5 text-center text-[11px] text-ink outline-none focus:bg-[#eff6ff]"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                        <td className={CT_TD}>{tongNan}</td>
                        <td className={CT_TD}>{tongNanNu}</td>
                        <td className={CT_TD}>{tongChetNN}</td>
                        <td className={CT_TD}>{tongThuongNang}</td>
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
