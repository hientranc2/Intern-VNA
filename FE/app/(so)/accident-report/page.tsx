"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Tooltip from "@mui/material/Tooltip";
import { TriCheckbox } from "@/libs/shared/core/components/TriCheckbox/TriCheckbox";
import { Modal } from "@/libs/shared/core/components/Modal/Modal";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import {
  DETAIL_REPORT_ROWS,
  EMPTY_VALS,
  TONGHOP_I_ROWS,
  TONGHOP_II_GROUPS,
  type AccidentReport,
} from "@/libs/tts/accident-report/accidentReportData";
import {
  getAccidentReportList,
  deleteAccidentReport,
  approveAccidentReports,
  rejectAccidentReports,
  getAccidentReportById,
} from "@/libs/tts/accident-report/accidentReportApi";
import { exportTonghopDocx } from "@/libs/tts/accident-report/exportTonghopDocx";
import { exportDetailDocx } from "@/libs/tts/accident-report/exportDetailDocx";
import { getBusinessById } from "@/libs/tts/enterprise/enterpriseApi";
import { getBusinessSectorList } from "@/libs/tts/business-sector/businessSectorApi";
import { PROVINCES, WARDS_BY_PROVINCE } from "@/libs/tts/location/locationData";
import { SearchableSelect } from "@/libs/shared/core/components/SearchableSelect/SearchableSelect";
import {
  getInjuryFactorList,
  getOccupationList,
} from "@/libs/tts/category/categoryApi";

const cleanName = (name: string): string => {
  return (name || "").replace(/^[–\-—\s\.\u2013\u2014]+/, "").trim();
};

const matchCategoryCode = (
  dbItems: { ten: string; ma: string }[],
  label: string,
  type: "sector" | "factor"
): string => {
  const cleanHard = (s: string) =>
    (s || "")
      .normalize("NFC")
      .toLowerCase()
      .replace(/^[–\-—\s\.\u2013\u2014]+/, "")
      .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, "")
      .trim();

  const cLabelHard = cleanHard(label);

  for (const item of dbItems) {
    const cTenHard = cleanHard(item.ten);
    if (cTenHard === cLabelHard || cTenHard.includes(cLabelHard) || cLabelHard.includes(cTenHard)) {
      return item.ma;
    }
  }

  const clean = (s: string) =>
    (s || "")
      .normalize("NFC")
      .toLowerCase()
      .trim();

  const cLabel = clean(label);

  if (type === "sector") {
    if (cLabel.includes("khai khoáng")) return "B";
    if (cLabel.includes("chế biến") || cLabel.includes("chế tạo")) return "C";
    if (cLabel.includes("điện") || cLabel.includes("khí đốt")) return "D";
    if (cLabel.includes("nước") || cLabel.includes("rác thải") || cLabel.includes("thoát nước")) return "E";
    if (cLabel.includes("xây dựng")) return "F";
    if (cLabel.includes("vận tải") || cLabel.includes("kho bãi")) return "H";
    if (cLabel.includes("nông nghiệp") || cLabel.includes("thủy sản")) return "A";
  } else if (type === "factor") {
    if (cLabel.includes("ngã")) {
      const found = dbItems.find((f) => clean(f.ten).includes("ngã"));
      if (found) return found.ma;
    }
    if (cLabel.includes("điện")) {
      const found = dbItems.find((f) => clean(f.ten).includes("điện"));
      if (found) return found.ma;
    }
    if (cLabel.includes("rơi") || cLabel.includes("bắn")) {
      const found = dbItems.find((f) => clean(f.ten).includes("rơi") || clean(f.ten).includes("bắn"));
      if (found) return found.ma;
    }
    if (cLabel.includes("máy") || cLabel.includes("thiết bị")) {
      const found = dbItems.find((f) => clean(f.ten).includes("máy") || clean(f.ten).includes("thiết bị"));
      if (found) return found.ma;
    }
  }

  return "";
};

type ViewMode = "list" | "detail" | "tonghop";

