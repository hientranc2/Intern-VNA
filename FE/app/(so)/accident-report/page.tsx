"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { TriCheckbox } from "@/libs/shared/core/components/TriCheckbox/TriCheckbox";
import {
  DETAIL_REPORT_ROWS,
  EMPTY_VALS,
  TONGHOP_I_ROWS,
  TONGHOP_II_GROUPS,
  type AccidentReport,
} from "@/libs/tts/accident-report/accidentReportData";
import { getAccidentReportList } from "@/libs/tts/accident-report/accidentReportApi";
import { exportTonghopDocx } from "@/libs/tts/accident-report/exportTonghopDocx";
import { exportDetailDocx } from "@/libs/tts/accident-report/exportDetailDocx";
import { PROVINCES, WARDS_BY_PROVINCE } from "@/libs/tts/location/locationData";
import { SearchableSelect } from "@/libs/shared/core/components/SearchableSelect/SearchableSelect";

type ViewMode = "list" | "detail" | "tonghop";

const FILTER_INPUT_CLASS =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] font-normal text-ink outline-none focus:border-[#3b82f6]";
const FILTER_SELECT_CLASS = `${FILTER_INPUT_CLASS} cursor-pointer appearance-none bg-white bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_8px_center] bg-no-repeat pr-6`;
const SELECT_TOP_CLASS =
  "h-9 min-w-[200px] cursor-pointer appearance-none rounded-md border border-line bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat px-3 pr-8 text-[13px] outline-none";

const CT_TH =
  "border border-line bg-[#f9fafb] px-2 py-1.5 text-center align-middle font-semibold text-[#374151]";
const CT_TD =
  "border border-line px-2 py-1.5 text-center align-middle text-[#374151]";

const fmtMoney = (n: number) => n.toLocaleString("vi-VN");
const fmtRate = (n: number, d: number) =>
  d === 0 ? "0" : ((n / d) * 1000).toFixed(2);

const formatTime = (dStr?: string | null): string => {
  if (!dStr) return "–";
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return "–";
    const date = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${date}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return "–";
  }
};

