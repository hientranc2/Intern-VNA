"use client";

import { Fragment, useEffect, useMemo, useState, useRef } from "react";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { localISODate } from "@/libs/shared/core/utils/dateUtils";
import { DateInput } from "@/libs/shared/core/components/DateInput/DateInput";
import { Modal } from "@/libs/shared/core/components/Modal/Modal";
import {
  getDnReportList,
  getDnReportById,
  submitDnReport,
  updateDnReport,
  uploadReportFile,
  type ReportTongHop,
} from "@/libs/tts/accident-report/enterpriseReportApi";
import {
  getInjuryFactorList,
  getOccupationList,
} from "@/libs/tts/category/categoryApi";
import { getReportConfigList } from "@/libs/tts/report-config/reportConfigApi";
import type { ReportConfig } from "@/libs/tts/report-config/reportConfigData";
import {
  TONGHOP_II_GROUPS,
  PHAN_LOAI_COLS,
  DETAIL_REPORT_ROWS,
  EMPTY_VALS,
} from "@/libs/tts/accident-report/accidentReportData";
import { exportDetailDocx } from "@/libs/tts/accident-report/exportDetailDocx";
import { getBusinessId } from "@/libs/tts/auth/authApi";
import {
  getBusinessById,
  type BusinessDetail,
} from "@/libs/tts/enterprise/enterpriseApi";

type PageView = "list" | "form";
type FormSection = "ttct" | "tnld" | "tnld_tc" | "phanloai" | "tongquan";
type SubTab = "tongSo" | "chiTiet";

type ReportRecord = {
  id: number;
  ten: string;
  mst: string;
  ky: string;
  nam: string | null;
  tt: "Đang báo cáo" | "Đã nộp" | "Từ chối" | "Đã tiếp nhận";
  configId: number;
  submittedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  acceptedAt?: string | null;
  acceptedBy?: string | null;
};

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

type AccidentDetail = {
  id: number;
  hoTen?: string;
  ngaySinh?: string;
  gioiTinh?: string;
  ngheNghiep: string;
  loaiHopDong?: string;
  mucDo?: string;
  ngayXayRa?: string;
  diaDiem?: string;
  yeuTo: string;

  // New fields
  nguyenNhan: string;
  soVu: string;
  soVuCoNguoiChet: string;
  soVuCo2NguoiBiNan: string;
  soNguoiBiNan: string;
  soLDNu: string;
  soNguoiBiChet: string;
  soNguoiBiThuongNang: string;
  nanKhongQL: string;
  nuKhongQL: string;
  chetKhongQL: string;
  thuongKhongQL: string;
  chiPhiYTe: string;
  chiPhiLuong: string;
  chiPhiBTTC: string;
  tongSoTien: string;
  soNgayNghi: string;
  thiethaiTaiSan: string;
};

const SECTION_OPTIONS: { value: FormSection; label: string }[] = [
  { value: "ttct", label: "Thông tin doanh nghiệp" },
  { value: "tnld", label: "1. Tai nạn lao động" },
  {
    value: "tnld_tc",
    label:
      "2. Tai nạn lao động được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ",
  },
  { value: "tongquan", label: "Xem tổng quan báo cáo tai nạn lao động" },
];

// Danh sách mã hạng mục phần II (1..24) và state rỗng cho lưới nhập phân loại.
const PHAN_LOAI_MAS = TONGHOP_II_GROUPS.flatMap((g) =>
  g.items.map((i) => i.ma),
);
const emptyPhanLoai = (): Record<string, string[]> =>
  Object.fromEntries(
    PHAN_LOAI_MAS.map((ma) => [ma, Array(PHAN_LOAI_COLS.length).fill("0")]),
  );

// Bỏ ký tự phân tách nghìn ("10.000.000" -> 10000000), trả về số nguyên không âm.
const parseNum = (s: string): number =>
  Number(String(s).replace(/[^\d]/g, "")) || 0;

const formatNumberString = (val: string): string => {
  const clean = val.replace(/[^\d]/g, "");
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const normalizeDetail = (d: any): AccidentDetail => {
  return {
    id: d.id,
    hoTen: d.hoTen || "",
    ngaySinh: d.ngaySinh || "",
    gioiTinh: d.gioiTinh || "Nam",
    ngheNghiep: d.ngheNghiep || "Công nhân",
    loaiHopDong: d.loaiHopDong || "Hợp đồng xác định thời hạn",
    mucDo: d.mucDo || "Thương nhẹ",
    ngayXayRa: d.ngayXayRa || "",
    diaDiem: d.diaDiem || "",

    nguyenNhan:
      d.nguyenNhan ||
      "Không có thiết bị an toàn hoặc thiết bị không đảm bảo an toàn",
    yeuTo: d.yeuTo || "Thiết bị nâng",
    soVu: String(d.soVu !== undefined ? d.soVu : "1"),
    soVuCoNguoiChet: String(
      d.soVuCoNguoiChet !== undefined
        ? d.soVuCoNguoiChet
        : d.mucDo === "Chết"
          ? "1"
          : "0",
    ),
    soVuCo2NguoiBiNan: String(
      d.soVuCo2NguoiBiNan !== undefined ? d.soVuCo2NguoiBiNan : "0",
    ),
    soNguoiBiNan: String(d.soNguoiBiNan !== undefined ? d.soNguoiBiNan : "1"),
    soLDNu: String(
      d.soLDNu !== undefined ? d.soLDNu : d.gioiTinh === "Nữ" ? "1" : "0",
    ),
    soNguoiBiChet: String(
      d.soNguoiBiChet !== undefined
        ? d.soNguoiBiChet
        : d.mucDo === "Chết"
          ? "1"
          : "0",
    ),
    soNguoiBiThuongNang: String(
      d.soNguoiBiThuongNang !== undefined
        ? d.soNguoiBiThuongNang
        : d.mucDo === "Thương nặng"
          ? "1"
          : "0",
    ),
    nanKhongQL: String(d.nanKhongQL !== undefined ? d.nanKhongQL : "0"),
    nuKhongQL: String(d.nuKhongQL !== undefined ? d.nuKhongQL : "0"),
    chetKhongQL: String(d.chetKhongQL !== undefined ? d.chetKhongQL : "0"),
    thuongKhongQL: String(
      d.thuongKhongQL !== undefined ? d.thuongKhongQL : "0",
    ),
    chiPhiYTe: String(d.chiPhiYTe !== undefined ? d.chiPhiYTe : "0").replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ".",
    ),
    chiPhiLuong: String(
      d.chiPhiLuong !== undefined ? d.chiPhiLuong : "0",
    ).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
    chiPhiBTTC: String(d.chiPhiBTTC !== undefined ? d.chiPhiBTTC : "0").replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ".",
    ),
    tongSoTien: String(d.tongSoTien !== undefined ? d.tongSoTien : "0").replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ".",
    ),
    soNgayNghi: String(d.soNgayNghi !== undefined ? d.soNgayNghi : "0"),
    thiethaiTaiSan: String(
      d.thiethaiTaiSan !== undefined ? d.thiethaiTaiSan : "0",
    ).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
  };
};

const InputField = ({
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  suffix = "",
  invalid = false,
  errorMsg = "",
  type = "number",
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  suffix?: string;
  invalid?: boolean;
  errorMsg?: string;
  type?: "text" | "number";
}) => {
  return (
    <div className="relative flex flex-col mt-2">
      <label className="absolute -top-2 left-2 bg-white px-1 text-[11px] text-[#6b7280] z-10">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <div className="relative flex items-center w-full">
        <input
          type={type === "text" || suffix ? "text" : "number"}
          min={type === "text" || suffix ? undefined : 0}
          className={`${FC} w-full h-[40px] pt-1 ${suffix ? "pr-16" : ""} ${invalid ? "border-danger border-2" : ""}`}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
        />
        {suffix && (
          <span className="absolute right-3 text-xs text-[#9ca3af] pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {invalid && errorMsg && (
        <span className="text-[11px] text-danger mt-1">{errorMsg}</span>
      )}
    </div>
  );
};

const FC =
  "h-[38px] rounded-md border border-line bg-white px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] disabled:bg-[#f9fafb] disabled:text-ink disabled:opacity-100";
const SC = `${FC} w-full cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8`;

const isInvalidValue = (triedSubmit: boolean, val: string, req: boolean) => {
  if (!triedSubmit) return false;
  if (req && !val.trim()) return true;
  const clean = val.trim().replace(/\./g, "").replace(/,/g, ".");
  const parsed = parseFloat(clean);
  return !isNaN(parsed) && parsed < 0;
};

const getErrorMsg = (
  triedSubmit: boolean,
  val: string,
  label: string,
  req: boolean,
) => {
  if (!triedSubmit) return "";
  if (req && !val.trim())
    return `Vui lòng nhập ${label.replace(" *", "").toLowerCase()}`;
  const clean = val.trim().replace(/\./g, "").replace(/,/g, ".");
  const parsed = parseFloat(clean);
  if (!isNaN(parsed) && parsed < 0)
    return `${label.replace(" *", "")} không được là số âm`;
  return "";
};
const SELECT_TOP_CLASS = `${FC} min-w-[280px] cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8`;

const CT_TH =
  "border border-line bg-[#f9fafb] px-2 py-1.5 text-center text-[11px] font-semibold text-[#374151] align-middle";
const CT_TD =
  "border border-line px-2 py-1.5 text-center text-[11px] text-[#374151] align-middle";

const EMPTY_DETAIL: Omit<AccidentDetail, "id"> = {
  hoTen: "",
  ngaySinh: "",
  gioiTinh: "Nam",
  ngheNghiep: "Lao động xây dựng và lao động liên quan",
  loaiHopDong: "Hợp đồng xác định thời hạn",
  mucDo: "Thương nhẹ",
  ngayXayRa: "",
  diaDiem: "",
  yeuTo: "Thiết bị nâng",
  nguyenNhan: "Không có thiết bị an toàn hoặc thiết bị không đảm bảo an toàn",
  soVu: "1",
  soVuCoNguoiChet: "0",
  soVuCo2NguoiBiNan: "0",
  soNguoiBiNan: "0",
  soLDNu: "0",
  soNguoiBiChet: "0",
  soNguoiBiThuongNang: "0",
  nanKhongQL: "0",
  nuKhongQL: "0",
  chetKhongQL: "0",
  thuongKhongQL: "0",
  chiPhiYTe: "0",
  chiPhiLuong: "0",
  chiPhiBTTC: "0",
  tongSoTien: "0",
  soNgayNghi: "0",
  thiethaiTaiSan: "0",
};

const cleanName = (name: string): string => {
  return (name || "").replace(/^[–\-—\s\.\u2013\u2014]+/, "").trim();
};