const FILTER_INPUT_CLASS =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] font-normal text-ink outline-none focus:border-[#3b82f6]";
const FILTER_SELECT_CLASS = `${FILTER_INPUT_CLASS} cursor-pointer appearance-none bg-white bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_8px_center] bg-no-repeat pr-6`;
const SELECT_TOP_CLASS =
  "h-9 min-w-[200px] cursor-pointer appearance-none rounded-md border border-line bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat px-3 pr-8 text-[13px] outline-none";

const CT_TH =
  "border border-line bg-[#f9fafb] px-2 py-3 text-center align-middle font-semibold text-[#374151]";
const CT_TD =
  "border border-line px-2 py-3 text-center align-middle text-[#374151]";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewMode>("list");
  const [reports, setReports] = useState<AccidentReport[]>([]);
  const [dbFactors, setDbFactors] = useState<{ ten: string; ma: string }[]>([]);
  const [dbOccupations, setDbOccupations] = useState<
    { ten: string; ma: string }[]
  >([]);
  const [dbSectors, setDbSectors] = useState<{ ten: string; ma: string; cap: number }[]>([]);

  useEffect(() => {
    getInjuryFactorList()
      .then((list) => {
        const items = list
          .filter((item) => item.active)
          .map((item) => ({
            ten: cleanName(item.ten),
            ma: item.ma,
          }));
        setDbFactors(items);
      })
      .catch((err) => console.error("Failed to load injury factors", err));

    getOccupationList()
      .then((list) => {
        const items = list.map((item) => ({
          ten: cleanName(item.ten),
          ma: item.ma,
        }));
        setDbOccupations(items);
      })
      .catch((err) => console.error("Failed to load occupations", err));

    getBusinessSectorList()
      .then((list) => {
        const items = list.map((item) => ({
          ten: cleanName(item.ten),
          ma: item.ma,
          cap: item.cap,
        }));
        setDbSectors(items);
      })
      .catch((err) => console.error("Failed to load business sectors", err));
  }, []);
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

  useEffect(() => {
    const reportIdParam = searchParams.get("reportId");
    if (!reportIdParam) return;

    const id = Number(reportIdParam);
    if (!Number.isFinite(id) || id <= 0) return;

    const existing = reports.find((report) => report.id === id);
    if (existing) {
      setViewingReport(existing);
      setView("detail");
      return;
    }

    getAccidentReportById(id)
      .then((fullReport) => {
        setViewingReport(fullReport);
        setView("detail");
      })
      .catch(() => {
        setToast({ message: "Không thể tải chi tiết báo cáo", variant: "error" });
      });
  }, [reports, searchParams]);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Report đang xem chi tiết + popup xem lý do từ chối.
  const [viewingReport, setViewingReport] = useState<AccidentReport | null>(
    null,
  );
  const [rejectViewOpen, setRejectViewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportDetail = async () => {
    if (!viewingReport) return;
    setExporting(true);
    try {
      let bizDetail = null;
      if (viewingReport.enterpriseId) {
        try {
          bizDetail = await getBusinessById(viewingReport.enterpriseId);
        } catch (err) {
          console.error("Failed to fetch business details", err);
        }
      }
      const dataToExport = {
        ...viewingReport,
        rows: viewingReport.rows || {},
        phanLoaiRows: viewingReport.phanLoaiRows || {},
        chiTietRows: viewingReport.chiTietRows || [],
      };
      await exportDetailDocx(dataToExport, bizDetail);
    } catch (e: any) {
      setToast({
        message: e.message || "In báo cáo thất bại",
        variant: "error",
      });
    } finally {
      setExporting(false);
    }
  };

  const deleteSelected = async () => {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => deleteAccidentReport(id)));
      setReports((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setToast({ message: `Đã xóa ${ids.length} báo cáo`, variant: "success" });
    } catch {
      setToast({
        message: "Xóa thất bại. Vui lòng thử lại.",
        variant: "error",
      });
    }
  };

  const approveSelected = async () => {
    const ids = [...selectedIds];
    try {
      await approveAccidentReports(ids);
      setToast({
        message: `Đã duyệt ${ids.length} báo cáo`,
        variant: "success",
      });
      setSelectedIds(new Set());
      // reload reports
      getAccidentReportList({ page: 1, pageSize: 1000, nam: year || undefined })
        .then((res) => setReports(res.data))
        .catch(() => {});
    } catch (e) {
      setToast({
        message: e instanceof Error ? e.message : "Duyệt báo cáo thất bại",
        variant: "error",
      });
    }
  };

  const confirmReject = async () => {
    const ids = [...selectedIds];
    try {
      await rejectAccidentReports(ids, rejectReason.trim() || "—");
      setToast({
        message: `Đã từ chối ${ids.length} báo cáo`,
        variant: "success",
      });
      setSelectedIds(new Set());
      setRejectReason("");
      setRejectOpen(false);
      // reload reports
      getAccidentReportList({ page: 1, pageSize: 1000, nam: year || undefined })
        .then((res) => setReports(res.data))
        .catch(() => {});
    } catch (e) {
      setToast({
        message: e instanceof Error ? e.message : "Từ chối báo cáo thất bại",
        variant: "error",
      });
    }
  };

  const [fTen, setFTen] = useState("");
  const [searchTen, setSearchTen] = useState("");
  const [fMST, setFMST] = useState("");
  const [searchMST, setSearchMST] = useState("");
  const [fKy, setFKy] = useState("");
  const [fTT, setFTT] = useState("");
  const [selectedProvince, setSelectedProvince] = useState(
    "Thành phố Hồ Chí Minh",
  );
  const [selectedWard, setSelectedWard] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const toggleSelect = (id: number) => {
    const report = reports.find((r) => r.id === id);
    if (!report || (report.tt !== "Đã nộp" && report.tt !== "Đã tiếp nhận")) return;
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

    const matchLoaiHinh = (
      reportLoaiHinh: string,
      categoryName: string,
    ): boolean => {
      if (!reportLoaiHinh) return false;
      const normReport = reportLoaiHinh.trim().toLowerCase();
      const normCategory = categoryName.trim().toLowerCase();
      if (normReport === normCategory) return true;
      if (normCategory === "công ty trách nhiệm hữu hạn") {
        return (
          normReport === "công ty tnhh" ||
          normReport === "công ty trách nhiệm hữu hạn"
        );
      }
      if (normCategory === "đơn vị kinh tế tập thể") {
        return (
          normReport === "hợp tác xã" || normReport === "đơn vị kinh tế tập thể"
        );
      }
      if (normCategory === "đơn vị kinh tế cá thể") {
        return (
          normReport === "hộ kinh doanh cá thể" ||
          normReport === "hộ kinh doanh" ||
          normReport === "đơn vị kinh tế cá thể"
        );
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

  // Tính các dòng chi tiết cho view xem báo cáo phía Sở.
  // Logic mirror với overviewRows của enterprise side.
  const soDetailRows = useMemo(() => {
    const r = viewingReport;
    if (!r) return DETAIL_REPORT_ROWS;
    const rows = r.rows ?? {};
    const phanLoai = r.phanLoaiRows ?? {};
    const details = r.chiTietRows ?? [];

    const get11 = (ma: string): number[] => {
      const raw = phanLoai[ma];
      if (!Array.isArray(raw)) return Array(11).fill(0);
      return [
        Number(raw[0] ?? 0),
        Number(raw[1] ?? 0),
        Number(raw[2] ?? 0),
        Number(raw[3] ?? 0),
        0,
        Number(raw[4] ?? 0),
        0,
        Number(raw[5] ?? 0),
        0,
        Number(raw[6] ?? 0),
        0,
      ];
    };

    const section1Vals = [
      r.soVu,
      r.soVuCoNguoiChet,
      r.soVuCo2NguoiBiNan,
      r.soNguoiBiNan,
      0,
      r.soLDNu,
      0,
      r.soNguoiBiChet,
      0,
      r.soNguoiBiThuongNang,
      0,
    ];

    const section2Vals = get11("10");
    const section3Vals = section1Vals.map((v, i) => v + section2Vals[i]);

    // 1. Get the list of factors and occupations dynamically from details (or savedOverviewRows keys)
    const activeFactors = new Set<string>();
    const activeOccupations = new Set<string>();

    details.forEach((d: any) => {
      if (d.yeuTo) activeFactors.add(cleanName(d.yeuTo));
      if (d.ngheNghiep) activeOccupations.add(cleanName(d.ngheNghiep));
    });

    // Also look at savedOverviewRows to preserve any loaded/saved rows that might not be in details currently
    Object.keys(phanLoai).forEach((key) => {
      if (key.startsWith("factor_")) {
        activeFactors.add(cleanName(key.replace("factor_", "")));
      }
      if (key.startsWith("occupation_")) {
        activeOccupations.add(cleanName(key.replace("occupation_", "")));
      }
    });

    // If both are empty (for example, no details and no saved rows), default to "Thiết bị nâng" and standard occupations
    if (activeFactors.size === 0 && activeOccupations.size === 0) {
      activeFactors.add("Thiết bị nâng");
      activeOccupations.add(
        "Nhà lãnh đạo cơ quan Đảng Cộng sản Việt nam cấp Trung ương",
      );
      activeOccupations.add("Công nhân");
    }

    // Build the dynamic rows array
    const dynamicRows: {
      kind: "normal" | "sub" | "section";
      label: string;
      ma: string;
      bold?: boolean;
    }[] = [];

    // Prefix: up to 1.1 Do người lao động
    dynamicRows.push(
      { kind: "section", label: "1. Tai nạn lao động", ma: "" },
      { kind: "normal", label: "Tai nạn lao động", ma: "1" },
      {
        kind: "sub",
        label: "1.1 Phân theo nguyên nhân xảy ra TNLĐ",
        ma: "",
        bold: true,
      },
      { kind: "sub", label: "a. Do người sử dụng lao động", ma: "" },
      {
        kind: "normal",
        label: "Không có thiết bị an toàn hoặc thiết bị không đảm bảo an toàn",
        ma: "1",
      },
      {
        kind: "normal",
        label:
          "Không có phương tiện bảo vệ cá nhân hoặc phương tiện bảo vệ cá nhân không tốt",
        ma: "2",
      },
      { kind: "normal", label: "Tổ chức lao động không hợp lý", ma: "3" },
      {
        kind: "normal",
        label:
          "Chưa huấn luyện hoặc huấn luyện an toàn vệ sinh lao động chưa đầy đủ",
        ma: "4",
      },
      {
        kind: "normal",
        label: "Không có quy trình an toàn hoặc biện pháp làm việc an toàn",
        ma: "5",
      },
      { kind: "normal", label: "Điều kiện làm việc không tốt", ma: "6" },
      { kind: "sub", label: "b. Do người lao động", ma: "" },
      {
        kind: "normal",
        label:
          "Quy phạm nội quy, quy trình, quy chuẩn, biện pháp làm việc an toàn",
        ma: "7",
      },
      {
        kind: "normal",
        label: "Không sử dụng phương tiện bảo vệ cá nhân",
        ma: "8",
      },
      {
        kind: "normal",
        label: "Khách quan khó tránh/ Nguyên nhân chưa kể đến",
        ma: "9",
      },
    );

    // 1.2 Phân theo yếu tố gây chấn thương
    dynamicRows.push({
      kind: "sub",
      label: "1.2. Phân theo yếu tố gây chấn thương",
      ma: "",
      bold: true,
    });
    Array.from(activeFactors).forEach((factor) => {
      dynamicRows.push({
        kind: "normal",
        label: factor,
        ma: `factor_${factor}`,
      });
    });

    // 1.3 Phân theo nghề nghiệp
    dynamicRows.push({
      kind: "sub",
      label: "1.3 Phân theo nghề nghiệp",
      ma: "",
      bold: true,
    });
    Array.from(activeOccupations).forEach((occ) => {
      dynamicRows.push({ kind: "normal", label: occ, ma: `occupation_${occ}` });
    });

    // 2 & 3 Sections
    dynamicRows.push(
      {
        kind: "section",
        label:
          "2. Tai nạn được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ",
        ma: "",
      },
      {
        kind: "normal",
        label:
          "Tai nạn được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ",
        ma: "10",
      },
      { kind: "section", label: "3. Tổng số", ma: "" },
      { kind: "normal", label: "Tổng số (3=1+2)", ma: "total" },
    );

    return dynamicRows.map((row) => {
      if (row.kind !== "normal" && row.kind !== "section") {
        return row;
      }

      let vals = Array(11).fill(0);
      const ma = row.ma;

      if (row.label === "Tai nạn lao động" && ma === "1") {
        vals = section1Vals;
      } else if (row.label === "Tổng số (3=1+2)" && ma === "total") {
        vals = section3Vals;
      } else if (ma === "10") {
        vals = section2Vals;
      } else if (ma) {
        vals = get11(ma);
      }

      let displayMa = row.ma;
      if (row.ma === "total") {
        displayMa = "";
      } else if (row.ma.startsWith("factor_")) {
        const factorName = row.ma.replace("factor_", "");
        const found = dbFactors.find((f) => f.ten === factorName);
        displayMa = found ? found.ma : "";
      } else if (row.ma.startsWith("occupation_")) {
        const occName = row.ma.replace("occupation_", "");
        const found = dbOccupations.find((o) => o.ten === occName);
        displayMa = found ? found.ma : "";
      }

      return {
        ...row,
        ma: displayMa,
        vals,
      };
    });
  }, [viewingReport, dbFactors, dbOccupations]);

  const dynamicThiethai = useMemo(() => {
    if (!viewingReport) return null;
    const details = viewingReport.chiTietRows || [];

    let s1NgayNghi = 0;
    let s1YTe = 0;
    let s1Luong = 0;
    let s1BTTC = 0;
    let s1ThiHai = 0;

    if (details.length > 0) {
      details.forEach((d: any) => {
        const getVal = (v: any) => {
          if (typeof v === "number") return v;
          const clean = String(v || "0")
            .trim()
            .replace(/\./g, "")
            .replace(/,/g, ".");
          return parseFloat(clean) || 0;
        };
        s1YTe += getVal(d.chiPhiYTe);
        s1Luong += getVal(d.chiPhiLuong);
        s1BTTC += getVal(d.chiPhiBTTC);
        s1NgayNghi += getVal(d.soNgayNghi);
        s1ThiHai += getVal(d.thiethaiTaiSan);
      });
    } else {
      s1NgayNghi = Number(viewingReport.soNgayNghi) || 0;
      s1YTe = Number(viewingReport.chiPhiYTe) || 0;
      s1Luong = Number(viewingReport.chiPhiTraLuong) || 0;
      s1BTTC = Number(viewingReport.boiThuongTroCap) || 0;
      s1ThiHai = Number(viewingReport.thiethaiTaiSan) || 0;
    }

    const s1TongChiPhi = s1YTe + s1Luong + s1BTTC;

    const tcRow = viewingReport.rows?.["10"];
    const hasTc = Array.isArray(tcRow) && tcRow.length >= 17;

    const s2NgayNghi = hasTc ? (Number(tcRow[11]) || 0) : 0;
    const s2TongChiPhi = hasTc ? (Number(tcRow[12]) || 0) : 0;
    const s2YTe = hasTc ? (Number(tcRow[13]) || 0) : 0;
    const s2Luong = hasTc ? (Number(tcRow[14]) || 0) : 0;
    const s2BTTC = hasTc ? (Number(tcRow[15]) || 0) : 0;
    const s2ThiHai = hasTc ? (Number(tcRow[16]) || 0) : 0;

    return {
      soNgayNghi: s1NgayNghi + s2NgayNghi,
      tongSoTien: s1TongChiPhi + s2TongChiPhi,
      chiPhiYTe: s1YTe + s2YTe,
      chiPhiTraLuong: s1Luong + s2Luong,
      boiThuongTroCap: s1BTTC + s2BTTC,
      thiethaiTaiSan: s1ThiHai + s2ThiHai,
    };
  }, [viewingReport]);

  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(currentPage, lastPage);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paged = filtered.slice(start, end);

  const enabledPaged = useMemo(() => {
    return paged.filter((r) => r.tt === "Đã nộp" || r.tt === "Đã tiếp nhận");
  }, [paged]);

  const allPageSelected =
    enabledPaged.length > 0 && enabledPaged.every((r) => selectedIds.has(r.id));
  const somePageSelected = enabledPaged.some((r) => selectedIds.has(r.id));

  // Các báo cáo đang được chọn — dùng để validate trạng thái trước khi duyệt/từ chối.
  const selectedReports = useMemo(
    () => reports.filter((r) => selectedIds.has(r.id)),
    [reports, selectedIds],
  );

  // Nháp ("Đang báo cáo") chưa nộp → không cho duyệt.
  // "Đã tiếp nhận" = đã duyệt rồi → không cho duyệt lại.
  const disableApprove = selectedReports.some((r) => r.tt !== "Đã nộp");

  const toggleSelectAll = () => {
    const enabledIds = enabledPaged.map((r) => r.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) enabledIds.forEach((id) => next.delete(id));
      else enabledIds.forEach((id) => next.add(id));
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
                <option value="" className="text-ink bg-white">
                  Bỏ chọn
                </option>
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
                        onChange={toggleSelectAll}
                        disabled={enabledPaged.length === 0}
                      />
                    </th>
                    <th className="w-16 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]" />
                    <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                      Tên doanh nghiệp
                    </th>
                    <th className="w-40 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151] whitespace-nowrap">
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
                        style={{
                          color: fKy === "" ? "transparent" : "inherit",
                        }}
                      >
                        <option value="" className="text-ink bg-white">
                          Bỏ chọn
                        </option>
                        <option className="text-ink bg-white">6 tháng</option>
                        <option className="text-ink bg-white">Cả năm</option>
                      </select>
                    </th>
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
                        style={{
                          color: fTT === "" ? "transparent" : "inherit",
                        }}
                      >
                        <option value="" className="text-ink bg-white">
                          Bỏ chọn
                        </option>
                        <option className="text-ink bg-white">
                          Đang báo cáo
                        </option>
                        <option className="text-ink bg-white">Đã nộp</option>
                        <option className="text-ink bg-white">
                          Đã tiếp nhận
                        </option>
                        <option className="text-ink bg-white">Từ chối</option>
                      </select>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
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
                            disabled={r.tt !== "Đã nộp" && r.tt !== "Đã tiếp nhận"}
                          />
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const fullReport =
                                    await getAccidentReportById(r.id);
                                  setViewingReport(fullReport);
                                  setView("detail");
                                } catch (err) {
                                  console.error(
                                    "Failed to load report detail",
                                    err,
                                  );
                                  setToast({
                                    message: "Không thể tải chi tiết báo cáo",
                                    variant: "error",
                                  });
                                }
                              }}
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
                            <button
                              type="button"
                              onClick={() => {
                                setViewingReport(r);
                                setRejectViewOpen(true);
                              }}
                              title="Lịch sử xử lý"
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
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-[#374151]">
                          {r.ten}
                        </td>
                        <td className="px-3.5 py-2.5 text-[#374151] whitespace-nowrap">
                          {r.mst}
                        </td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{r.ky}</td>
                        <td className="px-3.5 py-2.5 text-[#374151]">
                          {r.nam || "–"}
                        </td>
                        <td className="px-3.5 py-2.5 text-[#374151]">
                          {formatTime(r.updatedAt)}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-[13px] text-[#374151]">
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${r.tt === "Đang báo cáo" ? "bg-[#d1d5db]" : r.tt === "Đã nộp" ? "bg-[#f59e0b]" : r.tt === "Từ chối" ? "bg-[#ef4444]" : "bg-[#3b82f6]"}`}
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
                onClick={() => {
                  setView("list");
                  setViewingReport(null);
                }}
                className="flex h-9 items-center justify-center rounded-md border border-line px-4 text-[13.5px] font-medium text-[#374151] hover:bg-[#f9fafb] hover:text-ink"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={handleExportDetail}
                disabled={exporting}
                className="flex h-9 items-center gap-1.5 rounded-md border border-primary bg-white px-4 text-[13px] font-medium text-primary hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-60"
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
                In báo cáo
              </button>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
              <div className="mb-1.5 text-[15px] font-bold text-ink">
                Báo cáo tổng hợp tình hình tai nạn lao động - Kỳ báo cáo:{" "}
                {viewingReport?.ky || "6 tháng"} năm{" "}
                {viewingReport?.nam || "2023"}
              </div>
              <p className="mb-4 text-[13px] text-muted">
                **Vui lòng đính kèm báo cáo TNLĐ có dấu mộc công ty:{" "}
                {viewingReport?.fileUrl ? (
                  <a
                    href={viewingReport.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-medium hover:underline"
                  >
                    {viewingReport.fileUrl
                      .split("/")
                      .pop()
                      ?.replace(/^[^-]+-[^-]+-/, "") || "baocaoTNLD.pdf"}
                  </a>
                ) : (
                  <span className="text-gray-400 italic">(chưa có)</span>
                )}
              </p>
              {viewingReport?.tt === "Từ chối" && (
                <p className="mb-4 text-[13px] text-muted">
                  Lý do từ chối báo cáo:{" "}
                  <button
                    type="button"
                    onClick={() => setRejectViewOpen(true)}
                    className="text-primary hover:underline"
                  >
                    Xem
                  </button>
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th
                        className={`${CT_TH} min-w-[220px] text-left`}
                        style={{ width: "30%" }}
                        rowSpan={4}
                      >
                        Tên chỉ tiêu thống kê
                      </th>
                      <th className={`${CT_TH} w-[60px]`} style={{ width: "5%" }} rowSpan={4}>
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
                      <th className={CT_TH} rowSpan={2} style={{ width: "6%", minWidth: 45 }}>
                        Tổng số
                      </th>
                      <th className={CT_TH} rowSpan={2} style={{ width: "6%", minWidth: 45 }}>
                        Số vụ có người chết
                      </th>
                      <th className={CT_TH} rowSpan={2} style={{ width: "6%", minWidth: 45 }}>
                        Số vụ ≥ 2 người bị nạn
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
                      <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>Tổng số</th>
                      <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>NN không thuộc quyền quản lý</th>
                      <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>Tổng số</th>
                      <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>NN không thuộc quyền quản lý</th>
                      <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>Tổng số</th>
                      <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>NN không thuộc quyền quản lý</th>
                      <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>Tổng số</th>
                      <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>NN không thuộc quyền quản lý</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soDetailRows.map((row: any, idx) => {
                      if (row.kind === "sub") {
                        return (
                          <tr key={idx}>
                            <td
                              className={`${CT_TD} text-left ${row.bold ? "font-semibold" : "italic"}`}
                              colSpan={13}
                            >
                              {row.label}
                            </td>
                          </tr>
                        );
                      }
                      const vals = (row.vals ?? []) as number[];
                      if (row.kind === "section") {
                        return (
                          <tr key={idx} className="bg-[#f9fafb]">
                            <td
                              className={`${CT_TD} text-left font-bold`}
                              colSpan={13}
                            >
                              {row.label}
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={idx}>
                          <td className={`${CT_TD} text-left`}>{row.label}</td>
                          <td className={CT_TD}>{row.ma || ""}</td>
                          {(vals as number[]).map((v, i) => (
                            <td key={i} className={CT_TD}>
                              {v ?? 0}
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
                      <td className={CT_TD}>
                        {dynamicThiethai ? dynamicThiethai.soNgayNghi : "—"}
                      </td>
                      <td className={CT_TD}>
                        {dynamicThiethai
                          ? fmtMoney(dynamicThiethai.tongSoTien)
                          : "—"}
                      </td>
                      <td className={CT_TD}>
                        {dynamicThiethai
                          ? fmtMoney(dynamicThiethai.chiPhiYTe)
                          : "—"}
                      </td>
                      <td className={CT_TD}>
                        {dynamicThiethai
                          ? fmtMoney(dynamicThiethai.chiPhiTraLuong)
                          : "—"}
                      </td>
                      <td className={CT_TD}>
                        {dynamicThiethai
                          ? fmtMoney(dynamicThiethai.boiThuongTroCap)
                          : "—"}
                      </td>
                      <td className={CT_TD}>
                        {dynamicThiethai
                          ? fmtMoney(dynamicThiethai.thiethaiTaiSan)
                          : "—"}
                      </td>
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
                      return (
                        <tr key={name}>
                          <td
                            className={`${CT_TD} text-left`}
                            style={{ paddingLeft: 16 }}
                          >
                            {name}
                          </td>
                          <td className={CT_TD} />
                          <td className={CT_TD}>{row.coSoTongSo}</td>
                          <td className={CT_TD}>{row.coSoThamGia}</td>
                          <td className={CT_TD}>{row.soLaoDong}</td>
                          <td className={CT_TD}>{row.soLDCoBaoHiem}</td>
                          <td className={CT_TD}>{row.soNguoiBiNan}</td>
                          <td className={CT_TD}>{row.soNguoiBiChet}</td>
                          <td className={CT_TD}>{row.soNguoiBiThuongNang}</td>
                          <td className={CT_TD}>
                            {fmtRate(row.soNguoiBiNan, row.soLaoDong)}
                          </td>
                          <td className={CT_TD}>
                            {fmtRate(row.soNguoiBiChet, row.soLaoDong)}
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
                        className={`${CT_TH} min-w-[95px] max-w-[95px] text-left`}
                        rowSpan={3}
                      >
                        Phân loại
                      </th>
                      <th className={`${CT_TH} w-[50px]`} rowSpan={3}>
                        mã số
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
                      <th className={CT_TH} rowSpan={2} style={{ width: 45, minWidth: 45 }}>
                        Tổng số ngày nghỉ vì TNLĐ
                      </th>
                      <th className={CT_TH} rowSpan={2} style={{ width: 85, minWidth: 85 }}>
                        Tổng số tiền
                      </th>
                      <th className={CT_TH} colSpan={3}>
                        Tổng số ngày nghỉ vì TNLĐ
                      </th>
                      <th className={CT_TH} rowSpan={2} style={{ width: 85, minWidth: 85 }}>
                        Thiệt hại tài sản (1.000 đ)
                      </th>
                    </tr>
                    <tr>
                      <th className={CT_TH} style={{ width: 45, minWidth: 45 }}>Tổng số</th>
                      <th className={CT_TH} style={{ width: 45, minWidth: 45 }}>Số vụ có người chết</th>
                      <th className={CT_TH} style={{ width: 45, minWidth: 45 }}>
                        Số vụ ≥ 2 người bị nạn
                      </th>
                      <th className={CT_TH} style={{ width: 45, minWidth: 45 }}>Tổng số</th>
                      <th className={CT_TH} style={{ width: 45, minWidth: 45 }}>Số LĐ nữ</th>
                      <th className={CT_TH} style={{ width: 45, minWidth: 45 }}>Số người bị chết</th>
                      <th className={CT_TH} style={{ width: 45, minWidth: 45 }}>Số người bị thương nặng</th>
                      <th className={CT_TH} style={{ width: 85, minWidth: 85 }}>Y tế</th>
                      <th className={CT_TH} style={{ width: 85, minWidth: 85 }}>
                        Trả lương theo thời gian điều trị
                      </th>
                      <th className={CT_TH} style={{ width: 85, minWidth: 85 }}>Bồi thường/ Trợ cấp</th>
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
                    {TONGHOP_II_GROUPS.map((group) => {
                      const formatSectorName = (name: string): string => {
                        if (!name) return "";
                        const cleaned = name.trim();
                        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
                      };

                      const items =
                        group.category === "Phân theo ngành nghề"
                          ? dbSectors
                              .filter((s) => s.cap === 1)
                              .sort((a, b) => a.ma.localeCompare(b.ma, undefined, { numeric: true }))
                              .map((s) => ({ label: formatSectorName(s.ten), ma: s.ma }))
                          : group.category === "Phân theo yếu tố gây chấn thương"
                            ? dbFactors
                                .sort((a, b) => a.ma.localeCompare(b.ma, undefined, { numeric: true }))
                                .map((f) => ({ label: f.ten, ma: f.ma }))
                            : group.items;

                      return items.map((item, index) => {
                        let displayMa = item.ma;

                        const rowVals = tonghopStats.phanLoai[item.ma];
                        const displayVals =
                          rowVals ?? Array.from({ length: 13 }, () => 0);
                        
                        const dynamicVals = [...displayVals].map(Number);
                        dynamicVals[8] = (dynamicVals[9] || 0) + (dynamicVals[10] || 0) + (dynamicVals[11] || 0);

                        return (
                          <tr key={`${group.category}_${item.ma}`}>
                            {index === 0 && (
                              <td
                                className="border border-[#e5e7eb] p-2 text-center font-bold text-[#374151] align-middle bg-white"
                                style={{
                                  verticalAlign: "middle",
                                  width: 95,
                                  minWidth: 95,
                                  maxWidth: 95,
                                }}
                                rowSpan={items.length}
                              >
                                {group.category}
                              </td>
                            )}
                            <td className={`${CT_TD} cursor-pointer hover:bg-slate-100`}>
                              <Tooltip title={item.label} arrow placement="top">
                                <span className="block w-full h-full">{displayMa}</span>
                              </Tooltip>
                            </td>
                            {dynamicVals.map((v, i) => (
                              <td key={i} className={CT_TD}>
                                {i >= 8 ? fmtMoney(v) : v}
                              </td>
                            ))}
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Thanh thao tác duyệt/từ chối báo cáo */}
      {selectedIds.size > 0 ? (
        <div className="fixed bottom-6 left-1/2 z-300 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
          <span className="flex h-6 min-w-6 items-center justify-center rounded bg-primary px-1.5 text-[12px] font-semibold text-white">
            {selectedIds.size}
          </span>
          <span className="text-[13px] text-[#374151]">dữ liệu được chọn</span>
          {selectedIds.size > 1 ? (
            <button
              type="button"
              onClick={() => {
                const ids = Array.from(selectedIds).join(",");
                router.push(`/accident-report/review?ids=${ids}`);
              }}
              className="flex h-8 items-center gap-1.5 rounded-md border border-primary bg-white px-3.5 text-[12.5px] font-semibold text-primary hover:bg-[#eff6ff]"
            >
              Xem chọn nhiều
            </button>
          ) : null}
          <button
            type="button"
            onClick={approveSelected}
            disabled={disableApprove}
            className="flex h-8 items-center gap-1.5 rounded-md bg-success px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-success"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Duyệt báo cáo
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            aria-label="Bỏ chọn"
            className="rounded p-1 text-muted hover:bg-body hover:text-ink"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : null}

      {/* Modal nhập lý do từ chối */}
      <Modal
        open={rejectOpen}
        title="Từ chối báo cáo"
        onClose={() => setRejectOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRejectOpen(false)}
              className="h-9.5 rounded-md px-5 text-sm font-medium text-muted hover:bg-[#f9fafb] hover:text-[#374151]"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={confirmReject}
              className="h-9.5 rounded-md bg-danger px-6 text-sm font-semibold text-white hover:bg-[#dc2626]"
            >
              Xác nhận từ chối
            </button>
          </div>
        }
      >
        <label className="mb-1.5 block text-[12.5px] text-[#374151]">
          Lý do từ chối <span className="text-danger">*</span>
        </label>
        <textarea
          className="min-h-22.5 w-full rounded-md border border-line px-3 py-2 text-[13px] text-ink outline-none focus:border-[#3b82f6] resize-none"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Nhập lý do từ chối báo cáo..."
        />
      </Modal>

      {/* Modal xem lịch sử xử lý (trong view chi tiết) */}
      <Modal
        open={rejectViewOpen}
        title="Lịch sử xử lý báo cáo"
        onClose={() => setRejectViewOpen(false)}
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setRejectViewOpen(false)}
              className="h-9.5 rounded-md bg-primary px-6 text-sm font-semibold text-white hover:bg-[#1e40af]"
            >
              Đã hiểu
            </button>
          </div>
        }
      >
        <div className="relative bg-white min-h-[100px] py-2">
          {(() => {
            const events: {
              time: string | null | undefined;
              actor: string;
              action: string;
              isRed?: boolean;
              isGreen?: boolean;
            }[] = [];

            if (viewingReport?.rejectedAt) {
              events.push({
                time: viewingReport.rejectedAt,
                actor: viewingReport.rejectedBy ?? "Cơ quan quản lý",
                action: `đã từ chối báo cáo${
                  viewingReport.rejectionReason
                    ? ` — Lý do: ${viewingReport.rejectionReason}`
                    : ""
                }`,
                isRed: true,
              });
            }

            if (viewingReport?.acceptedAt) {
              events.push({
                time: viewingReport.acceptedAt,
                actor: viewingReport.acceptedBy ?? "Cơ quan quản lý",
                action: "đã tiếp nhận báo cáo",
                isGreen: true,
              });
            }

            if (viewingReport?.submittedAt) {
              events.push({
                time: viewingReport.submittedAt,
                actor: viewingReport.ten,
                action: "đã gửi báo cáo",
              });
            }

            if (viewingReport?.createdAt) {
              events.push({
                time: viewingReport.createdAt,
                actor: viewingReport.ten,
                action: "đã tạo bản nháp báo cáo",
              });
            }

            if (events.length === 0) {
              return (
                <div className="text-center text-[#6b7280] py-4">
                  Chưa có lịch sử xử lý
                </div>
              );
            }

            return (
              <div className="relative">
                {/* Vertical connector line */}
                <div className="absolute left-[6px] top-[10px] bottom-[10px] w-[1.5px] bg-[#e2e8f0]" />

                <div className="space-y-6">
                  {events.map((ev, idx) => (
                    <div key={idx} className="relative pl-7 text-[13.5px]">
                      {/* Timeline circle node */}
                      <div
                        className={`absolute left-0 top-[4px] h-3.5 w-3.5 rounded-full border-2 bg-white z-10 ${
                          ev.isRed
                            ? "border-[#ef4444]"
                            : ev.isGreen
                              ? "border-[#22c55e]"
                              : "border-[#cbd5e1]"
                        }`}
                      />

                      <div className="text-[#6b7280] text-[12.5px] mb-1">
                        {formatTime(ev.time)}
                      </div>
                      <div className="text-ink">
                        <span className="font-bold text-[#1f2937]">
                          {ev.actor}
                        </span>{" "}
                        <span className="text-[#4b5563]">{ev.action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDone={() => setToast(null)}
        />
      )}
    </>
  );
}