export default function AccidentReportPage() {
  const [view, setView] = useState<ViewMode>("list");
  const [reports, setReports] = useState<AccidentReport[]>([]);
  const [year, setYear] = useState(() => String(new Date().getFullYear()));

  const yearsList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2022;
    const years = [];
    for (let y = startYear; y <= currentYear; y++) {
      years.push(String(y));
    }
    return years;
  }, []);

  useEffect(() => {
    getAccidentReportList({ page: 1, pageSize: 1000, nam: year || undefined })
      .then((res) => setReports(res.data))
      .catch(() => {});
  }, [year]);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [fTen, setFTen] = useState("");
  const [searchTen, setSearchTen] = useState("");
  const [fMST, setFMST] = useState("");
  const [searchMST, setSearchMST] = useState("");
  const [fKy, setFKy] = useState("");
  const [fTT, setFTT] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("Thành phố Hồ Chí Minh");
  const [selectedWard, setSelectedWard] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return reports.filter(
      (r) =>
        r.ten.toLowerCase().includes(searchTen.toLowerCase()) &&
        r.mst.toLowerCase().includes(searchMST.toLowerCase()) &&
        (!fKy || r.ky === fKy) &&
        (!fTT || r.tt === fTT) &&
        (!selectedProvince || r.province === selectedProvince) &&
        (!selectedWard || r.ward === selectedWard),
    );
  }, [reports, searchTen, searchMST, fKy, fTT, selectedProvince, selectedWard]);

  const tonghopStats = useMemo(() => {
    const sum = (reps: AccidentReport[], key: keyof AccidentReport) =>
      reps.reduce((acc, r) => acc + (r[key] as number), 0);

    const toRow = (reps: AccidentReport[]) => ({
      coSoTongSo: reps.length,
      coSoThamGia: reps.filter((r) => r.soVu > 0).length,
      soLaoDong: sum(reps, "soLaoDong"),
      soLDCoBaoHiem: sum(reps, "soLDCoBaoHiem"),
      soNguoiBiNan: sum(reps, "soNguoiBiNan"),
      soNguoiBiChet: sum(reps, "soNguoiBiChet"),
      soNguoiBiThuongNang: sum(reps, "soNguoiBiThuongNang"),
      soVu: sum(reps, "soVu"),
      soVuCoNguoiChet: sum(reps, "soVuCoNguoiChet"),
      soVuCo2NguoiBiNan: sum(reps, "soVuCo2NguoiBiNan"),
      soLDNu: sum(reps, "soLDNu"),
      soNgayNghi: sum(reps, "soNgayNghi"),
      tongSoTien: sum(reps, "tongSoTien"),
      chiPhiYTe: sum(reps, "chiPhiYTe"),
      chiPhiTraLuong: sum(reps, "chiPhiTraLuong"),
      boiThuongTroCap: sum(reps, "boiThuongTroCap"),
      thiethaiTaiSan: sum(reps, "thiethaiTaiSan"),
    });

    // Phần II: cộng dồn phan_loai_rows của các báo cáo đã lọc theo từng mã hạng mục.
    const phanLoai: Record<string, number[]> = {};
    for (const r of filtered) {
      const map = r.phanLoaiRows ?? {};
      for (const [key, vals] of Object.entries(map)) {
        if (!Array.isArray(vals)) continue;
        if (!phanLoai[key]) phanLoai[key] = vals.map(() => 0);
        vals.forEach((v, i) => {
          phanLoai[key][i] = (phanLoai[key][i] ?? 0) + (Number(v) || 0);
        });
      }
    }

    const matchLoaiHinh = (reportLoaiHinh: string, categoryName: string): boolean => {
      if (!reportLoaiHinh) return false;
      const normReport = reportLoaiHinh.trim().toLowerCase();
      const normCategory = categoryName.trim().toLowerCase();
      if (normReport === normCategory) return true;
      if (normCategory === "công ty trách nhiệm hữu hạn") {
        return normReport === "công ty tnhh" || normReport === "công ty trách nhiệm hữu hạn";
      }
      if (normCategory === "đơn vị kinh tế tập thể") {
        return normReport === "hợp tác xã" || normReport === "đơn vị kinh tế tập thể";
      }
      if (normCategory === "đơn vị kinh tế cá thể") {
        return normReport === "hộ kinh doanh cá thể" || normReport === "hộ kinh doanh" || normReport === "đơn vị kinh tế cá thể";
      }
      return false;
    };

    return {
      total: toRow(filtered),
      byLoaiHinh: TONGHOP_I_ROWS.map((name) =>
        toRow(filtered.filter((r) => matchLoaiHinh(r.loaiHinh, name))),
      ),
      phanLoai,
    };
  }, [filtered]);

  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(currentPage, lastPage);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paged = filtered.slice(start, end);

  const allPageSelected =
    paged.length > 0 && paged.every((r) => selectedIds.has(r.id));
  const somePageSelected = paged.some((r) => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    const allIds = paged.map((r) => r.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) allIds.forEach((id) => next.delete(id));
      else allIds.forEach((id) => next.add(id));
      return next;
    });
  };

  return (
    <>
      {view === "list" ? (
        <>
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <h1 className="text-base font-semibold text-ink">
              Báo cáo định kỳ Tai nạn lao động
            </h1>
            <div className="flex items-center gap-2.5">
              <select
                className={
                  SELECT_TOP_CLASS.replace("min-w-[200px]", "min-w-[100px]") +
                  " h-[34px]"
                }
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ color: year === "" ? "transparent" : "inherit" }}
              >
                <option value="" className="text-ink bg-white">Bỏ chọn</option>
                {yearsList.map((y) => (
                  <option key={y} value={y} className="text-ink bg-white">
                    {y}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setView("tonghop")}
                className="h-9 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]"
              >
                Báo cáo tổng hợp
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-b border-[#e5e7eb] bg-white px-6 pt-5 pb-3">
            <SearchableSelect
              options={PROVINCES}
              value={selectedProvince}
              onChange={(value) => {
                setSelectedProvince(value);
                setSelectedWard("");
              }}
              label="Tỉnh/ thành phố"
              className="w-full"
            />
            <SearchableSelect
              options={WARDS_BY_PROVINCE[selectedProvince] ?? []}
              value={selectedWard}
              onChange={(value) => setSelectedWard(value)}
              disabled={!selectedProvince}
              label="Phường/ xã"
              className="w-full"
            />
          </div>

          <div className="px-6 py-5">
            <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    <th className="w-11 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5">
                      <TriCheckbox
                        checked={allPageSelected}
                        indeterminate={!allPageSelected && somePageSelected}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="w-16 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]" />
                    <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                      Tên doanh nghiệp
                    </th>
                    <th className="w-32 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                      Mã số thuế
                    </th>
                    <th className="w-32 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                      Kỳ báo cáo
                    </th>
                    <th className="w-24 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                      Năm
                    </th>
                    <th className="w-40 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                      Ngày cập nhật
                    </th>
                    <th className="w-40 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                      Ngày nộp
                    </th>
                    <th className="w-40 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                      Trạng thái
                    </th>
                  </tr>
                  <tr>
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                      <input
                        className={FILTER_INPUT_CLASS}
                        value={fTen}
                        onChange={(e) => {
                          setFTen(e.target.value);
                          if (e.target.value === "") {
                            setSearchTen("");
                            setCurrentPage(1);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setSearchTen(fTen);
                            setCurrentPage(1);
                          }
                        }}
                      />
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                      <input
                        className={FILTER_INPUT_CLASS}
                        value={fMST}
                        onChange={(e) => {
                          setFMST(e.target.value);
                          if (e.target.value === "") {
                            setSearchMST("");
                            setCurrentPage(1);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setSearchMST(fMST);
                            setCurrentPage(1);
                          }
                        }}
                      />
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                      <select
                        className={FILTER_SELECT_CLASS}
                        value={fKy}
                        onChange={(e) => {
                          setFKy(e.target.value);
                          setCurrentPage(1);
                        }}
                        style={{ color: fKy === "" ? "transparent" : "inherit" }}
                      >
                        <option value="" className="text-ink bg-white">Bỏ chọn</option>
                        <option className="text-ink bg-white">6 tháng</option>
                        <option className="text-ink bg-white">Cả năm</option>
                      </select>
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                    <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                      <select
                        className={FILTER_SELECT_CLASS}
                        value={fTT}
                        onChange={(e) => {
                          setFTT(e.target.value);
                          setCurrentPage(1);
                        }}
                        style={{ color: fTT === "" ? "transparent" : "inherit" }}
                      >
                        <option value="" className="text-ink bg-white">Bỏ chọn</option>
                        <option className="text-ink bg-white">Đang báo cáo</option>
                        <option className="text-ink bg-white">Đã nộp</option>
                        <option className="text-ink bg-white">Đã tiếp nhận</option>
                      </select>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-3.5 py-8 text-center text-[13.5px] text-muted"
                      >
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    paged.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]"
                      >
                        <td className="px-3.5 py-2.5">
                          <TriCheckbox
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleSelect(r.id)}
                          />
                        </td>
                        <td className="px-3.5 py-2.5">
                          <button
                            type="button"
                            onClick={() => setView("detail")}
                            title="Xem"
                            className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-3.5 py-2.5 text-[#374151]">
                          {r.ten}
                        </td>
                        <td className="px-3.5 py-2.5 text-[#374151]">
                          {r.mst}
                        </td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{r.ky}</td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{r.nam || "–"}</td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{formatTime(r.updatedAt)}</td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{formatTime(r.submittedAt)}</td>
                        <td className="px-3.5 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-[13px] text-[#374151]">
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${r.tt === "Đang báo cáo" ? "bg-[#d1d5db]" : r.tt === "Đã nộp" ? "bg-[#f59e0b]" : "bg-[#3b82f6]"}`}
                            />
                            {r.tt}
                          </span>
                        </td>
                      </tr>
                    ))
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
                    onClick={() =>
                      setCurrentPage((p) => Math.min(lastPage, p + 1))
                    }
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
        </>
      ) : null}

      {view === "detail" ? (
        <>
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <h1 className="text-base font-semibold text-ink">
              Báo cáo định kỳ Tai nạn lao động
            </h1>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setView("list")}
                className="flex h-9 items-center justify-center rounded-md border border-line px-4 text-[13.5px] font-medium text-[#374151] hover:bg-[#f9fafb] hover:text-ink"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={() => exportDetailDocx()}
                className="flex h-9 items-center gap-1.5 rounded-md border border-primary bg-white px-4 text-[13px] font-medium text-primary hover:bg-[#eff6ff]"
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
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Xuất báo cáo
              </button>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
              <div className="mb-1.5 text-[15px] font-bold text-ink">
                Báo cáo tổng hợp tình hình tai nạn lao động - Kỳ báo cáo: 6
                tháng năm 2023
              </div>
              <p className="mb-4 text-[13px] text-muted">
                **Vui lòng đính kèm báo cáo TNLĐ có dấu mộc công ty:{" "}
                <a href="#" className="text-primary">
                  baocaoTNLD.pdf
                </a>
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th
                        className={`${CT_TH} min-w-[220px] text-left`}
                        rowSpan={4}
                      >
                        Tên chỉ tiêu thống kê
                      </th>
                      <th className={`${CT_TH} w-[60px]`} rowSpan={4}>
                        Mã số
                      </th>
                      <th className={CT_TH} colSpan={11}>
                        Phân loại TNLĐ theo mức độ thương tật
                      </th>
                    </tr>
                    <tr>
                      <th className={CT_TH} colSpan={3}>
                        Số vụ (Vụ)
                      </th>
                      <th className={CT_TH} colSpan={8}>
                        Số người bị nạn (Người)
                      </th>
                    </tr>
                    <tr>
                      <th className={CT_TH} rowSpan={2}>
                        Tổng số
                      </th>
                      <th className={CT_TH} rowSpan={2}>
                        Số vụ có người chết
                      </th>
                      <th className={CT_TH} rowSpan={2}>
                        Số vụ có từ 2 người bị nạn trở lên
                      </th>
                      <th className={CT_TH} colSpan={2}>
                        Tổng số
                      </th>
                      <th className={CT_TH} colSpan={2}>
                        Số LĐ nữ
                      </th>
                      <th className={CT_TH} colSpan={2}>
                        Số người bị chết
                      </th>
                      <th className={CT_TH} colSpan={2}>
                        Số người bị thương nặng
                      </th>
                    </tr>
                    <tr>
                      <th className={CT_TH}>Tổng số</th>
                      <th className={CT_TH}>NN không thuộc quyền quản lý</th>
                      <th className={CT_TH}>Tổng số</th>
                      <th className={CT_TH}>NN không thuộc quyền quản lý</th>
                      <th className={CT_TH}>Tổng số</th>
                      <th className={CT_TH}>NN không thuộc quyền quản lý</th>
                      <th className={CT_TH}>Tổng số</th>
                      <th className={CT_TH}>NN không thuộc quyền quản lý</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DETAIL_REPORT_ROWS.map((row, idx) => {
                      if (row.kind === "sub") {
                        return (
                          <tr key={idx}>
                            <td
                              className={`${CT_TD} text-left ${row.bold ? "font-semibold" : "italic"}`}
                              colSpan={13}
                              style={{ paddingLeft: row.bold ? 20 : 32 }}
                            >
                              {row.label}
                            </td>
                          </tr>
                        );
                      }
                      const vals =
                        row.vals && row.vals.length
                          ? row.vals
                          : EMPTY_VALS.map(() => "");
                      if (row.kind === "section") {
                        return (
                          <tr key={idx} className="bg-[#f9fafb]">
                            <td className={`${CT_TD} text-left font-bold`}>
                              {row.label}
                            </td>
                            <td className={CT_TD} />
                            {vals.map((v, i) => (
                              <td key={i} className={`${CT_TD} font-bold`}>
                                {v}
                              </td>
                            ))}
                          </tr>
                        );
                      }
                      return (
                        <tr key={idx}>
                          <td className={`${CT_TD} text-left`}>{row.label}</td>
                          <td className={CT_TD}>{row.ma || ""}</td>
                          {vals.map((v, i) => (
                            <td key={i} className={CT_TD}>
                              {v}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mb-3 mt-5 text-[15px] font-bold text-ink">
                II. Thiệt hại do tai nạn lao động
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th
                        className={`${CT_TH} min-w-[300px] text-left`}
                        rowSpan={3}
                      >
                        Tổng số ngày nghỉ vì tai nạn lao động (kể cả ngày nghỉ
                        chế độ)
                      </th>
                      <th className={CT_TH} colSpan={4}>
                        Tổng số ngày nghỉ vì TNLĐ (1.000đ)
                      </th>
                      <th className={CT_TH} rowSpan={3}>
                        Thiệt hại tài sản (1.000đ)
                      </th>
                    </tr>
                    <tr>
                      <th className={CT_TH} rowSpan={2}>
                        Tổng số
                      </th>
                      <th className={CT_TH} colSpan={3}>
                        Khoảng chi cụ thể của cơ sở
                      </th>
                    </tr>
                    <tr>
                      <th className={CT_TH}>Y tế</th>
                      <th className={CT_TH}>
                        Trả lương trong thời gian điều trị
                      </th>
                      <th className={CT_TH}>Bồi thường trợ cấp</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={CT_TD}>20</td>
                      <td className={CT_TD}>6.000.000</td>
                      <td className={CT_TD}>2.000.000</td>
                      <td className={CT_TD}>2.000.000</td>
                      <td className={CT_TD}>2.000.000</td>
                      <td className={CT_TD}>20.000.000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {view === "tonghop" ? (
        <>
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <h1 className="text-base font-semibold text-ink">
              Báo cáo tổng hợp
            </h1>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setView("list")}
                className="flex h-9 items-center justify-center rounded-md border border-line px-4 text-[13.5px] font-medium text-[#374151] hover:bg-[#f9fafb] hover:text-ink"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={() => exportTonghopDocx(tonghopStats)}
                className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-[13px] text-[#374151] hover:bg-body"
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
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Xuất dữ liệu
              </button>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
              <div className="mb-4 text-[15px] font-bold text-ink">
                I. Thông tin tổng quan:
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th
                        className={`${CT_TH} min-w-[180px] text-left`}
                        rowSpan={3}
                      >
                        Loại hình cơ sở
                      </th>
                      <th className={`${CT_TH} w-[50px]`} rowSpan={3}>
                        Mã số
                      </th>
                      <th className={CT_TH} colSpan={2}>
                        Cơ sở
                      </th>
                      <th className={CT_TH} colSpan={2}>
                        Lực lượng lao động
                      </th>
                      <th className={CT_TH} colSpan={3}>
                        Tổng số tai nạn lao động
                      </th>
                      <th className={CT_TH} colSpan={2}>
                        Tần suất tai nạn lao động
                      </th>
                      <th className={`${CT_TH} min-w-[80px]`} rowSpan={3}>
                        Ghi chú
                      </th>
                    </tr>
                    <tr>
                      <th className={CT_TH} rowSpan={2}>
                        Tổng số
                      </th>
                      <th className={CT_TH} rowSpan={2}>
                        Số cơ sở tham gia
                      </th>
                      <th className={CT_TH} rowSpan={2}>
                        Tổng số lao động
                      </th>
                      <th className={CT_TH} rowSpan={2}>
                        Số lđ có tham gia bảo hiểm
                      </th>
                      <th className={CT_TH} colSpan={3}>
                        Số người bị TNLĐ
                      </th>
                      <th className={CT_TH} rowSpan={2}>
                        KTNLĐ
                      </th>
                      <th className={CT_TH} rowSpan={2}>
                        KCNN
                      </th>
                    </tr>
                    <tr>
                      <th className={CT_TH}>Tổng số</th>
                      <th className={CT_TH}>Số người bị chết</th>
                      <th className={CT_TH}>Số người bị thương nặng</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-[#f9fafb]">
                      <td className={`${CT_TD} text-left font-bold`}>
                        Tổng số
                      </td>
                      <td className={CT_TD} />
                      <td className={CT_TD}>{tonghopStats.total.coSoTongSo}</td>
                      <td className={CT_TD}>
                        {tonghopStats.total.coSoThamGia}
                      </td>
                      <td className={CT_TD}>{tonghopStats.total.soLaoDong}</td>
                      <td className={CT_TD}>
                        {tonghopStats.total.soLDCoBaoHiem}
                      </td>
                      <td className={CT_TD}>
                        {tonghopStats.total.soNguoiBiNan}
                      </td>
                      <td className={CT_TD}>
                        {tonghopStats.total.soNguoiBiChet}
                      </td>
                      <td className={CT_TD}>
                        {tonghopStats.total.soNguoiBiThuongNang}
                      </td>
                      <td className={CT_TD}>
                        {fmtRate(
                          tonghopStats.total.soNguoiBiNan,
                          tonghopStats.total.soLaoDong,
                        )}
                      </td>
                      <td className={CT_TD}>
                        {fmtRate(
                          tonghopStats.total.soNguoiBiChet,
                          tonghopStats.total.soLaoDong,
                        )}
                      </td>
                      <td className={CT_TD} />
                    </tr>
                    {TONGHOP_I_ROWS.map((name, i) => {
                      const row = tonghopStats.byLoaiHinh[i];
                      const hasData = row.coSoTongSo > 0;
                      return (
                        <tr key={name}>
                          <td
                            className={`${CT_TD} text-left`}
                            style={{ paddingLeft: 16 }}
                          >
                            {name}
                          </td>
                          <td className={CT_TD} />
                          <td className={CT_TD}>
                            {hasData ? row.coSoTongSo : ""}
                          </td>
                          <td className={CT_TD}>
                            {hasData ? row.coSoThamGia : ""}
                          </td>
                          <td className={CT_TD}>
                            {hasData ? row.soLaoDong : ""}
                          </td>
                          <td className={CT_TD}>
                            {hasData ? row.soLDCoBaoHiem : ""}
                          </td>
                          <td className={CT_TD}>
                            {hasData ? row.soNguoiBiNan : ""}
                          </td>
                          <td className={CT_TD}>
                            {hasData ? row.soNguoiBiChet : ""}
                          </td>
                          <td className={CT_TD}>
                            {hasData ? row.soNguoiBiThuongNang : ""}
                          </td>
                          <td className={CT_TD}>
                            {hasData
                              ? fmtRate(row.soNguoiBiNan, row.soLaoDong)
                              : ""}
                          </td>
                          <td className={CT_TD}>
                            {hasData
                              ? fmtRate(row.soNguoiBiChet, row.soLaoDong)
                              : ""}
                          </td>
                          <td className={CT_TD} />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
              <div className="mb-4 text-[15px] font-bold text-ink">
                II. Phân loại TNLĐ:
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th
                        className={`${CT_TH} min-w-[140px] text-left`}
                        rowSpan={3}
                      >
                        Tên chỉ tiêu thống kê
                      </th>
                      <th className={`${CT_TH} w-[50px]`} rowSpan={3}>
                        Mã số
                      </th>
                      <th className={CT_TH} colSpan={7}>
                        Phân loại TNLĐ theo mức độ thương tật
                      </th>
                      <th className={CT_TH} colSpan={6}>
                        Theo mức độ thương tật
                      </th>
                    </tr>
                    <tr>
                      <th className={CT_TH} colSpan={3}>
                        Số vụ TNLĐ
                      </th>
                      <th className={CT_TH} colSpan={4}>
                        Số người bị nạn (Người)
                      </th>
                      <th className={CT_TH} rowSpan={2}>
                        Tổng số ngày nghỉ vì TNLĐ
                      </th>
                      <th className={CT_TH} rowSpan={2}>
                        Tổng số tiền
                      </th>
                      <th className={CT_TH} colSpan={3}>
                        Tổng số ngày nghỉ vì TNLĐ
                      </th>
                      <th className={CT_TH} rowSpan={2}>
                        Thiệt hại tài sản (1.000 đ)
                      </th>
                    </tr>
                    <tr>
                      <th className={CT_TH}>Tổng số</th>
                      <th className={CT_TH}>Số vụ có người chết</th>
                      <th className={CT_TH}>
                        Số vụ có từ 2 người bị nạn trở lên
                      </th>
                      <th className={CT_TH}>Tổng số</th>
                      <th className={CT_TH}>Số LĐ nữ</th>
                      <th className={CT_TH}>Số người bị chết</th>
                      <th className={CT_TH}>Số người bị thương nặng</th>
                      <th className={CT_TH}>Y Tế</th>
                      <th className={CT_TH}>
                        Trả lương theo thời gian điều trị
                      </th>
                      <th className={CT_TH}>Bồi thường/ Trợ cấp</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-[#f9fafb]">
                      <td className={`${CT_TD} text-left font-bold`}>
                        Tổng số
                      </td>
                      <td className={CT_TD} />
                      <td className={CT_TD}>{tonghopStats.total.soVu}</td>
                      <td className={CT_TD}>
                        {tonghopStats.total.soVuCoNguoiChet}
                      </td>
                      <td className={CT_TD}>
                        {tonghopStats.total.soVuCo2NguoiBiNan}
                      </td>
                      <td className={CT_TD}>
                        {tonghopStats.total.soNguoiBiNan}
                      </td>
                      <td className={CT_TD}>{tonghopStats.total.soLDNu}</td>
                      <td className={CT_TD}>
                        {tonghopStats.total.soNguoiBiChet}
                      </td>
                      <td className={CT_TD}>
                        {tonghopStats.total.soNguoiBiThuongNang}
                      </td>
                      <td className={CT_TD}>{tonghopStats.total.soNgayNghi}</td>
                      <td className={CT_TD}>
                        {fmtMoney(tonghopStats.total.tongSoTien)}
                      </td>
                      <td className={CT_TD}>
                        {fmtMoney(tonghopStats.total.chiPhiYTe)}
                      </td>
                      <td className={CT_TD}>
                        {fmtMoney(tonghopStats.total.chiPhiTraLuong)}
                      </td>
                      <td className={CT_TD}>
                        {fmtMoney(tonghopStats.total.boiThuongTroCap)}
                      </td>
                      <td className={CT_TD}>
                        {fmtMoney(tonghopStats.total.thiethaiTaiSan)}
                      </td>
                    </tr>
                    {TONGHOP_II_GROUPS.map((group) => (
                      <Fragment key={group.category}>
                        <tr className="bg-[#f1f5f9]">
                          <td
                            className={`${CT_TD} text-left font-semibold`}
                            colSpan={15}
                          >
                            {group.category}
                          </td>
                        </tr>
                        {group.items.map((item) => (
                          <tr key={item.ma}>
                            <td
                              className={`${CT_TD} text-left`}
                              style={{ paddingLeft: 20 }}
                            >
                              {item.label}
                            </td>
                            <td className={CT_TD}>{item.ma}</td>
                            {(() => {
                              const rowVals = tonghopStats.phanLoai[item.ma];
                              const hasData = !!rowVals;
                              const displayVals = rowVals ?? Array.from({ length: 13 }, () => 0);
                              return displayVals.map((v, i) => (
                                <td key={i} className={CT_TD}>
                                  {hasData ? v : (v || "")}
                                </td>
                              ));
                            })()}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