export default function EnterpriseReportPage() {
  const [view, setView] = useState<PageView>("list");
  const [dbFactors, setDbFactors] = useState<{ ten: string; ma: string }[]>([]);
  const [dbOccupations, setDbOccupations] = useState<{ ten: string; ma: string }[]>([]);

  const CAUSE_OPTIONS = useMemo(
    () => [
      "Không có thiết bị an toàn hoặc thiết bị không đảm bảo an sau",
      "Không có phương tiện bảo vệ cá nhân hoặc phương tiện bảo vệ cá nhân không tốt",
      "Tổ chức lao động không hợp lý",
      "Chưa huấn luyện hoặc huấn luyện an toàn vệ sinh lao động chưa đầy đủ",
      "Không có quy trình an toàn hoặc biện pháp làm việc an toàn",
      "Điều kiện làm việc không tốt",
      "Quy phạm nội quy, quy trình, quy chuẩn, biện pháp làm việc an toàn",
      "Không sử dụng phương tiện bảo vệ cá nhân",
      "Khách quan khó tránh/ Nguyên nhân chưa kể đến",
    ],
    [],
  );

  const DEFAULT_FACTOR_OPTIONS = useMemo(
    () => [
      "Ngã",
      "Vật rơi, vật văng bắn",
      "Máy, thiết bị",
      "Phương tiện vận tải",
      "Điện giật",
      "Chất độc hại",
      "Bỏng",
      "Thiết bị nâng",
    ],
    [],
  );

  const DEFAULT_OCCUPATION_OPTIONS = useMemo(
    () => [
      "Nhà lãnh đạo cơ quan Đảng Cộng sản Việt nam cấp Trung ương",
      "Công nhân",
    ],
    [],
  );

  const standardFactors = useMemo(() => {
    return dbFactors.length > 0 ? dbFactors.map((f) => f.ten) : DEFAULT_FACTOR_OPTIONS;
  }, [dbFactors, DEFAULT_FACTOR_OPTIONS]);

  const FACTOR_OPTIONS = useMemo(() => {
    return [...standardFactors, "Khác"];
  }, [standardFactors]);

  const standardOccupations = useMemo(() => {
    return dbOccupations.length > 0
      ? dbOccupations.map((o) => o.ten)
      : DEFAULT_OCCUPATION_OPTIONS;
  }, [dbOccupations, DEFAULT_OCCUPATION_OPTIONS]);

  const OCCUPATION_OPTIONS = useMemo(() => {
    return [...standardOccupations, "Khác"];
  }, [standardOccupations]);
  const [section, setSection] = useState<FormSection>("ttct");
  const [subTab, setSubTab] = useState<SubTab>("tongSo");
  const [toast, setToastState] = useState<{ message: string; variant: "success" | "warning" | "error" } | null>(null);
  const setToast = (msg: string | { message: string; variant: "success" | "warning" | "error" } | null) => {
    if (msg === null) {
      setToastState(null);
    } else if (typeof msg === "string") {
      setToastState({ message: msg, variant: "success" });
    } else {
      setToastState(msg);
    }
  };
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [filterYear, setFilterYear] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [availableConfigs, setAvailableConfigs] = useState<ReportConfig[]>([]);
  const [createYear, setCreateYear] = useState("");
  const [createKy, setCreateKy] = useState("6 tháng");
  const [creating, setCreating] = useState(false);

  const [businessDetail, setBusinessDetail] = useState<BusinessDetail | null>(
    null,
  );
  const [activeReport, setActiveReport] = useState<ReportRecord | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineReport, setTimelineReport] = useState<ReportRecord | null>(
    null,
  );

  const matchedConfig = useMemo(() => {
    return availableConfigs.find(
      (c) => c.nam === createYear && c.ky === createKy,
    );
  }, [availableConfigs, createYear, createKy]);

  const isAlreadyCreated = useMemo(() => {
    return reports.some((r) => r.nam === createYear && r.ky === createKy);
  }, [reports, createYear, createKy]);

  const openCreateModal = async () => {
    try {
      const allConfigs = await getReportConfigList();
      const activeConfigs = allConfigs.filter((c) => c.active);
      setAvailableConfigs(activeConfigs);
      setCreateYear(String(new Date().getFullYear()));
      setCreateKy("6 tháng");
      setCreateModalOpen(true);
    } catch {
      setToast("Không tải được danh sách kỳ báo cáo");
    }
  };

  const confirmCreateReport = async () => {
    if (isAlreadyCreated) {
      setToast("Bạn đã tạo báo cáo cho kỳ này rồi");
      return;
    }
    setCreating(true);
    try {
      const created = await submitDnReport({
        configId: matchedConfig?.id,
        nam: createYear,
        ky: createKy,
        tongSoRows: {},
        chiTietRows: [],
        status: "Đang báo cáo",
      });
      setCreateModalOpen(false);
      setToast("Tạo báo cáo thành công");
      const list = await getDnReportList();
      setReports(list);
      openReport(created);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Tạo báo cáo thất bại");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    getDnReportList()
      .then(setReports)
      .catch(() => {});

    const bizId = getBusinessId();
    if (bizId) {
      getBusinessById(bizId)
        .then(setBusinessDetail)
        .catch(() => {});
    }

    getInjuryFactorList()
      .then((list) => {
        console.log("getInjuryFactorList loaded:", list);
        const items = list
          .filter((item) => item.active)
          .map((item) => ({
            ten: cleanName(item.ten),
            ma: item.ma,
          }));
        setDbFactors(items);
      })
      .catch((err) => {
        console.error("getInjuryFactorList failed:", err);
      });

    getOccupationList()
      .then((list) => {
        console.log("getOccupationList loaded:", list);
        const items = list.map((item) => ({
          ten: cleanName(item.ten),
          ma: item.ma,
        }));
        setDbOccupations(items);
      })
      .catch((err) => {
        console.error("getOccupationList failed:", err);
      });
  }, []);

  // Thông tin công ty
  const [totalLao, setTotalLao] = useState("0");
  const [totalNu, setTotalNu] = useState("0");
  const [tongLuong, setTongLuong] = useState("0");

  // Tổng số vụ (Section 1)
  const [tongVu, setTongVu] = useState("1");
  const [vuChet, setVuChet] = useState("1");
  const [vuNhieu, setVuNhieu] = useState("0");

  // Số nạn nhân (Section 1)
  const [tongNan, setTongNan] = useState("10");
  const [tongNanNu, setTongNanNu] = useState("5");
  const [tongChetNN, setTongChetNN] = useState("5");
  const [tongThuongNang, setTongThuongNang] = useState("10");

  // Không thuộc quyền quản lý (Section 1)
  const [nanKhongQL, setNanKhongQL] = useState("0");
  const [nuKhongQL, setNuKhongQL] = useState("0");
  const [chetKhongQL, setChetKhongQL] = useState("0");
  const [thuongKhongQL, setThuongKhongQL] = useState("0");

  // Thiệt hại (Section 1)
  const [chiPhiYTe, setChiPhiYTe] = useState("10.000.000");
  const [chiPhiLuong, setChiPhiLuong] = useState("10.000.000");
  const [chiPhiBTTC, setChiPhiBTTC] = useState("10.000.000");
  const [tongChiPhi, setTongChiPhi] = useState("30.000.000");
  const [soNgayNghi, setSoNgayNghi] = useState("20");
  const [thiHaiTaiSan, setThiHaiTaiSan] = useState("10.000.000");

  // --- Section 2: Tai nạn được hưởng trợ cấp ... ---
  // Tổng số vụ (Section 2)
  const [tcTongVu, setTcTongVu] = useState("0");
  const [tcVuChet, setTcVuChet] = useState("0");
  const [tcVuNhieu, setTcVuNhieu] = useState("0");

  // Số nạn nhân (Section 2)
  const [tcTongNan, setTcTongNan] = useState("0");
  const [tcTongNanNu, setTcTongNanNu] = useState("0");
  const [tcTongChetNN, setTcTongChetNN] = useState("0");
  const [tcTongThuongNang, setTcTongThuongNang] = useState("0");

  // Không thuộc quyền quản lý (Section 2)
  const [tcNanKhongQL, setTcNanKhongQL] = useState("0");
  const [tcNuKhongQL, setTcNuKhongQL] = useState("0");
  const [tcChetKhongQL, setTcChetKhongQL] = useState("0");
  const [tcThuongKhongQL, setTcThuongKhongQL] = useState("0");

  // Thiệt hại (Section 2)
  const [tcChiPhiYTe, setTcChiPhiYTe] = useState("0");
  const [tcChiPhiLuong, setTcChiPhiLuong] = useState("0");
  const [tcChiPhiBTTC, setTcChiPhiBTTC] = useState("0");
  const [tcTongChiPhi, setTcTongChiPhi] = useState("0");
  const [tcSoNgayNghi, setTcSoNgayNghi] = useState("0");
  const [tcThiHaiTaiSan, setTcThiHaiTaiSan] = useState("0");
  const isTcEditedByUser = useRef(false);
  // Chi tiết từng vụ
  const [accidentDetails, setAccidentDetails] = useState<AccidentDetail[]>([]);
  const [savedOverviewRows, setSavedOverviewRows] = useState<
    Record<string, number[]>
  >({});

  // Báo cáo đang chỉnh + lưới phân loại phần II + cờ đang lưu
  const [editingId, setEditingId] = useState<number | null>(null);
  const [phanLoai, setPhanLoai] =
    useState<Record<string, string[]>>(emptyPhanLoai);
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [reportFileUrl, setReportFileUrl] = useState<string | null>(null);
  const originalReportRef = useRef<{
    tongHop: any;
    phanLoai: any;
    tongHopRows: any;
    chiTietRows: any;
    fileUrl: string | null;
  } | null>(null);
  const isLoadingReportRef = useRef(false);
  const reportFileInputRef = useRef<HTMLInputElement>(null);

  const mapCauseToCode = (cause: string): string => {
    if (!cause) return "16";
    if (cause.includes("Không có thiết bị an toàn")) return "9";
    if (cause.includes("Không có phương tiện bảo vệ")) return "10";
    if (cause.includes("Tổ chức lao động")) return "11";
    if (cause.includes("Chưa huấn luyện")) return "12";
    if (cause.includes("Không có quy trình")) return "13";
    if (cause.includes("Quy phạm nội quy")) return "13";
    if (cause.includes("Điều kiện làm việc")) return "14";
    if (cause.includes("Không sử dụng phương tiện")) return "15";
    return "16";
  };

  const mapYeuToToCode = (yeuTo: string): string => {
    const low = (yeuTo || "").toLowerCase();
    if (low === "ngã" || low.includes("ngã")) return "17";
    if (
      low.includes("vật rơi") ||
      low.includes("vật văng bắn") ||
      low.includes("văng bắn") ||
      low.includes("vật rơi, đổ, sập")
    )
      return "18";
    if (
      low.includes("máy") ||
      low.includes("thiết bị") ||
      low.includes("áp lực") ||
      low.includes("nâng")
    )
      return "19";
    if (
      low.includes("phương tiện") ||
      low.includes("vận tải") ||
      low.includes("xe")
    )
      return "20";
    if (low.includes("điện")) return "21";
    if (
      low.includes("độc") ||
      low.includes("phóng xạ") ||
      low.includes("hóa chất")
    )
      return "22";
    if (low.includes("bỏng") || low.includes("nhiệt")) return "23";
    return "24";
  };

  const checkDetailsChanged = (): boolean => {
    const orig = originalReportRef.current?.chiTietRows || [];
    if (accidentDetails.length !== orig.length) return true;
    for (let i = 0; i < accidentDetails.length; i++) {
      const curr = accidentDetails[i];
      const prev = orig[i];
      if (!prev) return true;
      if (
        curr.nguyenNhan !== prev.nguyenNhan ||
        curr.yeuTo !== prev.yeuTo ||
        curr.ngheNghiep !== prev.ngheNghiep ||
        curr.soVu !== prev.soVu ||
        curr.soVuCoNguoiChet !== prev.soVuCoNguoiChet ||
        curr.soVuCo2NguoiBiNan !== prev.soVuCo2NguoiBiNan ||
        curr.soNguoiBiNan !== prev.soNguoiBiNan ||
        curr.soLDNu !== prev.soLDNu ||
        curr.soNguoiBiChet !== prev.soNguoiBiChet ||
        curr.soNguoiBiThuongNang !== prev.soNguoiBiThuongNang ||
        curr.nanKhongQL !== prev.nanKhongQL ||
        curr.nuKhongQL !== prev.nuKhongQL ||
        curr.chetKhongQL !== prev.chetKhongQL ||
        curr.thuongKhongQL !== prev.thuongKhongQL ||
        curr.chiPhiYTe !== prev.chiPhiYTe ||
        curr.chiPhiLuong !== prev.chiPhiLuong ||
        curr.chiPhiBTTC !== prev.chiPhiBTTC ||
        curr.tongSoTien !== prev.tongSoTien ||
        curr.soNgayNghi !== prev.soNgayNghi ||
        curr.thiethaiTaiSan !== prev.thiethaiTaiSan
      ) {
        return true;
      }
    }
    return false;
  };

  // Auto-compute tongChiPhi (tab 1) = chiPhiYTe + chiPhiLuong + chiPhiBTTC
  useEffect(() => {
    if (isLoadingReportRef.current) return;
    const total =
      parseNum(chiPhiYTe) + parseNum(chiPhiLuong) + parseNum(chiPhiBTTC);
    const formatted = String(total).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setTongChiPhi(formatted);
  }, [chiPhiYTe, chiPhiLuong, chiPhiBTTC]);

  // 👉 TÌM VÀ THAY THẾ USEEFFECT CŨ BẰNG ĐOẠN NÀY
  useEffect(() => {
    if (isLoadingReportRef.current) return;

    // Nếu người dùng đã tự tay nhập số liệu vào Mục 2, ta KHÔNG ghi đè nữa để tôn trọng dữ liệu của họ.
    if (isTcEditedByUser.current) return;

    // Nếu người dùng chưa đụng vào Mục 2, tự động lấy 100% dữ liệu từ Mục 1 đắp sang
    setTcTongVu(tongVu);
    setTcVuChet(vuChet);
    setTcVuNhieu(vuNhieu);
    setTcTongNan(tongNan);
    setTcTongNanNu(tongNanNu);
    setTcTongChetNN(tongChetNN);
    setTcTongThuongNang(tongThuongNang);
    setTcNanKhongQL(nanKhongQL);
    setTcNuKhongQL(nuKhongQL);
    setTcChetKhongQL(chetKhongQL);
    setTcThuongKhongQL(thuongKhongQL);
    setTcChiPhiYTe(chiPhiYTe);
    setTcChiPhiLuong(chiPhiLuong);
    setTcChiPhiBTTC(chiPhiBTTC);
    setTcTongChiPhi(tongChiPhi);
    setTcSoNgayNghi(soNgayNghi);
    setTcThiHaiTaiSan(thiHaiTaiSan);
  }, [
    // Lắng nghe trực tiếp Mục 1: Bất cứ khi nào Mục 1 thay đổi, Mục 2 sẽ tự động cập nhật theo
    tongVu,
    vuChet,
    vuNhieu,
    tongNan,
    tongNanNu,
    tongChetNN,
    tongThuongNang,
    nanKhongQL,
    nuKhongQL,
    chetKhongQL,
    thuongKhongQL,
    chiPhiYTe,
    chiPhiLuong,
    chiPhiBTTC,
    tongChiPhi,
    soNgayNghi,
    thiHaiTaiSan,
  ]);

  const tcCrossValidations = useMemo(() => {
    const tongVu = parseNum(tcTongVu);
    const vuChet = parseNum(tcVuChet);
    const vuNhieu = parseNum(tcVuNhieu);
    const tongNan = parseNum(tcTongNan);
    const tongNanNu = parseNum(tcTongNanNu);
    const tongChet = parseNum(tcTongChetNN);
    const tongThuong = parseNum(tcTongThuongNang);
    const nanKQL = parseNum(tcNanKhongQL);
    const nuKQL = parseNum(tcNuKhongQL);
    const chetKQL = parseNum(tcChetKhongQL);
    const thuongKQL = parseNum(tcThuongKhongQL);

    return {
      isTcChetGreater: tongVu < vuChet,
      isTcNhieuGreater: tongVu < vuNhieu,
      isTcNanNuGreater: tongNan < tongNanNu,
      isTcChetNNGreater: tongNan < tongChet,
      isTcThuongNangGreater: tongNan < tongThuong,
      isTcNuKQGreater: nanKQL < nuKQL,
      isTcChetKQGreater: nanKQL < chetKQL,
      isTcThuongKQGreater: nanKQL < thuongKQL,
    };
  }, [
    tcTongVu,
    tcVuChet,
    tcVuNhieu,
    tcTongNan,
    tcTongNanNu,
    tcTongChetNN,
    tcTongThuongNang,
    tcNanKhongQL,
    tcNuKhongQL,
    tcChetKhongQL,
    tcThuongKhongQL,
  ]);

  // Cross-validation for ttct section: totalNu <= totalLao
  const ttctCrossValidations = useMemo(() => {
    const lao = parseNum(totalLao);
    const nu = parseNum(totalNu);
    return {
      isNuGreaterThanLao:
        totalLao.trim() !== "" && totalNu.trim() !== "" && nu > lao,
    };
  }, [totalLao, totalNu]);

  // Cross-validation for tnld section (non-tc)
  const tnldCrossValidations = useMemo(() => {
    const tVu = parseNum(tcTongVu);
    const vChet = parseNum(vuChet);
    const vNhieu = parseNum(vuNhieu);
    const tNan = parseNum(tongNan);
    const tNanNu = parseNum(tongNanNu);
    const tChet = parseNum(tongChetNN);
    const tThuong = parseNum(tongThuongNang);
    const nKQL = parseNum(nanKhongQL);
    const nuKQL = parseNum(nuKhongQL);
    const chetKQL = parseNum(chetKhongQL);
    const thuongKQL = parseNum(thuongKhongQL);

    return {
      // Tổng số vụ group
      isVuChetGreater: tVu < vChet,
      isVuNhieuGreater: tVu < vNhieu,
      // Tổng số người bị nạn group
      isNanNuGreater: tNan < tNanNu,
      isChetNNGreater: tNan < tChet,
      isThuongNangGreater: tNan < tThuong,
      // Số người bị nạn không QL group
      isNuKQLGreater: nKQL < nuKQL,
      isChetKQLGreater: nKQL < chetKQL,
      isThuongKQLGreater: nKQL < thuongKQL,
    };
  }, [
    tcTongVu,
    vuChet,
    vuNhieu,
    tongNan,
    tongNanNu,
    tongChetNN,
    tongThuongNang,
    nanKhongQL,
    nuKhongQL,
    chetKhongQL,
    thuongKhongQL,
  ]);

  // Mismatch detection between tab (1) summary values and tab (2) detail sums
  const detailSumsMismatch = useMemo(() => {
    if (accidentDetails.length === 0) return null;

    let sumVu = 0,
      sumVuChet = 0,
      sumVuNhieu = 0;
    let sumNan = 0,
      sumNanNu = 0,
      sumChet = 0,
      sumThuong = 0;
    let sumNanKQL = 0,
      sumNuKQL = 0,
      sumChetKQL = 0,
      sumThuongKQL = 0;
    let sumYTe = 0,
      sumLuong = 0,
      sumBTTC = 0,
      sumTongTien = 0;
    let sumNgayNghi = 0,
      sumThiHaiTS = 0;

    accidentDetails.forEach((d) => {
      sumVu += parseNum(d.soVu);
      sumVuChet += parseNum(d.soVuCoNguoiChet);
      sumVuNhieu += parseNum(d.soVuCo2NguoiBiNan);
      sumNan += parseNum(d.soNguoiBiNan);
      sumNanNu += parseNum(d.soLDNu);
      sumChet += parseNum(d.soNguoiBiChet);
      sumThuong += parseNum(d.soNguoiBiThuongNang);
      sumNanKQL += parseNum(d.nanKhongQL);
      sumNuKQL += parseNum(d.nuKhongQL);
      sumChetKQL += parseNum(d.chetKhongQL);
      sumThuongKQL += parseNum(d.thuongKhongQL);
      sumYTe += parseNum(d.chiPhiYTe);
      sumLuong += parseNum(d.chiPhiLuong);
      sumBTTC += parseNum(d.chiPhiBTTC);
      sumTongTien += parseNum(d.tongSoTien);
      sumNgayNghi += parseNum(d.soNgayNghi);
      sumThiHaiTS += parseNum(d.thiethaiTaiSan);
    });

    const m = {
      tongVu: parseNum(tongVu) !== sumVu,
      vuChet: parseNum(vuChet) !== sumVuChet,
      vuNhieu: parseNum(vuNhieu) !== sumVuNhieu,
      tongNan: parseNum(tongNan) !== sumNan,
      tongNanNu: parseNum(tongNanNu) !== sumNanNu,
      tongChetNN: parseNum(tongChetNN) !== sumChet,
      tongThuongNang: parseNum(tongThuongNang) !== sumThuong,
      nanKhongQL: parseNum(nanKhongQL) !== sumNanKQL,
      nuKhongQL: parseNum(nuKhongQL) !== sumNuKQL,
      chetKhongQL: parseNum(chetKhongQL) !== sumChetKQL,
      thuongKhongQL: parseNum(thuongKhongQL) !== sumThuongKQL,
      chiPhiYTe: parseNum(chiPhiYTe) !== sumYTe,
      chiPhiLuong: parseNum(chiPhiLuong) !== sumLuong,
      chiPhiBTTC: parseNum(chiPhiBTTC) !== sumBTTC,
      tongChiPhi: parseNum(tongChiPhi) !== sumTongTien,
      soNgayNghi: parseNum(soNgayNghi) !== sumNgayNghi,
      thiHaiTaiSan: parseNum(thiHaiTaiSan) !== sumThiHaiTS,
    };

    const hasAny = Object.values(m).some(Boolean);
    return hasAny ? m : null;
  }, [
    accidentDetails,
    tongVu,
    vuChet,
    vuNhieu,
    tongNan,
    tongNanNu,
    tongChetNN,
    tongThuongNang,
    nanKhongQL,
    nuKhongQL,
    chetKhongQL,
    thuongKhongQL,
    chiPhiYTe,
    chiPhiLuong,
    chiPhiBTTC,
    tongChiPhi,
    soNgayNghi,
    thiHaiTaiSan,
  ]);

  useEffect(() => {
    if (!checkDetailsChanged()) return;

    if (accidentDetails.length === 0) {
      setTongVu("0");
      setVuChet("0");
      setVuNhieu("0");
      setTongNan("0");
      setTongNanNu("0");
      setTongChetNN("0");
      setTongThuongNang("0");
      setNanKhongQL("0");
      setNuKhongQL("0");
      setChetKhongQL("0");
      setThuongKhongQL("0");
      setChiPhiYTe("0");
      setChiPhiLuong("0");
      setChiPhiBTTC("0");
      setTongChiPhi("0");
      setSoNgayNghi("0");
      setThiHaiTaiSan("0");

      setPhanLoai((prev) => {
        const next = { ...prev };
        for (const ma of PHAN_LOAI_MAS) {
          next[ma] = Array(13).fill("0");
        }
        return next;
      });
      return;
    }

    let totalV = 0;
    let vChetCount = 0;
    let vNhieuCount = 0;
    let totalN = 0;
    let totalN_Nu = 0;
    let totalChet = 0;
    let totalThuong = 0;
    let totalNanKQL = 0;
    let totalNuKQL = 0;
    let totalChetKQL = 0;
    let totalThuongKQL = 0;
    let totalYTe = 0;
    let totalLuong = 0;
    let totalBTTC = 0;
    let totalTongTien = 0;
    let totalNgayNghi = 0;
    let totalThiHaiTS = 0;

    accidentDetails.forEach((d) => {
      totalV += parseNum(d.soVu);
      vChetCount += parseNum(d.soVuCoNguoiChet);
      vNhieuCount += parseNum(d.soVuCo2NguoiBiNan);
      totalN += parseNum(d.soNguoiBiNan);
      totalN_Nu += parseNum(d.soLDNu);
      totalChet += parseNum(d.soNguoiBiChet);
      totalThuong += parseNum(d.soNguoiBiThuongNang);
      totalNanKQL += parseNum(d.nanKhongQL);
      totalNuKQL += parseNum(d.nuKhongQL);
      totalChetKQL += parseNum(d.chetKhongQL);
      totalThuongKQL += parseNum(d.thuongKhongQL);
      totalYTe += parseNum(d.chiPhiYTe);
      totalLuong += parseNum(d.chiPhiLuong);
      totalBTTC += parseNum(d.chiPhiBTTC);
      totalTongTien += parseNum(d.tongSoTien);
      totalNgayNghi += parseNum(d.soNgayNghi);
      totalThiHaiTS += parseNum(d.thiethaiTaiSan);
    });

    const formatCost = (num: number): string => {
      return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    setTongVu(String(totalV));
    setVuChet(String(vChetCount));
    setVuNhieu(String(vNhieuCount));
    setTongNan(String(totalN));
    setTongNanNu(String(totalN_Nu));
    setTongChetNN(String(totalChet));
    setTongThuongNang(String(totalThuong));
    setNanKhongQL(String(totalNanKQL));
    setNuKhongQL(String(totalNuKQL));
    setChetKhongQL(String(totalChetKQL));
    setThuongKhongQL(String(totalThuongKQL));
    setChiPhiYTe(formatCost(totalYTe));
    setChiPhiLuong(formatCost(totalLuong));
    setChiPhiBTTC(formatCost(totalBTTC));
    setTongChiPhi(formatCost(totalYTe + totalLuong + totalBTTC));
    setSoNgayNghi(String(totalNgayNghi));
    setThiHaiTaiSan(formatCost(totalThiHaiTS));

    setPhanLoai((prev) => {
      const next = { ...prev };
      for (const ma of PHAN_LOAI_MAS) {
        next[ma] = Array(13).fill("0");
      }

      accidentDetails.forEach((d) => {
        const sectorCode = getDefaultSector();
        const causeCode = mapCauseToCode(d.nguyenNhan);
        const factorCode = mapYeuToToCode(d.yeuTo);

        const addValues = (code: string) => {
          if (!next[code]) {
            next[code] = Array(13).fill("0");
          }
          next[code] = next[code].map((c, i) => {
            const current = parseNum(c);
            let added = 0;
            if (i === 0) added = parseNum(d.soVu);
            else if (i === 1) added = parseNum(d.soVuCoNguoiChet);
            else if (i === 2) added = parseNum(d.soVuCo2NguoiBiNan);
            else if (i === 3) added = parseNum(d.soNguoiBiNan);
            else if (i === 4) added = parseNum(d.soLDNu);
            else if (i === 5) added = parseNum(d.soNguoiBiChet);
            else if (i === 6) added = parseNum(d.soNguoiBiThuongNang);
            else if (i === 7) added = parseNum(d.soNgayNghi);
            else if (i === 8) added = parseNum(d.tongSoTien);
            else if (i === 9) added = parseNum(d.chiPhiYTe);
            else if (i === 10) added = parseNum(d.chiPhiLuong);
            else if (i === 11) added = parseNum(d.chiPhiBTTC);
            else if (i === 12) added = parseNum(d.thiethaiTaiSan);
            return String(current + added);
          });
        };

        addValues(sectorCode);
        addValues(causeCode);
        addValues(factorCode);
      });

      return next;
    });
  }, [accidentDetails, businessDetail]);

  const getDefaultSector = (): string => {
    const ind = (businessDetail?.mainIndustry || "").toLowerCase();
    if (ind.includes("khai khoáng") || ind.includes("khai thác")) return "1";
    if (
      ind.includes("chế biến") ||
      ind.includes("chế tạo") ||
      ind.includes("sản xuất") ||
      ind.includes("cơ khí")
    )
      return "2";
    if (ind.includes("điện") || ind.includes("khí đốt")) return "3";
    if (
      ind.includes("cung cấp nước") ||
      ind.includes("thoát nước") ||
      ind.includes("xử lý chất thải")
    )
      return "4";
    if (ind.includes("xây dựng")) return "5";
    if (
      ind.includes("vận tải") ||
      ind.includes("kho bãi") ||
      ind.includes("logistics")
    )
      return "6";
    if (
      ind.includes("nông nghiệp") ||
      ind.includes("lâm nghiệp") ||
      ind.includes("thủy sản")
    )
      return "7";
    return "8"; // Ngành khác
  };

  const setPhanLoaiCell = (ma: string, col: number, val: string) => {
    const cleanVal = val.replace(/\D/g, "");
    setPhanLoai((prev) => {
      const next = {
        ...prev,
        [ma]: prev[ma].map((c, i) => (i === col ? cleanVal : c)),
      };

      const maNum = Number(ma);
      let sum = 0;

      if (maNum >= 1 && maNum <= 8) {
        for (let m = 1; m <= 8; m++)
          sum += parseNum(next[String(m)]?.[col] ?? "0");
        const cause = "16";
        let sum2 = 0;
        for (let m = 9; m <= 16; m++)
          if (String(m) !== cause)
            sum2 += parseNum(next[String(m)]?.[col] ?? "0");
        next[cause] = next[cause].map((c, i) =>
          i === col ? String(Math.max(0, sum - sum2)) : c,
        );
        const factor = "24";
        let sum3 = 0;
        for (let m = 17; m <= 24; m++)
          if (String(m) !== factor)
            sum3 += parseNum(next[String(m)]?.[col] ?? "0");
        next[factor] = next[factor].map((c, i) =>
          i === col ? String(Math.max(0, sum - sum3)) : c,
        );
      } else if (maNum >= 9 && maNum <= 16) {
        for (let m = 9; m <= 16; m++)
          sum += parseNum(next[String(m)]?.[col] ?? "0");
        const sec = getDefaultSector();
        let sum1 = 0;
        for (let m = 1; m <= 8; m++)
          if (String(m) !== sec)
            sum1 += parseNum(next[String(m)]?.[col] ?? "0");
        next[sec] = next[sec].map((c, i) =>
          i === col ? String(Math.max(0, sum - sum1)) : c,
        );
        const factor = "24";
        let sum3 = 0;
        for (let m = 17; m <= 24; m++)
          if (String(m) !== factor)
            sum3 += parseNum(next[String(m)]?.[col] ?? "0");
        next[factor] = next[factor].map((c, i) =>
          i === col ? String(Math.max(0, sum - sum3)) : c,
        );
      } else if (maNum >= 17 && maNum <= 24) {
        for (let m = 17; m <= 24; m++)
          sum += parseNum(next[String(m)]?.[col] ?? "0");
        const sec = getDefaultSector();
        let sum1 = 0;
        for (let m = 1; m <= 8; m++)
          if (String(m) !== sec)
            sum1 += parseNum(next[String(m)]?.[col] ?? "0");
        next[sec] = next[sec].map((c, i) =>
          i === col ? String(Math.max(0, sum - sum1)) : c,
        );
        const cause = "16";
        let sum2 = 0;
        for (let m = 9; m <= 16; m++)
          if (String(m) !== cause)
            sum2 += parseNum(next[String(m)]?.[col] ?? "0");
        next[cause] = next[cause].map((c, i) =>
          i === col ? String(Math.max(0, sum - sum2)) : c,
        );
      }

      const sumStr = String(sum);
      if (col === 0) setTongVu(sumStr);
      else if (col === 1) setVuChet(sumStr);
      else if (col === 2) setVuNhieu(sumStr);
      else if (col === 3) setTongNan(sumStr);
      else if (col === 4) setTongNanNu(sumStr);
      else if (col === 5) setTongChetNN(sumStr);
      else if (col === 6) setTongThuongNang(sumStr);
      else if (col === 7) setSoNgayNghi(sumStr);
      else if (col === 8) setTongChiPhi(sumStr);
      else if (col === 9) setChiPhiYTe(sumStr);
      else if (col === 10) setChiPhiLuong(sumStr);
      else if (col === 11) setChiPhiBTTC(sumStr);
      else if (col === 12) setThiHaiTaiSan(sumStr);

      return next;
    });
  };

  const updateFieldAndPhanLoai = (
    setter: (v: string) => void,
    col: number,
    val: string,
  ) => {
    setter(val);
    const num = parseNum(val);
    setPhanLoai((prev) => {
      const next = { ...prev };
      const sec = getDefaultSector();
      let sum1 = 0;
      for (let m = 1; m <= 8; m++)
        if (String(m) !== sec) sum1 += parseNum(prev[String(m)]?.[col] ?? "0");
      next[sec] = (next[sec] || Array(13).fill("0")).map((c, i) =>
        i === col ? String(Math.max(0, num - sum1)) : c,
      );
      const cause = "16";
      let sum2 = 0;
      for (let m = 9; m <= 16; m++)
        if (String(m) !== cause)
          sum2 += parseNum(prev[String(m)]?.[col] ?? "0");
      next[cause] = (next[cause] || Array(13).fill("0")).map((c, i) =>
        i === col ? String(Math.max(0, num - sum2)) : c,
      );
      const factor = "24";
      let sum3 = 0;
      for (let m = 17; m <= 24; m++)
        if (String(m) !== factor)
          sum3 += parseNum(prev[String(m)]?.[col] ?? "0");
      next[factor] = (next[factor] || Array(13).fill("0")).map((c, i) =>
        i === col ? String(Math.max(0, num - sum3)) : c,
      );
      return next;
    });
  };

  const openReport = (r: ReportRecord, readOnly: boolean = false) => {
    setIsReadOnly(readOnly);
    setTriedSubmit(false);
    setEditingId(r.id);
    setActiveReport(r);
    setSection(readOnly ? "tongquan" : "ttct");
    setSubTab("tongSo");
    setView("form");
    isLoadingReportRef.current = true;
    getDnReportById(r.id)
      .then((res) => {
        const t = res.form.tongHop;
        const normalizedChiTiet = (res.form.chiTietRows || []).map(
          normalizeDetail,
        );
        originalReportRef.current = {
          tongHop: t,
          phanLoai: res.form.phanLoaiRows || {},
          tongHopRows: res.form.tongSoRows || {},
          chiTietRows: normalizedChiTiet,
          fileUrl: res.fileUrl || null,
        };
        setReportFileUrl(res.fileUrl || null);
        setTotalLao(String(t.soLaoDong));
        setTongVu(String(t.soVu));
        setVuChet(String(t.soVuCoNguoiChet));
        setVuNhieu(String(t.soVuCo2NguoiBiNan));
        setTongNan(String(t.soNguoiBiNan));
        setTongNanNu(String(t.soLDNu));
        setTongChetNN(String(t.soNguoiBiChet));
        setTongThuongNang(String(t.soNguoiBiThuongNang));
        setSoNgayNghi(String(t.soNgayNghi));
        setChiPhiYTe(String(t.chiPhiYTe).replace(/\B(?=(\d{3})+(?!\d))/g, "."));
        setChiPhiLuong(
          String(t.chiPhiTraLuong).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
        );
        setChiPhiBTTC(
          String(t.boiThuongTroCap).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
        );
        setTongChiPhi(
          String(t.tongSoTien).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
        );
        setThiHaiTaiSan(
          String(t.thiethaiTaiSan).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
        );

        setAccidentDetails(normalizedChiTiet);
        setSavedOverviewRows(res.form.tongSoRows || {});

        const info = res.form.tongSoRows?.["company_info"];
        if (Array.isArray(info)) {
          setTotalNu(String(info[0] ?? 0));
          setTongLuong(formatNumberString(String(info[1] ?? 0)));
        } else {
          setTotalNu("0");
          setTongLuong("0");
        }

        const tcVals = res.form.tongSoRows?.["10"];
        if (Array.isArray(tcVals)) {
          // 👉 THÊM VÀO ĐÂY: Kiểm tra xem báo cáo lấy từ API về đã có dữ liệu Mục 2 chưa
          // Nếu có bất kỳ số nào > 0, nghĩa là Mục 2 đã từng được nhập -> Khóa auto-sync lại để bảo vệ dữ liệu.
          const hasTcData = tcVals.some((v) => Number(v) > 0);
          isTcEditedByUser.current = hasTcData;

          setTcTongVu(String(tcVals[0] ?? 0));
          setTcVuChet(String(tcVals[1] ?? 0));
          setTcVuNhieu(String(tcVals[2] ?? 0));
          setTcTongNan(String(tcVals[3] ?? 0));
          setTcNanKhongQL(String(tcVals[4] ?? 0));
          setTcTongNanNu(String(tcVals[5] ?? 0));
          setTcNuKhongQL(String(tcVals[6] ?? 0));
          setTcTongChetNN(String(tcVals[7] ?? 0));
          setTcChetKhongQL(String(tcVals[8] ?? 0));
          setTcTongThuongNang(String(tcVals[9] ?? 0));
          setTcThuongKhongQL(String(tcVals[10] ?? 0));

          setTcSoNgayNghi(String(tcVals[11] ?? 0));
          setTcTongChiPhi(
            String(tcVals[12] ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
          );
          setTcChiPhiYTe(
            String(tcVals[13] ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
          );
          setTcChiPhiLuong(
            String(tcVals[14] ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
          );
          setTcChiPhiBTTC(
            String(tcVals[15] ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
          );
          setTcThiHaiTaiSan(
            String(tcVals[16] ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
          );
        } else {
          // 👉 THÊM VÀO ĐÂY: Reset lại cờ nếu đây là báo cáo trống / mới, cho phép auto-sync hoạt động
          isTcEditedByUser.current = false;

          setTcTongVu("0");
          setTcVuChet("0");
          setTcVuNhieu("0");
          setTcTongNan("0");
          setTcNanKhongQL("0");
          setTcTongNanNu("0");
          setTcNuKhongQL("0");
          setTcTongChetNN("0");
          setTcChetKhongQL("0");
          setTcTongThuongNang("0");
          setTcThuongKhongQL("0");

          setTcSoNgayNghi("0");
          setTcTongChiPhi("0");
          setTcChiPhiYTe("0");
          setTcChiPhiLuong("0");
          setTcChiPhiBTTC("0");
          setTcThiHaiTaiSan("0");
        }

        const next = emptyPhanLoai();
        for (const ma of PHAN_LOAI_MAS) {
          const arr = res.form.phanLoaiRows?.[ma];
          if (Array.isArray(arr))
            next[ma] = next[ma].map((d, i) =>
              arr[i] !== undefined ? String(arr[i]) : d,
            );
        }
        setPhanLoai(next);
        // Allow sync effect to run again after loading is complete
        setTimeout(() => {
          isLoadingReportRef.current = false;
        }, 0);
      })
      .catch(() => {
        isLoadingReportRef.current = false;
      });
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
    Object.fromEntries(
      PHAN_LOAI_MAS.map((ma) => [ma, phanLoai[ma].map(parseNum)]),
    );

  const validateSection = (sec: FormSection): boolean => {
    if (sec === "ttct") {
      const ttctFields: [string, string][] = [
        ["Tổng số lao động của cơ sở", totalLao],
        ["Tổng số lao động nữ", totalNu],
        ["Tổng quỹ lương", tongLuong],
      ];
      const empty = ttctFields.find(([, v]) => !v.trim());
      const negative = ttctFields.find(([, v]) => {
        const clean = v.trim().replace(/\./g, "").replace(/,/g, ".");
        const parsed = parseFloat(clean);
        return !isNaN(parsed) && parsed < 0;
      });
      if (empty || negative || ttctCrossValidations.isNuGreaterThanLao) {
        return false;
      }
    } else if (sec === "tnld") {
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
      const empty = tnldFields.find(([, v]) => !v.trim());
      const negative = tnldFields.find(([, v]) => {
        const clean = v.trim().replace(/\./g, "").replace(/,/g, ".");
        const parsed = parseFloat(clean);
        return !isNaN(parsed) && parsed < 0;
      });
      if (empty || negative) {
        setSubTab("tongSo");
        return false;
      }

      // Cross-validation: sub-fields must not exceed parent totals
      const hasCrossError = Object.values(tnldCrossValidations).some(Boolean);
      if (hasCrossError) {
        setSubTab("tongSo");
        return false;
      }

      for (let i = 0; i < accidentDetails.length; i++) {
        const d = accidentDetails[i];
        const requiredFields: { key: keyof AccidentDetail; label: string }[] = [
          { key: "soVuCoNguoiChet", label: "Tổng số vụ có người chết" },
          {
            key: "soVuCo2NguoiBiNan",
            label: "Tổng số vụ có 2 người bị nạn trở lên",
          },
          { key: "soNguoiBiNan", label: "Tổng số người bị nạn" },
          { key: "soLDNu", label: "Tổng số lao động nữ bị nạn" },
          { key: "soNguoiBiChet", label: "Tổng số người bị chết" },
          { key: "soNguoiBiThuongNang", label: "Tổng số người bị thương nặng" },
          { key: "nanKhongQL", label: "Số người bị nạn không QL" },
          { key: "nuKhongQL", label: "Lao động nữ bị nạn không QL" },
          { key: "chetKhongQL", label: "Số người chết không QL" },
          { key: "thuongKhongQL", label: "Người bị thương nặng không QL" },
          { key: "chiPhiYTe", label: "Chi phí y tế" },
          {
            key: "chiPhiLuong",
            label: "Chi phí trả lương trong thời gian điều trị",
          },
          { key: "chiPhiBTTC", label: "Chi phí bồi thường trợ cấp" },
          { key: "tongSoTien", label: "Tổng số tiền chi phí" },
          { key: "soNgayNghi", label: "Tổng số ngày nghỉ vì TNLĐ" },
          { key: "thiethaiTaiSan", label: "Thiệt hại tài sản" },
        ];
        const emptyDetailField = requiredFields.find(
          (f) => !String(d[f.key] ?? "").trim(),
        );
        const negativeDetailField = requiredFields.find((f) => {
          const v = String(d[f.key] ?? "");
          const clean = v.trim().replace(/\./g, "").replace(/,/g, ".");
          const parsed = parseFloat(clean);
          return !isNaN(parsed) && parsed < 0;
        });
        if (emptyDetailField || negativeDetailField) {
          setSubTab("chiTiet");
          setExpandedIds((prev) => ({ ...prev, [d.id]: true }));
          return false;
        }
      }
    } else if (sec === "tnld_tc") {
      const tcFields: [string, string][] = [
        ["Tổng số vụ", tcTongVu],
        ["Số vụ có người chết", tcVuChet],
        ["Số vụ ≥ 2 người bị nạn", tcVuNhieu],
        ["Tổng số người bị nạn", tcTongNan],
        ["Tổng số lao động nữ bị nạn", tcTongNanNu],
        ["Tổng số người bị chết", tcTongChetNN],
        ["Tổng số người bị thương nặng", tcTongThuongNang],
        ["Số người bị nạn không QL", tcNanKhongQL],
        ["Lao động nữ bị nạn không QL", tcNuKhongQL],
        ["Số người chết không QL", tcChetKhongQL],
        ["Người bị thương nặng không QL", tcThuongKhongQL],
        ["Chi phí y tế", tcChiPhiYTe],
        ["Chi phí trả lương trong thời gian điều trị", tcChiPhiLuong],
        ["Chi phí bồi thường trợ cấp", tcChiPhiBTTC],
        ["Tổng số tiền chi phí", tcTongChiPhi],
        ["Tổng số ngày nghỉ vì TNLĐ", tcSoNgayNghi],
      ];
      const empty = tcFields.find(([, v]) => !v.trim());
      const negative = tcFields.find(([, v]) => {
        const clean = v.trim().replace(/\./g, "").replace(/,/g, ".");
        const parsed = parseFloat(clean);
        return !isNaN(parsed) && parsed < 0;
      });
      if (empty || negative) {
        return false;
      }
    }
    return true;
  };

  const nextSection = () => {
    if (!validateSection(section)) {
      setTriedSubmit(true);
      return;
    }

    const idx = SECTION_OPTIONS.findIndex((o) => o.value === section);
    if (idx < SECTION_OPTIONS.length - 1) {
      setSection(SECTION_OPTIONS[idx + 1].value);
      setTriedSubmit(false);
    }
  };

  const validateReport = (): boolean => {
    setTriedSubmit(true);
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
    const tcFields: [string, string][] = [
      ["Tổng số vụ", tcTongVu],
      ["Số vụ có người chết", tcVuChet],
      ["Số vụ ≥ 2 người bị nạn", tcVuNhieu],
      ["Tổng số người bị nạn", tcTongNan],
      ["Tổng số lao động nữ bị nạn", tcTongNanNu],
      ["Tổng số người bị chết", tcTongChetNN],
      ["Tổng số người bị thương nặng", tcTongThuongNang],
      ["Số người bị nạn không QL", tcNanKhongQL],
      ["Lao động nữ bị nạn không QL", tcNuKhongQL],
      ["Số người chết không QL", tcChetKhongQL],
      ["Người bị thương nặng không QL", tcThuongKhongQL],
      ["Chi phí y tế", tcChiPhiYTe],
      ["Chi phí trả lương trong thời gian điều trị", tcChiPhiLuong],
      ["Chi phí bồi thường trợ cấp", tcChiPhiBTTC],
      ["Tổng số tiền chi phí", tcTongChiPhi],
      ["Tổng số ngày nghỉ vì TNLĐ", tcSoNgayNghi],
    ];

    const emptyTtct = ttctFields.find(([, v]) => !v.trim());
    if (emptyTtct || ttctCrossValidations.isNuGreaterThanLao) {
      setSection("ttct");
      return false;
    }
    const emptyTnld = tnldFields.find(([, v]) => !v.trim());
    const hasTnldCrossError = Object.values(tnldCrossValidations).some(Boolean);
    if (emptyTnld || hasTnldCrossError) {
      setSection("tnld");
      setSubTab("tongSo");
      return false;
    }
    const emptyTc = tcFields.find(([, v]) => !v.trim());
    const hasTcCrossError = Object.values(tcCrossValidations).some(Boolean);
    if (emptyTc || hasTcCrossError) {
      setSection("tnld_tc");
      return false;
    }

    for (let i = 0; i < accidentDetails.length; i++) {
      const d = accidentDetails[i];
      const requiredFields: { key: keyof AccidentDetail; label: string }[] = [
        { key: "soVuCoNguoiChet", label: "Tổng số vụ có người chết" },
        {
          key: "soVuCo2NguoiBiNan",
          label: "Tổng số vụ có 2 người bị nạn trở lên",
        },
        { key: "soNguoiBiNan", label: "Tổng số người bị nạn" },
        { key: "soLDNu", label: "Tổng số lao động nữ bị nạn" },
        { key: "soNguoiBiChet", label: "Tổng số người bị chết" },
        { key: "soNguoiBiThuongNang", label: "Tổng số người bị thương nặng" },
        { key: "nanKhongQL", label: "Số người bị nạn không QL" },
        { key: "nuKhongQL", label: "Lao động nữ bị nạn không QL" },
        { key: "chetKhongQL", label: "Số người chết không QL" },
        { key: "thuongKhongQL", label: "Người bị thương nặng không QL" },
        { key: "chiPhiYTe", label: "Chi phí y tế" },
        {
          key: "chiPhiLuong",
          label: "Chi phí trả lương trong thời gian điều trị",
        },
        { key: "chiPhiBTTC", label: "Chi phí bồi thường trợ cấp" },
        { key: "tongSoTien", label: "Tổng số tiền chi phí" },
        { key: "soNgayNghi", label: "Tổng số ngày nghỉ vì TNLĐ" },
        { key: "thiethaiTaiSan", label: "Thiệt hại tài sản" },
      ];

      const emptyDetailField = requiredFields.find(
        (f) => !String(d[f.key] ?? "").trim(),
      );
      if (emptyDetailField) {
        setSection("tnld");
        setSubTab("chiTiet");
        setExpandedIds((prev) => ({ ...prev, [d.id]: true }));
        return false;
      }

      const negativeDetailField = requiredFields.find((f) => {
        const v = String(d[f.key] ?? "");
        const clean = v.trim().replace(/\./g, "").replace(/,/g, ".");
        const parsed = parseFloat(clean);
        return !isNaN(parsed) && parsed < 0;
      });
      if (negativeDetailField) {
        setSection("tnld");
        setSubTab("chiTiet");
        setExpandedIds((prev) => ({ ...prev, [d.id]: true }));
        return false;
      }
    }

    const negative = [...ttctFields, ...tnldFields, ...tcFields].find(
      ([, v]) => {
        const clean = v.trim().replace(/\./g, "").replace(/,/g, ".");
        const parsed = parseFloat(clean);
        return !isNaN(parsed) && parsed < 0;
      },
    );
    if (negative) {
      const inTtct = ttctFields.some(([lbl]) => lbl === negative[0]);
      if (inTtct) {
        setSection("ttct");
      } else {
        const inTnld = tnldFields.some(([lbl]) => lbl === negative[0]);
        if (inTnld) {
          setSection("tnld");
          setSubTab("tongSo");
        } else {
          setSection("tnld_tc");
        }
      }
      return false;
    }
    return true;
  };

  const buildTongSoRows = (): Record<string, number[]> => {
    const result: Record<string, number[]> = { ...savedOverviewRows };

    result["company_info"] = [parseNum(totalNu), parseNum(tongLuong)];

    result["1"] = [
      parseNum(tongVu),
      parseNum(vuChet),
      parseNum(vuNhieu),
      parseNum(tongNan),
      parseNum(nanKhongQL),
      parseNum(tongNanNu),
      parseNum(nuKhongQL),
      parseNum(tongChetNN),
      parseNum(chetKhongQL),
      parseNum(tongThuongNang),
      parseNum(thuongKhongQL),
    ];

    result["10"] = [
      parseNum(tcTongVu),
      parseNum(tcVuChet),
      parseNum(tcVuNhieu),
      parseNum(tcTongNan),
      parseNum(tcNanKhongQL),
      parseNum(tcTongNanNu),
      parseNum(tcNuKhongQL),
      parseNum(tcTongChetNN),
      parseNum(tcChetKhongQL),
      parseNum(tcTongThuongNang),
      parseNum(tcThuongKhongQL),
      parseNum(tcSoNgayNghi),
      parseNum(tcTongChiPhi),
      parseNum(tcChiPhiYTe),
      parseNum(tcChiPhiLuong),
      parseNum(tcChiPhiBTTC),
      parseNum(tcThiHaiTaiSan),
    ];

    const getCauseRow = (key: string): number[] => {
      const rowVal = phanLoai[key] || Array(13).fill("0");
      let nanKQL = 0;
      let nuKQL = 0;
      let chetKQL = 0;
      let thuongKQL = 0;

      if (accidentDetails.length > 0) {
        const filtered = accidentDetails.filter(
          (d) => mapCauseToCode(d.nguyenNhan) === key,
        );
        nanKQL = filtered.reduce((sum, d) => sum + parseNum(d.nanKhongQL), 0);
        nuKQL = filtered.reduce((sum, d) => sum + parseNum(d.nuKhongQL), 0);
        chetKQL = filtered.reduce((sum, d) => sum + parseNum(d.chetKhongQL), 0);
        thuongKQL = filtered.reduce(
          (sum, d) => sum + parseNum(d.thuongKhongQL),
          0,
        );
      }

      return [
        parseNum(rowVal[0]),
        parseNum(rowVal[1]),
        parseNum(rowVal[2]),
        parseNum(rowVal[3]),
        nanKQL,
        parseNum(rowVal[4]),
        nuKQL,
        parseNum(rowVal[5]),
        chetKQL,
        parseNum(rowVal[6]),
        thuongKQL,
      ];
    };

    result["1"] = getCauseRow("9");
    result["2"] = getCauseRow("10");
    result["3"] = getCauseRow("11");
    result["4"] = getCauseRow("12");
    result["5"] = getCauseRow("13");
    result["6"] = getCauseRow("14");
    result["7"] = getCauseRow("13");
    result["8"] = getCauseRow("15");
    result["9"] = getCauseRow("16");

    const getVictimRow = (
      filterFn: (d: AccidentDetail) => boolean,
    ): number[] => {
      const filtered = accidentDetails.filter(filterFn);
      if (filtered.length === 0) return Array(11).fill(0);

      const countVu = filtered.reduce((sum, d) => sum + parseNum(d.soVu), 0);
      const countVuChet = filtered.reduce(
        (sum, d) => sum + parseNum(d.soVuCoNguoiChet),
        0,
      );
      const countVuNhieu = filtered.reduce(
        (sum, d) => sum + parseNum(d.soVuCo2NguoiBiNan),
        0,
      );
      const countNan = filtered.reduce(
        (sum, d) => sum + parseNum(d.soNguoiBiNan),
        0,
      );
      const countNanKhongQL = filtered.reduce(
        (sum, d) => sum + parseNum(d.nanKhongQL),
        0,
      );
      const countNu = filtered.reduce((sum, d) => sum + parseNum(d.soLDNu), 0);
      const countNuKhongQL = filtered.reduce(
        (sum, d) => sum + parseNum(d.nuKhongQL),
        0,
      );
      const countChet = filtered.reduce(
        (sum, d) => sum + parseNum(d.soNguoiBiChet),
        0,
      );
      const countChetKhongQL = filtered.reduce(
        (sum, d) => sum + parseNum(d.chetKhongQL),
        0,
      );
      const countThuongNang = filtered.reduce(
        (sum, d) => sum + parseNum(d.soNguoiBiThuongNang),
        0,
      );
      const countThuongKhongQL = filtered.reduce(
        (sum, d) => sum + parseNum(d.thuongKhongQL),
        0,
      );

      return [
        countVu,
        countVuChet,
        countVuNhieu,
        countNan,
        countNanKhongQL,
        countNu,
        countNuKhongQL,
        countChet,
        countChetKhongQL,
        countThuongNang,
        countThuongKhongQL,
      ];
    };

    if (accidentDetails.length > 0) {
      const activeFactors = new Set<string>();
      const activeOccupations = new Set<string>();

      accidentDetails.forEach((d) => {
        if (d.yeuTo) activeFactors.add(cleanName(d.yeuTo));
        if (d.ngheNghiep) activeOccupations.add(cleanName(d.ngheNghiep));
      });

      // Clear legacy static keys
      delete result["101"];
      delete result["102"];
      delete result["103"];

      // Clean up old dynamic keys
      Object.keys(result).forEach((key) => {
        if (key.startsWith("factor_") && !activeFactors.has(cleanName(key.replace("factor_", "")))) {
          delete result[key];
        }
        if (key.startsWith("occupation_") && !activeOccupations.has(cleanName(key.replace("occupation_", "")))) {
          delete result[key];
        }
      });

      // Populate current active keys
      activeFactors.forEach((factor) => {
        result[`factor_${factor}`] = getVictimRow((d) => cleanName(d.yeuTo || "") === factor);
      });
      activeOccupations.forEach((occ) => {
        result[`occupation_${occ}`] = getVictimRow((d) => cleanName(d.ngheNghiep || "") === occ);
      });
    }

    return result;
  };

  const overviewRows = useMemo(() => {
    // 1. Get the list of factors and occupations dynamically from accidentDetails (or savedOverviewRows keys)
    const activeFactors = new Set<string>();
    const activeOccupations = new Set<string>();

    if (accidentDetails.length > 0) {
      accidentDetails.forEach((d) => {
        if (d.yeuTo) activeFactors.add(cleanName(d.yeuTo));
        if (d.ngheNghiep) activeOccupations.add(cleanName(d.ngheNghiep));
      });
    } else {
      // If no details, default to "Thiết bị nâng" and standard ones
      activeFactors.add("Thiết bị nâng");
      activeOccupations.add("Nhà lãnh đạo cơ quan Đảng Cộng sản Việt nam cấp Trung ương");
      activeOccupations.add("Công nhân");
    }

    // Also look at savedOverviewRows to preserve any loaded/saved rows that might not be in accidentDetails currently
    Object.keys(savedOverviewRows).forEach((key) => {
      if (key.startsWith("factor_")) {
        activeFactors.add(cleanName(key.replace("factor_", "")));
      }
      if (key.startsWith("occupation_")) {
        activeOccupations.add(cleanName(key.replace("occupation_", "")));
      }
    });

    // Build the dynamic rows array
    const dynamicRows: { kind: "normal" | "sub" | "section"; label: string; ma: string; bold?: boolean }[] = [];

    // Prefix: up to 1.1 Do người lao động
    dynamicRows.push(
      { kind: "section", label: "1. Tai nạn lao động", ma: "" },
      { kind: "normal", label: "Tai nạn lao động", ma: "1" },
      { kind: "sub", label: "1.1 Phân theo nguyên nhân xảy ra TNLĐ", ma: "", bold: true },
      { kind: "sub", label: "a. Do người sử dụng lao động", ma: "" },
      { kind: "normal", label: "Không có thiết bị an toàn hoặc thiết bị không đảm bảo an toàn", ma: "1" },
      { kind: "normal", label: "Không có phương tiện bảo vệ cá nhân hoặc phương tiện bảo vệ cá nhân không tốt", ma: "2" },
      { kind: "normal", label: "Tổ chức lao động không hợp lý", ma: "3" },
      { kind: "normal", label: "Chưa huấn luyện hoặc huấn luyện an toàn vệ sinh lao động chưa đầy đủ", ma: "4" },
      { kind: "normal", label: "Không có quy trình an toàn hoặc biện pháp làm việc an toàn", ma: "5" },
      { kind: "normal", label: "Điều kiện làm việc không tốt", ma: "6" },
      { kind: "sub", label: "b. Do người lao động", ma: "" },
      { kind: "normal", label: "Quy phạm nội quy, quy trình, quy chuẩn, biện pháp làm việc an toàn", ma: "7" },
      { kind: "normal", label: "Không sử dụng phương tiện bảo vệ cá nhân", ma: "8" },
      { kind: "normal", label: "Khách quan khó tránh/ Nguyên nhân chưa kể đến", ma: "9" },
    );

    // 1.2 Phân theo yếu tố gây chấn thương
    dynamicRows.push({ kind: "sub", label: "1.2. Phân theo yếu tố gây chấn thương", ma: "", bold: true });
    Array.from(activeFactors).forEach((factor) => {
      dynamicRows.push({ kind: "normal", label: factor, ma: `factor_${factor}` });
    });

    // 1.3 Phân theo nghề nghiệp
    dynamicRows.push({ kind: "sub", label: "1.3 Phân theo nghề nghiệp", ma: "", bold: true });
    Array.from(activeOccupations).forEach((occ) => {
      dynamicRows.push({ kind: "normal", label: occ, ma: `occupation_${occ}` });
    });

    // 2 & 3 Sections
    dynamicRows.push(
      { kind: "section", label: "2. Tai nạn được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ", ma: "" },
      { kind: "normal", label: "Tai nạn được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ", ma: "10" },
      { kind: "section", label: "3. Tổng số", ma: "" },
      { kind: "normal", label: "Tổng số (3=1+2)", ma: "total" },
    );

    // Now map over dynamicRows and calculate values for each row
    return dynamicRows.map((row) => {
      if (row.kind !== "normal" && row.kind !== "section") {
        return row;
      }

      let vals = Array(11).fill(0);
      const ma = row.ma;

      if (row.label === "Tai nạn lao động" && ma === "1") {
        vals = [
          parseNum(tongVu),
          parseNum(vuChet),
          parseNum(vuNhieu),
          parseNum(tongNan),
          parseNum(nanKhongQL),
          parseNum(tongNanNu),
          parseNum(nuKhongQL),
          parseNum(tongChetNN),
          parseNum(chetKhongQL),
          parseNum(tongThuongNang),
          parseNum(thuongKhongQL),
        ];
      } else if (row.label === "Tổng số (3=1+2)" && ma === "total") {
        vals = [
          parseNum(tongVu) + parseNum(tcTongVu),
          parseNum(vuChet) + parseNum(tcVuChet),
          parseNum(vuNhieu) + parseNum(tcVuNhieu),
          parseNum(tongNan) + parseNum(tcTongNan),
          parseNum(nanKhongQL) + parseNum(tcNanKhongQL),
          parseNum(tongNanNu) + parseNum(tcTongNanNu),
          parseNum(nuKhongQL) + parseNum(tcNuKhongQL),
          parseNum(tongChetNN) + parseNum(tcTongChetNN),
          parseNum(chetKhongQL) + parseNum(tcChetKhongQL),
          parseNum(tongThuongNang) + parseNum(tcTongThuongNang),
          parseNum(thuongKhongQL) + parseNum(tcThuongKhongQL),
        ];
      } else if (ma === "10") {
        vals = [
          parseNum(tcTongVu),
          parseNum(tcVuChet),
          parseNum(tcVuNhieu),
          parseNum(tcTongNan),
          parseNum(tcNanKhongQL),
          parseNum(tcTongNanNu),
          parseNum(tcNuKhongQL),
          parseNum(tcTongChetNN),
          parseNum(tcChetKhongQL),
          parseNum(tcTongThuongNang),
          parseNum(tcThuongKhongQL),
        ];
      } else if (["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(ma)) {
        const gridKeyMap: Record<string, string> = {
          "1": "9",
          "2": "10",
          "3": "11",
          "4": "12",
          "5": "13",
          "6": "14",
          "7": "13",
          "8": "15",
          "9": "16",
        };
        const gridKey = gridKeyMap[ma];
        const rowVal = phanLoai[gridKey] || Array(13).fill("0");
        vals = [
          parseNum(rowVal[0]),
          parseNum(rowVal[1]),
          parseNum(rowVal[2]),
          parseNum(rowVal[3]),
          0,
          parseNum(rowVal[4]),
          0,
          parseNum(rowVal[5]),
          0,
          parseNum(rowVal[6]),
          0,
        ];
      } else if (ma.startsWith("factor_")) {
        const factorName = ma.replace("factor_", "");
        if (accidentDetails.length > 0) {
          const filtered = accidentDetails.filter((d) => cleanName(d.yeuTo || "") === factorName);
          const countVu = new Set(filtered.map((d) => d.id)).size;
          const countChet = filtered.filter((d) => d.mucDo === "Chết").length;
          const countVuChet = countChet > 0 ? 1 : 0;
          const countVuNhieu = countVu >= 2 ? 1 : 0;
          const countNan = filtered.length;
          const countNu = filtered.filter((d) => d.gioiTinh === "Nữ").length;
          const countThuongNang = filtered.filter((d) => d.mucDo === "Thương nặng").length;
          vals = [
            countVu,
            countVuChet,
            countVuNhieu,
            countNan,
            0,
            countNu,
            0,
            countChet,
            0,
            countThuongNang,
            0,
          ];
        } else {
          vals = savedOverviewRows[ma] || Array(11).fill(0);
        }
      } else if (ma.startsWith("occupation_")) {
        const occName = ma.replace("occupation_", "");
        if (accidentDetails.length > 0) {
          const filtered = accidentDetails.filter((d) => cleanName(d.ngheNghiep || "") === occName);
          const countVu = new Set(filtered.map((d) => d.id)).size;
          const countChet = filtered.filter((d) => d.mucDo === "Chết").length;
          const countVuChet = countChet > 0 ? 1 : 0;
          const countVuNhieu = countVu >= 2 ? 1 : 0;
          const countNan = filtered.length;
          const countNu = filtered.filter((d) => d.gioiTinh === "Nữ").length;
          const countThuongNang = filtered.filter((d) => d.mucDo === "Thương nặng").length;
          vals = [
            countVu,
            countVuChet,
            countVuNhieu,
            countNan,
            0,
            countNu,
            0,
            countChet,
            0,
            countThuongNang,
            0,
          ];
        } else {
          vals = savedOverviewRows[ma] || Array(11).fill(0);
        }
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
  }, [
    tongVu,
    vuChet,
    vuNhieu,
    tongNan,
    nanKhongQL,
    tongNanNu,
    nuKhongQL,
    tongChetNN,
    chetKhongQL,
    tongThuongNang,
    thuongKhongQL,
    tcTongVu,
    tcVuChet,
    tcVuNhieu,
    tcTongNan,
    tcNanKhongQL,
    tcTongNanNu,
    tcNuKhongQL,
    tcTongChetNN,
    tcChetKhongQL,
    tcTongThuongNang,
    tcThuongKhongQL,
    phanLoai,
    accidentDetails,
    savedOverviewRows,
    dbFactors,
    dbOccupations,
  ]);

  const submit = async (status: string, successMsg: string) => {
    if (status === "Đã nộp" && !reportFileUrl) {
      setToast({ message: "Vui lòng đính kèm báo cáo TNLĐ có dấu mộc công ty trước khi gửi!", variant: "warning" });
      return;
    }
    if (!validateReport()) return;
    if (editingId == null) {
      setToast("Không xác định được báo cáo để lưu");
      return;
    }

    const isReportChanged = () => {
      if (!originalReportRef.current) return true;
      const orig = originalReportRef.current;

      if (reportFileUrl !== (orig.fileUrl || null)) return true;

      const currentTH = buildTongHop();
      const keysToCheck: (keyof typeof currentTH)[] = [
        "soLaoDong",
        "soLDNu",
        "soVu",
        "soVuCoNguoiChet",
        "soVuCo2NguoiBiNan",
        "soNguoiBiNan",
        "soNguoiBiChet",
        "soNguoiBiThuongNang",
        "soNgayNghi",
        "tongSoTien",
        "chiPhiYTe",
        "chiPhiTraLuong",
        "boiThuongTroCap",
        "thiethaiTaiSan",
      ];
      for (const key of keysToCheck) {
        if (Number(currentTH[key]) !== Number(orig.tongHop[key] || 0)) {
          return true;
        }
      }

      const currentPL = buildPhanLoai();
      for (const ma of PHAN_LOAI_MAS) {
        const origArr = orig.phanLoai[ma] || [];
        const currArr = currentPL[ma] || [];
        const maxLen = Math.max(origArr.length, currArr.length);
        for (let i = 0; i < maxLen; i++) {
          if (Number(origArr[i] || 0) !== Number(currArr[i] || 0)) {
            return true;
          }
        }
      }

      const currentTS = buildTongSoRows();
      const origTS = originalReportRef.current.tongHopRows || {};
      const allTSKeys = new Set([
        ...Object.keys(currentTS),
        ...Object.keys(origTS),
      ]);
      for (const key of allTSKeys) {
        const origArr = origTS[key] || [];
        const currArr = currentTS[key] || [];
        const maxLen = Math.max(origArr.length, currArr.length);
        for (let i = 0; i < maxLen; i++) {
          if (Number(origArr[i] || 0) !== Number(currArr[i] || 0)) {
            return true;
          }
        }
      }

      const origChiTiet = originalReportRef.current.chiTietRows || [];
      if (accidentDetails.length !== origChiTiet.length) return true;
      for (let i = 0; i < accidentDetails.length; i++) {
        const curr = accidentDetails[i];
        const prev = origChiTiet[i];
        if (!prev) return true;
        if (
          curr.nguyenNhan !== prev.nguyenNhan ||
          curr.yeuTo !== prev.yeuTo ||
          curr.ngheNghiep !== prev.ngheNghiep ||
          curr.soVu !== prev.soVu ||
          curr.soVuCoNguoiChet !== prev.soVuCoNguoiChet ||
          curr.soVuCo2NguoiBiNan !== prev.soVuCo2NguoiBiNan ||
          curr.soNguoiBiNan !== prev.soNguoiBiNan ||
          curr.soLDNu !== prev.soLDNu ||
          curr.soNguoiBiChet !== prev.soNguoiBiChet ||
          curr.soNguoiBiThuongNang !== prev.soNguoiBiThuongNang ||
          curr.nanKhongQL !== prev.nanKhongQL ||
          curr.nuKhongQL !== prev.nuKhongQL ||
          curr.chetKhongQL !== prev.chetKhongQL ||
          curr.thuongKhongQL !== prev.thuongKhongQL ||
          curr.chiPhiYTe !== prev.chiPhiYTe ||
          curr.chiPhiLuong !== prev.chiPhiLuong ||
          curr.chiPhiBTTC !== prev.chiPhiBTTC ||
          curr.tongSoTien !== prev.tongSoTien ||
          curr.soNgayNghi !== prev.soNgayNghi ||
          curr.thiethaiTaiSan !== prev.thiethaiTaiSan
        ) {
          return true;
        }
      }

      return false;
    };

    const originalStatus = reports.find((r) => r.id === editingId)?.tt;
    const isStatusChanged = originalStatus !== status;
    const isDataChanged = isReportChanged();

    if (!isStatusChanged && !isDataChanged) {
      setToast("Không có thay đổi nào cần lưu");
      setView("list");
      return;
    }

    setSaving(true);
    try {
      await updateDnReport(editingId, {
        status,
        ...buildTongHop(),
        phanLoaiRows: buildPhanLoai(),
        tongSoRows: buildTongSoRows(),
        chiTietRows: accidentDetails,
        fileUrl: reportFileUrl,
      });
      const list = await getDnReportList();
      setReports(list);
      setView("list");
      setActiveReport(null);
      setToast(successMsg);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Lưu báo cáo thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleReportFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const res = await uploadReportFile(file);
      setReportFileUrl(res.url);
      setToast("Tải file lên thành công!");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Tải file lên thất bại!");
    } finally {
      setSaving(false);
    }
  };

  const saveReport = () => submit("Đang báo cáo", "Lưu báo cáo thành công");
  const sendReport = () => submit("Đã nộp", "Gửi báo cáo thành công");

  const handleExport = async (report?: any) => {
    try {
      let dataToExport: any;
      if (report) {
        // Exporting from list view: fetch full details first
        const fullReportRes = await getDnReportById(report.id);
        const t = fullReportRes.form.tongHop;
        dataToExport = {
          id: report.id,
          ten: report.ten,
          mst: report.mst,
          ky: report.ky,
          nam: report.nam,
          tt: report.tt,
          province: report.province || businessDetail?.registeredProvince || "",
          ward: report.ward || businessDetail?.registeredWard || "",
          loaiHinh: report.loaiHinh || businessDetail?.businessType || "",
          soLaoDong: t.soLaoDong,
          soLDCoBaoHiem: t.soLDCoBaoHiem,
          soLDNu: t.soLDNu,
          soVu: t.soVu,
          soVuCoNguoiChet: t.soVuCoNguoiChet,
          soVuCo2NguoiBiNan: t.soVuCo2NguoiBiNan,
          soNguoiBiNan: t.soNguoiBiNan,
          soNguoiBiChet: t.soNguoiBiChet,
          soNguoiBiThuongNang: t.soNguoiBiThuongNang,
          soNgayNghi: t.soNgayNghi,
          tongSoTien: t.tongSoTien,
          chiPhiYTe: t.chiPhiYTe,
          chiPhiTraLuong: t.chiPhiTraLuong,
          boiThuongTroCap: t.boiThuongTroCap,
          thiethaiTaiSan: t.thiethaiTaiSan,
          rows: fullReportRes.form.tongSoRows || {},
          phanLoaiRows: fullReportRes.form.phanLoaiRows || {},
          chiTietRows: fullReportRes.form.chiTietRows || [],
        };
      } else {
        // Exporting current active form state
        dataToExport = {
          id: editingId || 0,
          ten: businessDetail?.businessName || "",
          mst: businessDetail?.taxCode || "",
          ky: activeReport?.ky || "6 tháng",
          nam: activeReport?.nam || new Date().getFullYear().toString(),
          tt: "Đang báo cáo",
          province: businessDetail?.registeredProvince || "",
          ward: businessDetail?.registeredWard || "",
          loaiHinh: businessDetail?.businessType || "",
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
          rows: buildTongSoRows(),
          phanLoaiRows: buildPhanLoai(),
          chiTietRows: accidentDetails,
        };
      }

      await exportDetailDocx(dataToExport, businessDetail);
    } catch (e: any) {
      setToast(e.message || "In báo cáo thất bại");
    }
  };

  const addDetail = () => {
    setAccidentDetails((prev) => {
      const next = [...prev, { id: Date.now(), ...EMPTY_DETAIL }];
      // Update tongVu (section 1) to match new count
      setTongVu(String(next.length));
      return next;
    });
  };

  const updateDetail = <K extends keyof AccidentDetail>(
    id: number,
    key: K,
    val: AccidentDetail[K],
  ) => {
    setAccidentDetails((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const updated = { ...d, [key]: val };
        // Auto-compute tongSoTien from the 3 cost columns
        if (
          key === "chiPhiYTe" ||
          key === "chiPhiLuong" ||
          key === "chiPhiBTTC"
        ) {
          const sum =
            parseNum(key === "chiPhiYTe" ? String(val) : updated.chiPhiYTe) +
            parseNum(
              key === "chiPhiLuong" ? String(val) : updated.chiPhiLuong,
            ) +
            parseNum(key === "chiPhiBTTC" ? String(val) : updated.chiPhiBTTC);
          updated.tongSoTien = String(sum).replace(
            /\B(?=(\d{3})+(?!\d))/g,
            ".",
          );
        }
        return updated;
      }),
    );
  };

  const removeDetail = (id: number) => {
    setAccidentDetails((prev) => {
      const next = prev.filter((d) => d.id !== id);
      // Update tongVu (section 1) to match new count
      setTongVu(String(next.length));
      return next;
    });
  };

  // Auto-sync accidentDetails count when tongVu (section 1 total) changes
  useEffect(() => {
    if (isLoadingReportRef.current) return;
    const target = parseNum(tongVu);
    if (target < 0) return;
    setAccidentDetails((prev) => {
      const current = prev.length;
      if (target === current) return prev;
      if (target > current) {
        // Add new empty details to fill up to target
        const toAdd = target - current;
        const newEntries = Array.from({ length: toAdd }, (_, i) => ({
          id: Date.now() + i + 1,
          ...EMPTY_DETAIL,
        }));
        return [...prev, ...newEntries];
      } else {
        // Remove entries from the end
        return prev.slice(0, target);
      }
    });
  }, [tongVu]);

  // Năm để lọc lấy từ chính dữ liệu báo cáo (report_configs.nam), đồng thời hiển thị đến năm hiện tại (2026).
  const yearOptions = useMemo(() => {
    const years = new Set(
      reports.map((r) => r.nam).filter((n): n is string => !!n),
    );
    const currentYear = new Date().getFullYear();
    for (let y = 2022; y <= currentYear; y++) {
      years.add(String(y));
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [reports]);
  const filteredReports = filterYear
    ? reports.filter((r) => r.nam === filterYear)
    : reports;

  console.log("Factors/Occupations current state:", {
    dbFactors,
    dbOccupations,
    standardFactors,
    standardOccupations,
  });

  return (
    <>
      <Toast
        message={toast ? toast.message : null}
        variant={toast ? toast.variant : "success"}
        onDone={() => setToast(null)}
      />

      {view === "list" ? (
        <>
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <h1 className="text-base font-semibold text-ink">
              Báo cáo định kỳ Tai nạn lao động
            </h1>
            <div className="flex items-center gap-2.5">
              <select
                className="h-[34px] cursor-pointer appearance-none rounded-md border border-line bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat px-3 pr-8 text-[13px] outline-none"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="">Tất cả năm</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={openCreateModal}
                className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]"
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
                    <th className="w-28 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                      Thao tác
                    </th>
                    <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                      Tên doanh nghiệp
                    </th>
                    <th className="w-36 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
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
                    <th className="w-36 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]"
                    >
                      <td className="px-3.5 py-2.5">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => openReport(r, true)}
                            title="Xem / Nộp"
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
                            onClick={() => openReport(r, false)}
                            title="Nhập báo cáo"
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
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTimelineReport(r);
                              setTimelineOpen(true);
                            }}
                            title="Tiến độ xử lý"
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
                      <td className="px-3.5 py-2.5 text-[#374151]">{r.ten}</td>
                      <td className="px-3.5 py-2.5 text-[#374151]">{r.mst}</td>
                      <td className="px-3.5 py-2.5 text-[#374151]">{r.ky}</td>
                      <td className="px-3.5 py-2.5 text-[#374151]">
                        {r.nam || "–"}
                      </td>
                      <td className="px-3.5 py-2.5 text-[#374151]">
                        {formatTime(r.updatedAt)}
                      </td>
                      <td className="px-3.5 py-2.5 text-[#374151]">
                        {formatTime(r.submittedAt)}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-[#374151]">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              r.tt === "Đang báo cáo"
                                ? "bg-[#d1d5db]"
                                : r.tt === "Đã nộp"
                                  ? "bg-[#f59e0b]"
                                  : r.tt === "Từ chối"
                                    ? "bg-[#ef4444]"
                                    : r.tt === "Đã tiếp nhận"
                                      ? "bg-[#3b82f6]"
                                      : "bg-[#3b82f6]"
                            }`}
                          />
                          {r.tt}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-end gap-3 border-t border-[#f3f4f6] px-4 py-3 text-[13px] text-[#374151]">
                <span className="text-[#6b7280]">
                  1 - {filteredReports.length} of {filteredReports.length}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <h1 className="text-base font-semibold text-ink">
              Báo cáo định kỳ Tai nạn lao động
            </h1>
            <div className="flex items-center gap-2">
              <span className="mr-2 flex h-[34px] items-center rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-3.5 text-[13.5px] text-[#374151]">
                {activeReport?.nam || "–"}
              </span>
              {section === "tongquan" && (
                <button
                  type="button"
                  onClick={() => handleExport()}
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
              )}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setView("list");
                    setActiveReport(null);
                  }}
                  className="flex h-9 items-center justify-center rounded-md border border-line px-4 text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb] hover:text-ink"
                >
                  Huỷ bỏ
                </button>
              )}
              {isReadOnly ? (
                <button
                  type="button"
                  onClick={() => {
                    setView("list");
                    setActiveReport(null);
                  }}
                  className="flex h-9 items-center justify-center rounded-md border border-line px-4 text-[13.5px] font-medium text-[#374151] hover:bg-[#f9fafb] hover:text-ink"
                >
                  Huỷ bỏ
                </button>
              ) : (
                <>
                  {section !== "tongquan" ? (
                    <button
                      type="button"
                      onClick={nextSection}
                      className="flex h-9 items-center gap-1.5 rounded-md border border-primary px-4 text-[13px] font-semibold text-primary hover:bg-[#eff6ff]"
                    >
                      Tiếp tục{" "}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={saveReport}
                    disabled={saving}
                    className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
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
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      Gửi báo cáo
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className="px-6 py-5">
            {!isReadOnly && (
              <div className="mb-4">
                <select
                  className={SELECT_TOP_CLASS}
                  value={section}
                  onChange={(e) => {
                    const nextSec = e.target.value as FormSection;
                    const currIdx = SECTION_OPTIONS.findIndex(
                      (o) => o.value === section,
                    );
                    const targetIdx = SECTION_OPTIONS.findIndex(
                      (o) => o.value === nextSec,
                    );
                    if (targetIdx > currIdx) {
                      for (let i = currIdx; i < targetIdx; i++) {
                        const secToValidate = SECTION_OPTIONS[i].value;
                        if (!validateSection(secToValidate)) {
                          setSection(secToValidate);
                          setTriedSubmit(true);
                          return;
                        }
                      }
                    }
                    setSection(nextSec);
                    setTriedSubmit(false);
                  }}
                >
                  {SECTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {section === "ttct" ? (
              <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="mb-2 text-[14px] font-bold text-ink">
                  1. Thông tin công ty
                </div>
                <p className="mb-4 text-[12.5px] font-medium text-danger">
                  *** Lưu ý: nhập tổng quỹ lương 6 tháng khi khai báo TNLĐ 6
                  tháng hoặc tổng quỹ lương 12 tháng khi khai báo TNLĐ cả năm
                </p>
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">
                      Tên công ty
                    </label>
                    <input
                      className={FC}
                      value={businessDetail?.businessName || ""}
                      disabled
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">
                      Loại hình công ty
                    </label>
                    <input
                      className={FC}
                      value={businessDetail?.businessType || ""}
                      disabled
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">
                      Ngành nghề kinh doanh
                    </label>
                    <input
                      className={FC}
                      value={businessDetail?.mainIndustry || ""}
                      disabled
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3.5 mt-4">
                  <InputField
                    label="Tổng số lao động của cơ sở"
                    value={totalLao}
                    onChange={setTotalLao}
                    required
                    invalid={
                      isInvalidValue(triedSubmit, totalLao, true) ||
                      ttctCrossValidations.isNuGreaterThanLao
                    }
                    errorMsg={
                      ttctCrossValidations.isNuGreaterThanLao
                        ? "Tổng số lao động phải lớn hơn hoặc bằng tổng số lao động nữ"
                        : getErrorMsg(
                            triedSubmit,
                            totalLao,
                            "Tổng số lao động của cơ sở",
                            true,
                          )
                    }
                  />
                  <InputField
                    label="Tổng số lao động nữ"
                    value={totalNu}
                    onChange={setTotalNu}
                    required
                    invalid={
                      isInvalidValue(triedSubmit, totalNu, true) ||
                      ttctCrossValidations.isNuGreaterThanLao
                    }
                    errorMsg={
                      ttctCrossValidations.isNuGreaterThanLao
                        ? "Tổng số lao động nữ không được lớn hơn tổng số lao động"
                        : getErrorMsg(
                            triedSubmit,
                            totalNu,
                            "Tổng số lao động nữ",
                            true,
                          )
                    }
                  />
                  <InputField
                    label="Tổng quỹ lương"
                    value={tongLuong}
                    onChange={(v) => setTongLuong(formatNumberString(v))}
                    required
                    suffix="(1.000đ)"
                    invalid={isInvalidValue(triedSubmit, tongLuong, true)}
                    errorMsg={getErrorMsg(
                      triedSubmit,
                      tongLuong,
                      "Tổng quỹ lương",
                      true,
                    )}
                  />
                </div>
              </div>
            ) : section === "tnld" ? (
              <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="mb-4 flex border-b-2 border-[#e5e7eb]">
                  <button
                    type="button"
                    onClick={() => setSubTab("tongSo")}
                    className={`-mb-0.5 border-b-2 px-[18px] py-2.5 text-[13.5px] transition-colors ${
                      subTab === "tongSo"
                        ? "border-primary font-semibold text-primary"
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    (1) Tổng số vụ tai nạn lao động
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab("chiTiet")}
                    className={`-mb-0.5 border-b-2 px-[18px] py-2.5 text-[13.5px] transition-colors ${
                      subTab === "chiTiet"
                        ? "border-primary font-semibold text-primary"
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    (2) Chi tiết các vụ tai nạn lao động
                  </button>
                </div>

                {subTab === "tongSo" ? (
                  <>
                    <p className="mb-3 text-[12.5px] font-medium text-danger">
                      **** Doanh nghiệp xảy ra tai nạn lao động vui lòng nhập
                      theo từng bước
                    </p>
                    <div className="mb-2 text-[14px] font-semibold text-ink">
                      1. Tổng số vụ tai nạn lao động & số nạn nhân tai nạn lao
                      động
                    </div>
                    <div className="mb-3 grid grid-cols-4 gap-3">
                      <InputField
                        label="Tổng số vụ"
                        value={tongVu}
                        onChange={(v) =>
                          updateFieldAndPhanLoai(setTongVu, 0, v)
                        }
                        required
                        invalid={
                          isInvalidValue(triedSubmit, tcTongVu, true) ||
                          tnldCrossValidations.isVuChetGreater ||
                          tnldCrossValidations.isVuNhieuGreater
                        }
                        errorMsg={
                          tnldCrossValidations.isVuChetGreater
                            ? "Tổng số vụ phải lớn hơn hoặc bằng số vụ có người chết"
                            : tnldCrossValidations.isVuNhieuGreater
                              ? "Tổng số vụ phải lớn hơn hoặc bằng số vụ ≥ 2 người bị nạn"
                              : getErrorMsg(
                                  triedSubmit,
                                  tcTongVu,
                                  "Tổng số vụ",
                                  true,
                                )
                        }
                      />
                      <InputField
                        label="Số vụ có người chết"
                        value={vuChet}
                        onChange={(v) =>
                          updateFieldAndPhanLoai(setVuChet, 1, v)
                        }
                        required
                        invalid={
                          isInvalidValue(triedSubmit, vuChet, true) ||
                          tnldCrossValidations.isVuChetGreater
                        }
                        errorMsg={
                          tnldCrossValidations.isVuChetGreater
                            ? "Số vụ có người chết không được lớn hơn tổng số vụ"
                            : getErrorMsg(
                                triedSubmit,
                                vuChet,
                                "Số vụ có người chết",
                                true,
                              )
                        }
                      />
                      <InputField
                        label="Số vụ ≥ 2 người bị nạn"
                        value={vuNhieu}
                        onChange={(v) =>
                          updateFieldAndPhanLoai(setVuNhieu, 2, v)
                        }
                        required
                        invalid={
                          isInvalidValue(triedSubmit, vuNhieu, true) ||
                          tnldCrossValidations.isVuNhieuGreater
                        }
                        errorMsg={
                          tnldCrossValidations.isVuNhieuGreater
                            ? "Số vụ ≥ 2 người bị nạn không được lớn hơn tổng số vụ"
                            : getErrorMsg(
                                triedSubmit,
                                vuNhieu,
                                "Số vụ ≥ 2 người bị nạn",
                                true,
                              )
                        }
                      />
                      <div />
                    </div>

                    <div className="mb-3 grid grid-cols-4 gap-3">
                      <InputField
                        label="Tổng số người bị nạn"
                        value={tongNan}
                        onChange={(v) =>
                          updateFieldAndPhanLoai(setTongNan, 3, v)
                        }
                        required
                        invalid={
                          isInvalidValue(triedSubmit, tongNan, true) ||
                          tnldCrossValidations.isNanNuGreater ||
                          tnldCrossValidations.isChetNNGreater ||
                          tnldCrossValidations.isThuongNangGreater
                        }
                        errorMsg={
                          tnldCrossValidations.isNanNuGreater
                            ? "Tổng số người bị nạn phải lớn hơn hoặc bằng tổng số lao động nữ bị nạn"
                            : tnldCrossValidations.isChetNNGreater
                              ? "Tổng số người bị nạn phải lớn hơn hoặc bằng tổng số người bị chết"
                              : tnldCrossValidations.isThuongNangGreater
                                ? "Tổng số người bị nạn phải lớn hơn hoặc bằng tổng số người bị thương nặng"
                                : getErrorMsg(
                                    triedSubmit,
                                    tongNan,
                                    "Tổng số người bị nạn",
                                    true,
                                  )
                        }
                      />
                      <InputField
                        label="Tổng số lao động nữ bị nạn"
                        value={tongNanNu}
                        onChange={(v) =>
                          updateFieldAndPhanLoai(setTongNanNu, 4, v)
                        }
                        required
                        invalid={
                          isInvalidValue(triedSubmit, tongNanNu, true) ||
                          tnldCrossValidations.isNanNuGreater
                        }
                        errorMsg={
                          tnldCrossValidations.isNanNuGreater
                            ? "Tổng số lao động nữ bị nạn không được lớn hơn tổng số người bị nạn"
                            : getErrorMsg(
                                triedSubmit,
                                tongNanNu,
                                "Tổng số lao động nữ bị nạn",
                                true,
                              )
                        }
                      />
                      <InputField
                        label="Tổng số người bị chết"
                        value={tongChetNN}
                        onChange={(v) =>
                          updateFieldAndPhanLoai(setTongChetNN, 5, v)
                        }
                        required
                        invalid={
                          isInvalidValue(triedSubmit, tongChetNN, true) ||
                          tnldCrossValidations.isChetNNGreater
                        }
                        errorMsg={
                          tnldCrossValidations.isChetNNGreater
                            ? "Tổng số người bị chết không được lớn hơn tổng số người bị nạn"
                            : getErrorMsg(
                                triedSubmit,
                                tongChetNN,
                                "Tổng số người bị chết",
                                true,
                              )
                        }
                      />
                      <InputField
                        label="Tổng số người bị thương nặng"
                        value={tongThuongNang}
                        onChange={(v) =>
                          updateFieldAndPhanLoai(setTongThuongNang, 6, v)
                        }
                        required
                        invalid={
                          isInvalidValue(triedSubmit, tongThuongNang, true) ||
                          tnldCrossValidations.isThuongNangGreater
                        }
                        errorMsg={
                          tnldCrossValidations.isThuongNangGreater
                            ? "Tổng số người bị thương nặng không được lớn hơn tổng số người bị nạn"
                            : getErrorMsg(
                                triedSubmit,
                                tongThuongNang,
                                "Tổng số người bị thương nặng",
                                true,
                              )
                        }
                      />
                    </div>

                    <div className="mb-5 grid grid-cols-4 gap-3">
                      <InputField
                        label="Số người bị nạn không QL"
                        value={nanKhongQL}
                        onChange={setNanKhongQL}
                        required
                        invalid={
                          isInvalidValue(triedSubmit, nanKhongQL, true) ||
                          tnldCrossValidations.isNuKQLGreater ||
                          tnldCrossValidations.isChetKQLGreater ||
                          tnldCrossValidations.isThuongKQLGreater
                        }
                        errorMsg={
                          tnldCrossValidations.isNuKQLGreater
                            ? "Số người bị nạn không QL phải lớn hơn hoặc bằng lao động nữ bị nạn không QL"
                            : tnldCrossValidations.isChetKQLGreater
                              ? "Số người bị nạn không QL phải lớn hơn hoặc bằng số người chết không QL"
                              : tnldCrossValidations.isThuongKQLGreater
                                ? "Số người bị nạn không QL phải lớn hơn hoặc bằng người bị thương nặng không QL"
                                : getErrorMsg(
                                    triedSubmit,
                                    nanKhongQL,
                                    "Số người bị nạn không QL",
                                    true,
                                  )
                        }
                      />
                      <InputField
                        label="Lao động nữ bị nạn không QL"
                        value={nuKhongQL}
                        onChange={setNuKhongQL}
                        required
                        invalid={
                          isInvalidValue(triedSubmit, nuKhongQL, true) ||
                          tnldCrossValidations.isNuKQLGreater
                        }
                        errorMsg={
                          tnldCrossValidations.isNuKQLGreater
                            ? "Lao động nữ bị nạn không QL không được lớn hơn số người bị nạn không QL"
                            : getErrorMsg(
                                triedSubmit,
                                nuKhongQL,
                                "Lao động nữ bị nạn không QL",
                                true,
                              )
                        }
                      />
                      <InputField
                        label="Số người chết không QL"
                        value={chetKhongQL}
                        onChange={setChetKhongQL}
                        required
                        invalid={
                          isInvalidValue(triedSubmit, chetKhongQL, true) ||
                          tnldCrossValidations.isChetKQLGreater
                        }
                        errorMsg={
                          tnldCrossValidations.isChetKQLGreater
                            ? "Số người chết không QL không được lớn hơn số người bị nạn không QL"
                            : getErrorMsg(
                                triedSubmit,
                                chetKhongQL,
                                "Số người chết không QL",
                                true,
                              )
                        }
                      />
                      <InputField
                        label="Người bị thương nặng không QL"
                        value={thuongKhongQL}
                        onChange={setThuongKhongQL}
                        required
                        invalid={
                          isInvalidValue(triedSubmit, thuongKhongQL, true) ||
                          tnldCrossValidations.isThuongKQLGreater
                        }
                        errorMsg={
                          tnldCrossValidations.isThuongKQLGreater
                            ? "Người bị thương nặng không QL không được lớn hơn số người bị nạn không QL"
                            : getErrorMsg(
                                triedSubmit,
                                thuongKhongQL,
                                "Người bị thương nặng không QL",
                                true,
                              )
                        }
                      />
                    </div>

                    <div className="mb-2 text-[14px] font-semibold text-ink">
                      2. Thiệt hại do tai nạn lao động
                    </div>

                    <div className="mb-3 grid grid-cols-4 gap-3">
                      <InputField
                        label="Chi phí y tế"
                        value={chiPhiYTe}
                        onChange={(v) =>
                          updateFieldAndPhanLoai(
                            setChiPhiYTe,
                            9,
                            formatNumberString(v),
                          )
                        }
                        required
                        suffix="(1.000đ)"
                        invalid={isInvalidValue(triedSubmit, chiPhiYTe, true)}
                        errorMsg={getErrorMsg(
                          triedSubmit,
                          chiPhiYTe,
                          "Chi phí y tế",
                          true,
                        )}
                      />
                      <InputField
                        label="Chi phí trả lương trong thời gian điều trị"
                        value={chiPhiLuong}
                        onChange={(v) =>
                          updateFieldAndPhanLoai(
                            setChiPhiLuong,
                            10,
                            formatNumberString(v),
                          )
                        }
                        required
                        suffix="(1.000đ)"
                        invalid={isInvalidValue(triedSubmit, chiPhiLuong, true)}
                        errorMsg={getErrorMsg(
                          triedSubmit,
                          chiPhiLuong,
                          "Chi phí trả lương trong thời gian điều trị",
                          true,
                        )}
                      />
                      <InputField
                        label="Chi phí bồi thường trợ cấp"
                        value={chiPhiBTTC}
                        onChange={(v) =>
                          updateFieldAndPhanLoai(
                            setChiPhiBTTC,
                            11,
                            formatNumberString(v),
                          )
                        }
                        required
                        suffix="(1.000đ)"
                        invalid={isInvalidValue(triedSubmit, chiPhiBTTC, true)}
                        errorMsg={getErrorMsg(
                          triedSubmit,
                          chiPhiBTTC,
                          "Chi phí bồi thường trợ cấp",
                          true,
                        )}
                      />
                      <InputField
                        label="Tổng số tiền chi phí"
                        disabled
                        value={formatNumberString(
                          String(
                            (Number(chiPhiYTe?.replace(/\./g, "")) || 0) +
                              (Number(chiPhiLuong?.replace(/\./g, "")) || 0) +
                              (Number(chiPhiBTTC?.replace(/\./g, "")) || 0),
                          ),
                        )}
                        onChange={(v) =>
                          updateFieldAndPhanLoai(
                            setTongChiPhi,
                            8,
                            formatNumberString(v),
                          )
                        }
                        required
                        suffix="(1.000đ)"
                        invalid={isInvalidValue(triedSubmit, tongChiPhi, true)}
                        errorMsg={getErrorMsg(
                          triedSubmit,
                          tongChiPhi,
                          "Tổng số tiền chi phí",
                          true,
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <InputField
                        label="Tổng số ngày nghỉ vì TNLĐ"
                        value={soNgayNghi}
                        onChange={(v) =>
                          updateFieldAndPhanLoai(setSoNgayNghi, 7, v)
                        }
                        required
                        invalid={isInvalidValue(triedSubmit, soNgayNghi, true)}
                        errorMsg={getErrorMsg(
                          triedSubmit,
                          soNgayNghi,
                          "Tổng số ngày nghỉ vì TNLĐ",
                          true,
                        )}
                      />
                      <InputField
                        label="Thiệt hại tài sản"
                        value={thiHaiTaiSan}
                        onChange={(v) =>
                          updateFieldAndPhanLoai(
                            setThiHaiTaiSan,
                            12,
                            formatNumberString(v),
                          )
                        }
                        suffix="(1.000đ)"
                        invalid={isInvalidValue(
                          triedSubmit,
                          thiHaiTaiSan,
                          false,
                        )}
                        errorMsg={getErrorMsg(
                          triedSubmit,
                          thiHaiTaiSan,
                          "Thiệt hại tài sản",
                          false,
                        )}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg border border-line p-6 bg-white shadow-sm">
                      <div className="mb-4 text-[13px] font-bold text-ink uppercase tracking-wide">
                        **** Doanh nghiệp xảy ra tai nạn lao động vui lòng nhập
                        theo từng bước
                      </div>

                      {accidentDetails.length === 0 ? (
                        <div className="mb-4 rounded-md border border-dashed border-[#d1d5db] bg-[#f9fafb] py-8 text-center text-[13.5px] text-muted">
                          Chưa có vụ tai nạn nào. Nhập &quot;Tổng số vụ&quot; ở
                          tab (1) để tự động tạo chi tiết, hoặc nhấn &quot;Thêm
                          vụ&quot; bên dưới.
                        </div>
                      ) : (
                        accidentDetails.map((d, idx) => {
                          const isExpanded = expandedIds[d.id] !== false;
                          const toggleExpand = () => {
                            setExpandedIds((prev) => ({
                              ...prev,
                              [d.id]: !isExpanded,
                            }));
                          };

                          const nan = parseNum(d.soNguoiBiNan);
                          const nu = parseNum(d.soLDNu);
                          const chet = parseNum(d.soNguoiBiChet);
                          const thuong = parseNum(d.soNguoiBiThuongNang);
                          const nanKQL = parseNum(d.nanKhongQL);
                          const nuKQL = parseNum(d.nuKhongQL);
                          const chetKQL = parseNum(d.chetKhongQL);
                          const thuongKQL = parseNum(d.thuongKhongQL);

                          const isNuGreater = nan < nu;
                          const isChetGreater = nan < chet;
                          const isThuongGreater = nan < thuong;
                          const isNuKQLGreater = nanKQL < nuKQL;
                          const isChetKQLGreater = nanKQL < chetKQL;
                          const isThuongKQLGreater = nanKQL < thuongKQL;

                          return (
                            <div
                              key={d.id}
                              className="mb-4 rounded-lg border border-line p-5 bg-white"
                            >
                              <div
                                className="flex items-center justify-between border-b border-dashed border-[#e5e7eb] pb-3 mb-4 cursor-pointer"
                                onClick={toggleExpand}
                              >
                                <div className="flex items-center gap-2">
                                  <svg
                                    className={`w-4 h-4 text-ink transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                                    />
                                  </svg>
                                  <span className="text-[14px] font-semibold text-ink">
                                    Chi tiết vụ tai nạn số {idx + 1}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeDetail(d.id);
                                  }}
                                  className="text-muted hover:text-danger text-xs font-medium"
                                >
                                  Xoá vụ
                                </button>
                              </div>

                              {isExpanded && (
                                <div className="mt-3">
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="flex flex-col gap-1.5">
                                      <label className="text-[13px] font-medium text-ink">
                                        1. Phân theo nguyên nhân xảy ra TNLĐ
                                      </label>
                                      <select
                                        className={SC}
                                        value={d.nguyenNhan}
                                        onChange={(e) =>
                                          updateDetail(
                                            d.id,
                                            "nguyenNhan",
                                            e.target.value,
                                          )
                                        }
                                      >
                                        {CAUSE_OPTIONS.map((opt) => (
                                          <option key={opt} value={opt}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      <label className="text-[13px] font-medium text-ink">
                                        2. Phân theo yếu tố gây chấn thương
                                      </label>
                                      <select
                                        className={SC}
                                        value={
                                          standardFactors.includes(d.yeuTo)
                                            ? d.yeuTo
                                            : "Khác"
                                        }
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "Khác") {
                                            updateDetail(d.id, "yeuTo", "Khác");
                                          } else {
                                            updateDetail(d.id, "yeuTo", val);
                                          }
                                        }}
                                      >
                                        {FACTOR_OPTIONS.map((opt) => (
                                          <option key={opt} value={opt}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                      {(!standardFactors.includes(d.yeuTo) ||
                                        d.yeuTo === "Khác") && (
                                        <div className="mt-1">
                                          <InputField
                                            label="Yếu tố chấn thương khác (ghi cụ thể)"
                                            value={
                                              d.yeuTo === "Khác" ? "" : d.yeuTo
                                            }
                                            onChange={(v) =>
                                              updateDetail(d.id, "yeuTo", v)
                                            }
                                            required
                                            type="text"
                                            invalid={isInvalidValue(
                                              triedSubmit,
                                              d.yeuTo === "Khác" ? "" : d.yeuTo,
                                              true,
                                            )}
                                            errorMsg={getErrorMsg(
                                              triedSubmit,
                                              d.yeuTo === "Khác" ? "" : d.yeuTo,
                                              "Yếu tố chấn thương khác",
                                              true,
                                            )}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 mb-5">
                                    <div className="flex flex-col gap-1.5">
                                      <label className="text-[13px] font-medium text-ink">
                                        3. Phân theo nghề nghiệp
                                      </label>
                                      <select
                                        className={SC}
                                        value={
                                          standardOccupations.includes(
                                            d.ngheNghiep,
                                          )
                                            ? d.ngheNghiep
                                            : "Khác"
                                        }
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "Khác") {
                                            updateDetail(
                                              d.id,
                                              "ngheNghiep",
                                              "Khác",
                                            );
                                          } else {
                                            updateDetail(
                                              d.id,
                                              "ngheNghiep",
                                              val,
                                            );
                                          }
                                        }}
                                      >
                                        {OCCUPATION_OPTIONS.map((opt) => (
                                          <option key={opt} value={opt}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                      {(!standardOccupations.includes(
                                        d.ngheNghiep,
                                      ) ||
                                        d.ngheNghiep === "Khác") && (
                                        <div className="mt-1">
                                          <InputField
                                            label="Nghề nghiệp khác (ghi cụ thể)"
                                            value={
                                              d.ngheNghiep === "Khác"
                                                ? ""
                                                : d.ngheNghiep
                                            }
                                            onChange={(v) =>
                                              updateDetail(
                                                d.id,
                                                "ngheNghiep",
                                                v,
                                              )
                                            }
                                            required
                                            type="text"
                                            invalid={isInvalidValue(
                                              triedSubmit,
                                              d.ngheNghiep === "Khác"
                                                ? ""
                                                : d.ngheNghiep,
                                              true,
                                            )}
                                            errorMsg={getErrorMsg(
                                              triedSubmit,
                                              d.ngheNghiep === "Khác"
                                                ? ""
                                                : d.ngheNghiep,
                                              "Nghề nghiệp khác",
                                              true,
                                            )}
                                          />
                                        </div>
                                      )}
                                    </div>
                                    <div />
                                  </div>

                                  <div className="mb-5 border-t border-dashed border-line pt-4">
                                    <div className="text-[13px] font-semibold text-ink mb-3">
                                      4. Chi tiết vụ tai nạn số {idx + 1}
                                    </div>
                                    <div className="grid grid-cols-4 gap-x-4 gap-y-5">
                                      <InputField
                                        label="Tổng số người bị nạn"
                                        value={d.soNguoiBiNan}
                                        onChange={(v) =>
                                          updateDetail(d.id, "soNguoiBiNan", v)
                                        }
                                        required
                                        invalid={isNuGreater || isChetGreater || isThuongGreater || isInvalidValue(
                                          triedSubmit,
                                          d.soNguoiBiNan,
                                          true,
                                        )}
                                        errorMsg={isNuGreater ? "Tổng số người bị nạn phải lớn hơn hoặc bằng tổng số lao động nữ bị nạn" : isChetGreater ? "Tổng số người bị nạn phải lớn hơn hoặc bằng tổng số người chết" : isThuongGreater ? "Tổng số người bị nạn phải lớn hơn hoặc bằng tổng số người bị thương nặng" : getErrorMsg(
                                          triedSubmit,
                                          d.soNguoiBiNan,
                                          "Tổng số người bị nạn",
                                          true,
                                        )}
                                      />
                                      <InputField
                                        label="Tổng số lao động nữ bị nạn"
                                        value={d.soLDNu}
                                        onChange={(v) =>
                                          updateDetail(d.id, "soLDNu", v)
                                        }
                                        required
                                        invalid={isNuGreater || isInvalidValue(
                                          triedSubmit,
                                          d.soLDNu,
                                          true,
                                        )}
                                        errorMsg={isNuGreater ? "Tổng số lao động nữ bị nạn phải nhỏ hơn hoặc bằng tổng số người bị nạn" : getErrorMsg(
                                          triedSubmit,
                                          d.soLDNu,
                                          "Tổng số lao động nữ bị nạn",
                                          true,
                                        )}
                                      />
                                      <InputField
                                        label="Tổng số người chết"
                                        value={d.soNguoiBiChet}
                                        onChange={(v) =>
                                          updateDetail(d.id, "soNguoiBiChet", v)
                                        }
                                        required
                                        invalid={isChetGreater || isInvalidValue(
                                          triedSubmit,
                                          d.soNguoiBiChet,
                                          true,
                                        )}
                                        errorMsg={isChetGreater ? "Tổng số người chết phải nhỏ hơn hoặc bằng tổng số người bị nạn" : getErrorMsg(
                                          triedSubmit,
                                          d.soNguoiBiChet,
                                          "Tổng số người chết",
                                          true,
                                        )}
                                      />
                                      <InputField
                                        label="Tổng số người bị thương nặng"
                                        value={d.soNguoiBiThuongNang}
                                        onChange={(v) =>
                                          updateDetail(
                                            d.id,
                                            "soNguoiBiThuongNang",
                                            v,
                                          )
                                        }
                                        required
                                        invalid={isThuongGreater || isInvalidValue(
                                          triedSubmit,
                                          d.soNguoiBiThuongNang,
                                          true,
                                        )}
                                        errorMsg={isThuongGreater ? "Tổng số người bị thương nặng phải nhỏ hơn hoặc bằng tổng số người bị nạn" : getErrorMsg(
                                          triedSubmit,
                                          d.soNguoiBiThuongNang,
                                          "Tổng số người bị thương nặng",
                                          true,
                                        )}
                                      />

                                      <InputField
                                        label="Số người bị nạn không QL"
                                        value={d.nanKhongQL}
                                        onChange={(v) =>
                                          updateDetail(d.id, "nanKhongQL", v)
                                        }
                                        required
                                        invalid={isNuKQLGreater || isChetKQLGreater || isThuongKQLGreater || isInvalidValue(
                                          triedSubmit,
                                          d.nanKhongQL,
                                          true,
                                        )}
                                        errorMsg={isNuKQLGreater ? "Số người bị nạn không QL phải lớn hơn hoặc bằng lao động nữ bị nạn không QL" : isChetKQLGreater ? "Số người bị nạn không QL phải lớn hơn hoặc bằng số người chết không QL" : isThuongKQLGreater ? "Số người bị nạn không QL phải lớn hơn hoặc bằng người bị thương nặng không QL" : getErrorMsg(
                                          triedSubmit,
                                          d.nanKhongQL,
                                          "Số người bị nạn không QL",
                                          true,
                                        )}
                                      />
                                      <InputField
                                        label="Lao động nữ bị nạn không QL"
                                        value={d.nuKhongQL}
                                        onChange={(v) =>
                                          updateDetail(d.id, "nuKhongQL", v)
                                        }
                                        required
                                        invalid={isNuKQLGreater || isInvalidValue(
                                          triedSubmit,
                                          d.nuKhongQL,
                                          true,
                                        )}
                                        errorMsg={isNuKQLGreater ? "Lao động nữ bị nạn không QL phải nhỏ hơn hoặc bằng số người bị nạn không QL" : getErrorMsg(
                                          triedSubmit,
                                          d.nuKhongQL,
                                          "Lao động nữ bị nạn không QL",
                                          true,
                                        )}
                                      />
                                      <InputField
                                        label="Số người chết không QL"
                                        value={d.chetKhongQL}
                                        onChange={(v) =>
                                          updateDetail(d.id, "chetKhongQL", v)
                                        }
                                        required
                                        invalid={isChetKQLGreater || isInvalidValue(
                                          triedSubmit,
                                          d.chetKhongQL,
                                          true,
                                        )}
                                        errorMsg={isChetKQLGreater ? "Số người chết không QL phải nhỏ hơn hoặc bằng số người bị nạn không QL" : getErrorMsg(
                                          triedSubmit,
                                          d.chetKhongQL,
                                          "Số người chết không QL",
                                          true,
                                        )}
                                      />
                                      <InputField
                                        label="Người bị thương nặng không QL"
                                        value={d.thuongKhongQL}
                                        onChange={(v) =>
                                          updateDetail(d.id, "thuongKhongQL", v)
                                        }
                                        required
                                        invalid={isThuongKQLGreater || isInvalidValue(
                                          triedSubmit,
                                          d.thuongKhongQL,
                                          true,
                                        )}
                                        errorMsg={isThuongKQLGreater ? "Người bị thương nặng không QL phải nhỏ hơn hoặc bằng số người bị nạn không QL" : getErrorMsg(
                                          triedSubmit,
                                          d.thuongKhongQL,
                                          "Người bị thương nặng không QL",
                                          true,
                                        )}
                                      />
                                    </div>
                                  </div>

                                  <div className="border-t border-dashed border-line pt-4">
                                    <div className="text-[13px] font-semibold text-ink mb-3">
                                      5. Thiệt hại do tai nạn lao động số{" "}
                                      {idx + 1}
                                    </div>
                                    <div className="grid grid-cols-4 gap-x-4 gap-y-5">
                                      <InputField
                                        label="Chi phí y tế"
                                        value={d.chiPhiYTe}
                                        onChange={(v) =>
                                          updateDetail(
                                            d.id,
                                            "chiPhiYTe",
                                            formatNumberString(v),
                                          )
                                        }
                                        required
                                        suffix="(1.000đ)"
                                        invalid={isInvalidValue(
                                          triedSubmit,
                                          d.chiPhiYTe,
                                          true,
                                        )}
                                        errorMsg={getErrorMsg(
                                          triedSubmit,
                                          d.chiPhiYTe,
                                          "Chi phí y tế",
                                          true,
                                        )}
                                      />
                                      <InputField
                                        label="Chi phí trả lương trong thời gian điều trị"
                                        value={d.chiPhiLuong}
                                        onChange={(v) =>
                                          updateDetail(
                                            d.id,
                                            "chiPhiLuong",
                                            formatNumberString(v),
                                          )
                                        }
                                        required
                                        suffix="(1.000đ)"
                                        invalid={isInvalidValue(
                                          triedSubmit,
                                          d.chiPhiLuong,
                                          true,
                                        )}
                                        errorMsg={getErrorMsg(
                                          triedSubmit,
                                          d.chiPhiLuong,
                                          "Chi phí trả lương trong thời gian điều trị",
                                          true,
                                        )}
                                      />
                                      <InputField
                                        label="Chi phí bồi thường trợ cấp"
                                        value={d.chiPhiBTTC}
                                        onChange={(v) =>
                                          updateDetail(
                                            d.id,
                                            "chiPhiBTTC",
                                            formatNumberString(v),
                                          )
                                        }
                                        required
                                        suffix="(1.000đ)"
                                        invalid={isInvalidValue(
                                          triedSubmit,
                                          d.chiPhiBTTC,
                                          true,
                                        )}
                                        errorMsg={getErrorMsg(
                                          triedSubmit,
                                          d.chiPhiBTTC,
                                          "Chi phí bồi thường trợ cấp",
                                          true,
                                        )}
                                      />
                                      <InputField
                                        label="Tổng số tiền chi phí (tự tính)"
                                        value={d.tongSoTien}
                                        disabled
                                        suffix="(1.000đ)"
                                        invalid={isInvalidValue(
                                          triedSubmit,
                                          d.tongSoTien,
                                          true,
                                        )}
                                        errorMsg={getErrorMsg(
                                          triedSubmit,
                                          d.tongSoTien,
                                          "Tổng số tiền chi phí",
                                          true,
                                        )}
                                      />

                                      <InputField
                                        label="Tổng số ngày nghỉ vì TNLĐ"
                                        value={d.soNgayNghi}
                                        onChange={(v) =>
                                          updateDetail(d.id, "soNgayNghi", v)
                                        }
                                        required
                                        invalid={isInvalidValue(
                                          triedSubmit,
                                          d.soNgayNghi,
                                          true,
                                        )}
                                        errorMsg={getErrorMsg(
                                          triedSubmit,
                                          d.soNgayNghi,
                                          "Tổng số ngày nghỉ vì TNLĐ",
                                          true,
                                        )}
                                      />
                                      <InputField
                                        label="Thiệt hại tài sản"
                                        value={d.thiethaiTaiSan}
                                        onChange={(v) =>
                                          updateDetail(
                                            d.id,
                                            "thiethaiTaiSan",
                                            formatNumberString(v),
                                          )
                                        }
                                        required
                                        suffix="(1.000đ)"
                                        invalid={isInvalidValue(
                                          triedSubmit,
                                          d.thiethaiTaiSan,
                                          true,
                                        )}
                                        errorMsg={getErrorMsg(
                                          triedSubmit,
                                          d.thiethaiTaiSan,
                                          "Thiệt hại tài sản",
                                          true,
                                        )}
                                      />
                                      <div />
                                      <div />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={addDetail}
                      className="mt-4 flex h-9 items-center gap-1.5 rounded-md border border-dashed border-primary px-4 text-[13px] font-medium text-primary hover:bg-[#eff6ff]"
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
                      Thêm vụ
                    </button>
                  </>
                )}
              </div>
            ) : section === "tnld_tc" ? (
              <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="mb-2 text-[14px] font-semibold text-ink">
                  1. Tổng số vụ tai nạn lao động & số nạn nhân tai nạn lao động
                </div>
                <div className="mb-3 grid grid-cols-4 gap-3">
                  <InputField
                    label="Tổng số vụ"
                    value={tcTongVu}
                    onChange={(val) => {
                      // 👉 THÊM DÒNG NÀY VÀO TẤT CẢ ONCHANGE CỦA CÁC INPUT THUỘC MỤC 2
                      isTcEditedByUser.current = true;

                      setTcTongVu(val);
                    }}
                    required
                    invalid={
                      isInvalidValue(triedSubmit, tcTongVu, true) ||
                      tcCrossValidations.isTcChetGreater ||
                      tcCrossValidations.isTcNhieuGreater
                    }
                    errorMsg={
                      tcCrossValidations.isTcChetGreater
                        ? "Tổng số vụ phải lớn hơn hoặc bằng số vụ có người chết"
                        : tcCrossValidations.isTcNhieuGreater
                          ? "Tổng số vụ phải lớn hơn hoặc bằng số vụ ≥ 2 người bị nạn"
                          : getErrorMsg(
                              triedSubmit,
                              tcTongVu,
                              "Tổng số vụ",
                              true,
                            )
                    }
                  />
                  <InputField
                    label="Số vụ có người chết"
                    value={tcVuChet}
                    onChange={(val) => {
                      isTcEditedByUser.current = true;
                      setTcVuChet(val);
                    }}
                    required
                    invalid={
                      isInvalidValue(triedSubmit, tcVuChet, true) ||
                      tcCrossValidations.isTcChetGreater
                    }
                    errorMsg={
                      tcCrossValidations.isTcChetGreater
                        ? "Số vụ có người chết phải nhỏ hơn hoặc bằng tổng số vụ"
                        : getErrorMsg(
                            triedSubmit,
                            tcVuChet,
                            "Số vụ có người chết",
                            true,
                          )
                    }
                  />
                  <InputField
                    label="Số vụ ≥ 2 người bị nạn"
                    value={tcVuNhieu}
                    onChange={(val) => {
                      isTcEditedByUser.current = true;
                      setTcVuNhieu(val);
                    }}
                    required
                    invalid={
                      isInvalidValue(triedSubmit, tcVuNhieu, true) ||
                      tcCrossValidations.isTcNhieuGreater
                    }
                    errorMsg={
                      tcCrossValidations.isTcNhieuGreater
                        ? "Số vụ ≥ 2 người bị nạn phải nhỏ hơn hoặc bằng tổng số vụ"
                        : getErrorMsg(
                            triedSubmit,
                            tcVuNhieu,
                            "Số vụ ≥ 2 người bị nạn",
                            true,
                          )
                    }
                  />
                  <div />
                </div>

                <div className="mb-3 grid grid-cols-4 gap-3">
                  <InputField
                    label="Tổng số người bị nạn"
                    value={tcTongNan}
                    onChange={(val) => {
                      isTcEditedByUser.current = true;
                      setTcTongNan(val);
                    }}
                    required
                    invalid={
                      isInvalidValue(triedSubmit, tcTongNan, true) ||
                      tcCrossValidations.isTcNanNuGreater ||
                      tcCrossValidations.isTcChetNNGreater ||
                      tcCrossValidations.isTcThuongNangGreater
                    }
                    errorMsg={
                      tcCrossValidations.isTcNanNuGreater
                        ? "Tổng số người bị nạn phải lớn hơn hoặc bằng tổng số lao động nữ bị nạn"
                        : tcCrossValidations.isTcChetNNGreater
                          ? "Tổng số người bị nạn phải lớn hơn hoặc bằng tổng số người bị chết"
                          : tcCrossValidations.isTcThuongNangGreater
                            ? "Tổng số người bị nạn phải lớn hơn hoặc bằng tổng số người bị thương nặng"
                            : getErrorMsg(
                                triedSubmit,
                                tcTongNan,
                                "Tổng số người bị nạn",
                                true,
                              )
                    }
                  />
                  <InputField
                    label="Tổng số lao động nữ bị nạn"
                    value={tcTongNanNu}
                    onChange={(val) => {
                      isTcEditedByUser.current = true;
                      setTcTongNanNu(val);
                    }}
                    required
                    invalid={
                      isInvalidValue(triedSubmit, tcTongNanNu, true) ||
                      tcCrossValidations.isTcNanNuGreater
                    }
                    errorMsg={
                      tcCrossValidations.isTcNanNuGreater
                        ? "Tổng số lao động nữ bị nạn phải nhỏ hơn hoặc bằng tổng số người bị nạn"
                        : getErrorMsg(
                            triedSubmit,
                            tcTongNanNu,
                            "Tổng số lao động nữ bị nạn",
                            true,
                          )
                    }
                  />
                  <InputField
                    label="Tổng số người bị chết"
                    value={tcTongChetNN}
                    onChange={(val) => {
                      isTcEditedByUser.current = true;
                      setTcTongChetNN(val);
                    }}
                    required
                    invalid={
                      isInvalidValue(triedSubmit, tcTongChetNN, true) ||
                      tcCrossValidations.isTcChetNNGreater
                    }
                    errorMsg={
                      tcCrossValidations.isTcChetNNGreater
                        ? "Tổng số người bị chết phải nhỏ hơn hoặc bằng tổng số người bị nạn"
                        : getErrorMsg(
                            triedSubmit,
                            tcTongChetNN,
                            "Tổng số người bị chết",
                            true,
                          )
                    }
                  />
                  <InputField
                    label="Tổng số người bị thương nặng"
                    value={tcTongThuongNang}
                    onChange={(val) => {
                      isTcEditedByUser.current = true;
                      setTcTongThuongNang(val);
                    }}
                    required
                    invalid={
                      isInvalidValue(triedSubmit, tcTongThuongNang, true) ||
                      tcCrossValidations.isTcThuongNangGreater
                    }
                    errorMsg={
                      tcCrossValidations.isTcThuongNangGreater
                        ? "Tổng số người bị thương nặng phải nhỏ hơn hoặc bằng tổng số người bị nạn"
                        : getErrorMsg(
                            triedSubmit,
                            tcTongThuongNang,
                            "Tổng số người bị thương nặng",
                            true,
                          )
                    }
                  />
                </div>

                <div className="mb-5 grid grid-cols-4 gap-3">
                  <InputField
                    label="Số người bị nạn không QL"
                    value={tcNanKhongQL}
                    onChange={(val) => {
                      isTcEditedByUser.current = true;
                      setTcNanKhongQL(val);
                    }}
                    required
                    invalid={
                      isInvalidValue(triedSubmit, tcNanKhongQL, true) ||
                      tcCrossValidations.isTcNuKQGreater ||
                      tcCrossValidations.isTcChetKQGreater ||
                      tcCrossValidations.isTcThuongKQGreater
                    }
                    errorMsg={
                      tcCrossValidations.isTcNuKQGreater
                        ? "Số người bị nạn không QL phải lớn hơn hoặc bằng lao động nữ bị nạn không QL"
                        : tcCrossValidations.isTcChetKQGreater
                          ? "Số người bị nạn không QL phải lớn hơn hoặc bằng số người chết không QL"
                          : tcCrossValidations.isTcThuongKQGreater
                            ? "Số người bị nạn không QL phải lớn hơn hoặc bằng người bị thương nặng không QL"
                            : getErrorMsg(
                                triedSubmit,
                                tcNanKhongQL,
                                "Số người bị nạn không QL",
                                true,
                              )
                    }
                  />
                  <InputField
                    label="Lao động nữ bị nạn không QL"
                    value={tcNuKhongQL}
                    onChange={(val) => {
                      isTcEditedByUser.current = true;
                      setTcNuKhongQL(val);
                    }}
                    required
                    invalid={
                      isInvalidValue(triedSubmit, tcNuKhongQL, true) ||
                      tcCrossValidations.isTcNuKQGreater
                    }
                    errorMsg={
                      tcCrossValidations.isTcNuKQGreater
                        ? "Lao động nữ bị nạn không QL phải nhỏ hơn hoặc bằng số người bị nạn không QL"
                        : getErrorMsg(
                            triedSubmit,
                            tcNuKhongQL,
                            "Lao động nữ bị nạn không QL",
                            true,
                          )
                    }
                  />
                  <InputField
                    label="Số người chết không QL"
                    value={tcChetKhongQL}
                    onChange={(val) => {
                      isTcEditedByUser.current = true;
                      setTcChetKhongQL(val);
                    }}
                    required
                    invalid={
                      isInvalidValue(triedSubmit, tcChetKhongQL, true) ||
                      tcCrossValidations.isTcChetKQGreater
                    }
                    errorMsg={
                      tcCrossValidations.isTcChetKQGreater
                        ? "Số người chết không QL phải nhỏ hơn hoặc bằng số người bị nạn không QL"
                        : getErrorMsg(
                            triedSubmit,
                            tcChetKhongQL,
                            "Số người chết không QL",
                            true,
                          )
                    }
                  />
                  <InputField
                    label="Người bị thương nặng không QL"
                    value={tcThuongKhongQL}
                    onChange={(val) => {
                      isTcEditedByUser.current = true;
                      setTcThuongKhongQL(val);
                    }}
                    required
                    invalid={
                      isInvalidValue(triedSubmit, tcThuongKhongQL, true) ||
                      tcCrossValidations.isTcThuongKQGreater
                    }
                    errorMsg={
                      tcCrossValidations.isTcThuongKQGreater
                        ? "Người bị thương nặng không QL phải nhỏ hơn hoặc bằng số người bị nạn không QL"
                        : getErrorMsg(
                            triedSubmit,
                            tcThuongKhongQL,
                            "Người bị thương nặng không QL",
                            true,
                          )
                    }
                  />
                </div>

                <div className="mb-2 text-[14px] font-semibold text-ink">
                  2. Thiệt hại do tai nạn lao động
                </div>

                <div className="mb-3 grid grid-cols-4 gap-3">
                  <InputField
                    label="Chi phí y tế"
                    value={tcChiPhiYTe}
                    onChange={(v) => {
                      isTcEditedByUser.current = true;
                      setTcChiPhiYTe(formatNumberString(v));
                    }}
                    required
                    suffix="(1.000đ)"
                    invalid={isInvalidValue(triedSubmit, tcChiPhiYTe, true)}
                    errorMsg={getErrorMsg(
                      triedSubmit,
                      tcChiPhiYTe,
                      "Chi phí y tế",
                      true,
                    )}
                  />
                  <InputField
                    label="Chi phí trả lương trong thời gian điều trị"
                    value={tcChiPhiLuong}
                    onChange={(v) => {
                      isTcEditedByUser.current = true;
                      setTcChiPhiLuong(formatNumberString(v));
                    }}
                    required
                    suffix="(1.000đ)"
                    invalid={isInvalidValue(triedSubmit, tcChiPhiLuong, true)}
                    errorMsg={getErrorMsg(
                      triedSubmit,
                      tcChiPhiLuong,
                      "Chi phí trả lương trong thời gian điều trị",
                      true,
                    )}
                  />
                  <InputField
                    label="Chi phí bồi thường trợ cấp"
                    value={tcChiPhiBTTC}
                    onChange={(v) => {
                      isTcEditedByUser.current = true;
                      setTcChiPhiBTTC(formatNumberString(v));
                    }}
                    required
                    suffix="(1.000đ)"
                    invalid={isInvalidValue(triedSubmit, tcChiPhiBTTC, true)}
                    errorMsg={getErrorMsg(
                      triedSubmit,
                      tcChiPhiBTTC,
                      "Chi phí bồi thường trợ cấp",
                      true,
                    )}
                  />
                  <InputField
                    label="Tổng số tiền chi phí"
                    disabled
                    value={formatNumberString(
                      String(
                        (Number(tcChiPhiYTe?.replace(/\./g, "")) || 0) +
                          (Number(tcChiPhiLuong?.replace(/\./g, "")) || 0) +
                          (Number(tcChiPhiBTTC?.replace(/\./g, "")) || 0),
                      ),
                    )}
                    onChange={(v) => setTcTongChiPhi(formatNumberString(v))}
                    required
                    suffix="(1.000đ)"
                    invalid={isInvalidValue(triedSubmit, tcTongChiPhi, true)}
                    errorMsg={getErrorMsg(
                      triedSubmit,
                      tcTongChiPhi,
                      "Tổng số tiền chi phí",
                      true,
                    )}
                  />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <InputField
                    label="Tổng số ngày nghỉ vì TNLĐ"
                    value={tcSoNgayNghi}
                    onChange={(v) => {
                      isTcEditedByUser.current = true;
                      setTcSoNgayNghi(v);
                    }}
                    required
                    invalid={isInvalidValue(triedSubmit, tcSoNgayNghi, true)}
                    errorMsg={getErrorMsg(
                      triedSubmit,
                      tcSoNgayNghi,
                      "Tổng số ngày nghỉ vì TNLĐ",
                      true,
                    )}
                  />
                  <InputField
                    label="Thiệt hại tài sản"
                    value={tcThiHaiTaiSan}
                    onChange={(v) => {
                      isTcEditedByUser.current = true;
                      setTcThiHaiTaiSan(formatNumberString(v));
                    }}
                    suffix="(1.000đ)"
                    invalid={isInvalidValue(triedSubmit, tcThiHaiTaiSan, false)}
                    errorMsg={getErrorMsg(
                      triedSubmit,
                      tcThiHaiTaiSan,
                      "Thiệt hại tài sản",
                      false,
                    )}
                  />
                </div>
              </div>
            ) : section === "phanloai" ? (
              <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="mb-1 text-[14px] font-bold text-ink">
                  3. Phân loại tai nạn lao động
                </div>
                <p className="mb-4 text-[12.5px] text-muted">
                  Nhập số liệu theo từng hạng mục (để 0 nếu không có). Dữ liệu
                  này tổng hợp vào báo cáo phần II của Sở.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr>
                        <th
                          className={`${CT_TH} sticky left-0 z-10 min-w-[220px] bg-[#f9fafb] text-left`}
                        >
                          Hạng mục
                        </th>
                        {PHAN_LOAI_COLS.map((c) => (
                          <th key={c} className={`${CT_TH} min-w-[72px]`}>
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TONGHOP_II_GROUPS.map((group) => (
                        <Fragment key={group.category}>
                          <tr className="bg-[#f1f5f9]">
                            <td
                              className={`${CT_TD} text-left font-semibold`}
                              colSpan={PHAN_LOAI_COLS.length + 1}
                            >
                              {group.category}
                            </td>
                          </tr>
                          {group.items.map((item) => (
                            <tr key={item.ma}>
                              <td
                                className={`${CT_TD} sticky left-0 z-10 bg-white text-left`}
                              >
                                {item.label}
                              </td>
                              {PHAN_LOAI_COLS.map((_, col) => (
                                <td
                                  key={col}
                                  className="border border-line p-0"
                                >
                                  <input
                                    type="number"
                                    min={0}
                                    value={phanLoai[item.ma]?.[col] ?? "0"}
                                    onKeyDown={(e) => {
                                      if (
                                        ["-", "+", "e", "E", "."].includes(
                                          e.key,
                                        )
                                      ) {
                                        e.preventDefault();
                                      }
                                    }}
                                    onChange={(e) =>
                                      setPhanLoaiCell(
                                        item.ma,
                                        col,
                                        e.target.value,
                                      )
                                    }
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
                <div className="mb-1.5 text-[15px] font-bold text-ink">
                  Báo cáo tổng hợp tình hình tai nạn lao động - Kỳ báo cáo:{" "}
                  {activeReport?.ky || "6 tháng"} năm{" "}
                  {activeReport?.nam || "2023"}
                </div>
                <div className="mb-4 text-[13px] text-muted flex items-center gap-2 flex-wrap">
                  **Vui lòng đính kèm báo cáo TNLĐ có dấu mộc công ty:{" "}
                  {isReadOnly ? (
                    reportFileUrl ? (
                      <a
                        href={reportFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary font-medium hover:underline flex items-center gap-1"
                      >
                        {reportFileUrl
                          .split("/")
                          .pop()
                          ?.replace(/^[^-]+-[^-]+-/, "") || "baocaoTNLD.pdf"}
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">(chưa có)</span>
                    )
                  ) : (
                    <>
                      <input
                        type="file"
                        ref={reportFileInputRef}
                        onChange={handleReportFileChange}
                        className="hidden"
                        accept="application/pdf,image/*"
                      />
                      <button
                        type="button"
                        onClick={() => reportFileInputRef.current?.click()}
                        className="text-primary font-medium hover:underline focus:outline-none"
                      >
                        Tại đây
                      </button>
                      {reportFileUrl ? (
                        <div className="flex items-center gap-1.5 ml-2 bg-[#f3f4f6] px-2 py-0.5 rounded border border-[#e5e7eb]">
                          <a
                            href={reportFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary font-medium hover:underline text-[12px] truncate max-w-[200px]"
                            title={reportFileUrl
                              .split("/")
                              .pop()
                              ?.replace(/^[^-]+-[^-]+-/, "")}
                          >
                            {reportFileUrl
                              .split("/")
                              .pop()
                              ?.replace(/^[^-]+-[^-]+-/, "") ||
                              "baocaoTNLD.pdf"}
                          </a>
                          <button
                            type="button"
                            onClick={() => setReportFileUrl(null)}
                            className="text-red-500 hover:text-red-700 text-[14px] font-bold leading-none px-1 focus:outline-none"
                            title="Xóa tệp đính kèm"
                          >
                            &times;
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic ml-1">
                          (chưa có)
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11.5px] text-[#374151]">
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
                      {overviewRows.map((row: any, idx) => {
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
                             : EMPTY_VALS.map(() => 0);
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
                             <td className={`${CT_TD} text-left`}>
                               {row.label}
                             </td>
                             <td className={CT_TD}>{row.ma || ""}</td>
                             {(vals as number[]).map((v, i) => (
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
                  <table className="w-full border-collapse text-xs text-[#374151]">
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
                          Tổng số chi phí vì TNLĐ (1.000đ)
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
                          {(
                            parseNum(soNgayNghi) + parseNum(tcSoNgayNghi)
                          ).toLocaleString("vi-VN")}
                        </td>
                        <td className={CT_TD}>
                          {(
                            parseNum(tongChiPhi) + parseNum(tcTongChiPhi)
                          ).toLocaleString("vi-VN")}
                        </td>
                        <td className={CT_TD}>
                          {(
                            parseNum(chiPhiYTe) + parseNum(tcChiPhiYTe)
                          ).toLocaleString("vi-VN")}
                        </td>
                        <td className={CT_TD}>
                          {(
                            parseNum(chiPhiLuong) + parseNum(tcChiPhiLuong)
                          ).toLocaleString("vi-VN")}
                        </td>
                        <td className={CT_TD}>
                          {(
                            parseNum(chiPhiBTTC) + parseNum(tcChiPhiBTTC)
                          ).toLocaleString("vi-VN")}
                        </td>
                        <td className={CT_TD}>
                          {(
                            parseNum(thiHaiTaiSan) + parseNum(tcThiHaiTaiSan)
                          ).toLocaleString("vi-VN")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        open={createModalOpen}
        title="Thêm mới báo cáo định kỳ"
        onClose={() => setCreateModalOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              disabled={creating}
              className="h-9 rounded-md border border-line px-[18px] text-[13.5px] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={confirmCreateReport}
              disabled={creating || isAlreadyCreated}
              className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Đang tạo..." : "Bắt đầu khai báo"}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-[#374151]">
              Năm báo cáo <span className="text-danger">*</span>
            </label>
            <select
              className={SC}
              value={createYear}
              onChange={(e) => setCreateYear(e.target.value)}
            >
              {(() => {
                const maxYear = new Date().getFullYear();
                const years = [];
                for (let y = maxYear; y >= 2022; y--) {
                  years.push(String(y));
                }
                return years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ));
              })()}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-[#374151]">
              Kỳ báo cáo <span className="text-danger">*</span>
            </label>
            <select
              className={SC}
              value={createKy}
              onChange={(e) => setCreateKy(e.target.value)}
            >
              <option value="6 tháng">6 tháng</option>
              <option value="Cả năm">Cả năm</option>
            </select>
          </div>

          {isAlreadyCreated && (
            <p className="text-[12.5px] text-danger font-medium">
              Bạn đã tạo báo cáo cho năm {createYear} ({createKy}) rồi.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={timelineOpen}
        title="Tiến độ xử lý"
        onClose={() => setTimelineOpen(false)}
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setTimelineOpen(false)}
              className="h-9 rounded-md border border-line px-5 text-[13.5px] text-[#374151] hover:bg-[#f9fafb]"
            >
              Đóng
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-0">
          {(() => {
            // ← THAY TOÀN BỘ ĐOẠN NÀY
            const events: {
              time: string | null | undefined;
              actor: string;
              action: string;
              isRed?: boolean;
              isGreen?: boolean;
            }[] = [];

            if (timelineReport?.rejectedAt) {
              events.push({
                time: timelineReport.rejectedAt,
                actor: timelineReport.rejectedBy ?? "Cơ quan quản lý",
                action: `đã từ chối báo cáo${
                  timelineReport.rejectionReason
                    ? ` — Lý do: ${timelineReport.rejectionReason}`
                    : ""
                }`,
                isRed: true,
              });
            }

            if (timelineReport?.acceptedAt) {
              events.push({
                time: timelineReport.acceptedAt,
                actor: timelineReport.acceptedBy ?? "Cơ quan quản lý",
                action: "đã tiếp nhận báo cáo",
                isGreen: true,
              });
            }

            if (timelineReport?.submittedAt) {
              events.push({
                time: timelineReport.submittedAt,
                actor: timelineReport.ten,
                action: "đã gửi báo cáo",
              });
            }

            if (timelineReport?.createdAt) {
              events.push({
                time: timelineReport.createdAt,
                actor: timelineReport.ten,
                action: "đã tạo bản nháp báo cáo",
              });
            }

            return events.map((ev, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`mt-1 h-3 w-3 rounded-full border-2 bg-white ${
                      ev.isRed
                        ? "border-[#ef4444]"
                        : ev.isGreen
                          ? "border-[#22c55e]"
                          : "border-[#d1d5db]"
                    }`}
                  />
                  {idx < events.length - 1 && (
                    <div className="w-px flex-1 bg-[#e5e7eb]" />
                  )}
                </div>
                <div className="pb-5">
                  <p className="text-[12px] text-muted">
                    {formatTime(ev.time)}
                  </p>
                  <p className="mt-0.5 text-[13.5px] text-ink">
                    <span className="font-semibold">{ev.actor}</span>{" "}
                    <span className="text-[#4b5563]">{ev.action}</span>
                  </p>
                </div>
              </div>
            ));
          })()}
        </div>
      </Modal>
    </>
  );
}
