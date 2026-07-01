import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  VerticalMergeType,
  WidthType,
} from "docx";
import { TONGHOP_I_ROWS, TONGHOP_II_GROUPS } from "./accidentReportData";
import { getInjuryFactorList } from "../category/categoryApi";
import { getBusinessSectorList } from "../business-sector/businessSectorApi";

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

export type TonghopExportStats = {
  total: RowStats;
  byLoaiHinh: RowStats[];
  phanLoai: Record<string, number[]>;
};

type RowStats = {
  coSoTongSo: number;
  coSoThamGia: number;
  soLaoDong: number;
  soLDCoBaoHiem: number;
  soNguoiBiNan: number;
  soNguoiBiChet: number;
  soNguoiBiThuongNang: number;
  soVu: number;
  soVuCoNguoiChet: number;
  soVuCo2NguoiBiNan: number;
  soLDNu: number;
  soNgayNghi: number;
  tongSoTien: number;
  chiPhiYTe: number;
  chiPhiTraLuong: number;
  boiThuongTroCap: number;
  thiethaiTaiSan: number;
};

type VMerge = (typeof VerticalMergeType)[keyof typeof VerticalMergeType];

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "000000" } as const;
const ALL_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function fmtMoney(n: number): string {
  return n.toLocaleString("vi-VN");
}

function fmtRate(n: number, d: number): string {
  return d === 0 ? "0" : ((n / d) * 1000).toFixed(2);
}

// 12pt (size: 24) helper function for standard formatting
function p(text: string, bold = false, center = true, indentLeft = 0, italics = false): Paragraph {
  return new Paragraph({
    alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    indent: indentLeft > 0 ? { left: indentLeft } : undefined,
    spacing: { before: 60, after: 60, line: 240, lineRule: "auto" },
    children: [new TextRun({ text, bold, italics, size: 24, font: "Times New Roman" })],
  });
}

// Header cell – white background, centered, bold, 12pt
function hCell(text: string, opts: { colSpan?: number; vMerge?: VMerge; width?: number } = {}): TableCell {
  return new TableCell({
    columnSpan: opts.colSpan,
    verticalMerge: opts.vMerge,
    borders: ALL_BORDERS,
    shading: { fill: "FFFFFF" },
    verticalAlign: VerticalAlign.CENTER,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    children: [p(text, true)],
  });
}

// Vertical-merge continuation placeholder
function vCont(): TableCell {
  return new TableCell({
    verticalMerge: VerticalMergeType.CONTINUE,
    borders: ALL_BORDERS,
    children: [new Paragraph({})],
  });
}

// Plain data cell – white background, 12pt
function dCell(text: string, bold = false, left = false, indentLeft = 0, width?: number): TableCell {
  return new TableCell({
    borders: ALL_BORDERS,
    shading: { fill: "FFFFFF" },
    verticalAlign: VerticalAlign.CENTER,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    children: [p(text, bold, !left, indentLeft)],
  });
}

// Shaded summary / category cell – white background, 12pt
function sCell(text: string, bold = false, colSpan?: number, left = true, width?: number): TableCell {
  return new TableCell({
    columnSpan: colSpan,
    borders: ALL_BORDERS,
    shading: { fill: "FFFFFF" },
    verticalAlign: VerticalAlign.CENTER,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    children: [p(text, bold, !left)],
  });
}

// ─── Section I – 12 columns (Total: 13960 dxa) ───────────────────────────────
function buildSection1Table(stats: TonghopExportStats): Table {
  const W_COL1 = 3500; // Loại hình cơ sở
  const W_COL2 = 500;  // Mã số
  const W_VAL = 950;   // Data values columns (9 columns * 950 = 8550)
  const W_COL12 = 1410; // Ghi chú

  const headerRow1 = new TableRow({
    children: [
      hCell("Loại hình cơ sở", { vMerge: VerticalMergeType.RESTART, width: W_COL1 }),
      hCell("Mã số", { vMerge: VerticalMergeType.RESTART, width: W_COL2 }),
      hCell("Cơ sở", { colSpan: 2, width: W_VAL * 2 }),
      hCell("Lực lượng lao động", { colSpan: 2, width: W_VAL * 2 }),
      hCell("Tổng số tai nạn lao động", { colSpan: 3, width: W_VAL * 3 }),
      hCell("Tần suất tai nạn lao động", { colSpan: 2, width: W_VAL * 2 }),
      hCell("Ghi chú", { vMerge: VerticalMergeType.RESTART, width: W_COL12 }),
    ],
  });

  const headerRow2 = new TableRow({
    children: [
      vCont(), vCont(),
      hCell("Tổng số", { vMerge: VerticalMergeType.RESTART, width: W_VAL }),
      hCell("Số cơ sở tham gia", { vMerge: VerticalMergeType.RESTART, width: W_VAL }),
      hCell("Tổng số lao động", { vMerge: VerticalMergeType.RESTART, width: W_VAL }),
      hCell("Số lđ có tham gia bảo hiểm", { vMerge: VerticalMergeType.RESTART, width: W_VAL }),
      hCell("Số người bị TNLĐ", { colSpan: 3, width: W_VAL * 3 }),
      hCell("KTNLĐ", { vMerge: VerticalMergeType.RESTART, width: W_VAL }),
      hCell("KCNN", { vMerge: VerticalMergeType.RESTART, width: W_VAL }),
      vCont(),
    ],
  });

  const headerRow3 = new TableRow({
    children: [
      vCont(), vCont(),
      vCont(), vCont(), vCont(), vCont(),
      hCell("Tổng số", { width: W_VAL }),
      hCell("Số người bị chết", { width: W_VAL }),
      hCell("Số người bị thương nặng", { width: W_VAL }),
      vCont(), vCont(),
      vCont(),
    ],
  });

  const totalRow = new TableRow({
    children: [
      sCell("Tổng số", true, undefined, true, W_COL1),
      sCell("", false, undefined, true, W_COL2),
      sCell(String(stats.total.coSoTongSo), true, undefined, false, W_VAL),
      sCell(String(stats.total.coSoThamGia), true, undefined, false, W_VAL),
      sCell(String(stats.total.soLaoDong), true, undefined, false, W_VAL),
      sCell(String(stats.total.soLDCoBaoHiem), true, undefined, false, W_VAL),
      sCell(String(stats.total.soNguoiBiNan), true, undefined, false, W_VAL),
      sCell(String(stats.total.soNguoiBiChet), true, undefined, false, W_VAL),
      sCell(String(stats.total.soNguoiBiThuongNang), true, undefined, false, W_VAL),
      sCell(fmtRate(stats.total.soNguoiBiNan, stats.total.soLaoDong), true, undefined, false, W_VAL),
      sCell(fmtRate(stats.total.soNguoiBiChet, stats.total.soLaoDong), true, undefined, false, W_VAL),
      sCell("", false, undefined, false, W_COL12),
    ],
  });

  const loaiHinhRows = TONGHOP_I_ROWS.map((name, i) => {
    const row = stats.byLoaiHinh[i];
    const v = (n: number) => String(n ?? 0);
    const r = (n: number, d: number) => fmtRate(n ?? 0, d ?? 0);
    return new TableRow({
      children: [
        dCell(name, false, true, 200, W_COL1),
        dCell("", false, false, 0, W_COL2),
        dCell(v(row.coSoTongSo), false, false, 0, W_VAL),
        dCell(v(row.coSoThamGia), false, false, 0, W_VAL),
        dCell(v(row.soLaoDong), false, false, 0, W_VAL),
        dCell(v(row.soLDCoBaoHiem), false, false, 0, W_VAL),
        dCell(v(row.soNguoiBiNan), false, false, 0, W_VAL),
        dCell(v(row.soNguoiBiChet), false, false, 0, W_VAL),
        dCell(v(row.soNguoiBiThuongNang), false, false, 0, W_VAL),
        dCell(r(row.soNguoiBiNan, row.soLaoDong), false, false, 0, W_VAL),
        dCell(r(row.soNguoiBiChet, row.soLaoDong), false, false, 0, W_VAL),
        dCell("", false, false, 0, W_COL12),
      ],
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: {
      top: 100,
      bottom: 100,
      left: 150,
      right: 150,
    },
    rows: [headerRow1, headerRow2, headerRow3, totalRow, ...loaiHinhRows],
  });
}

// ─── Section II – 15 columns (Total: 13960 dxa) ──────────────────────────────
function buildSection2Table(
  stats: TonghopExportStats,
  dbSectors: { ten: string; ma: string }[],
  dbFactors: { ten: string; ma: string }[],
): Table {
  const W_COL1 = 3580;
  const W_COL2 = 500;
  const W_VAL = 760; // (760 * 13 = 9880)

  const headerRow1 = new TableRow({
    children: [
      hCell("Tên chỉ tiêu thống kê", { vMerge: VerticalMergeType.RESTART, width: W_COL1 }),
      hCell("Mã số", { vMerge: VerticalMergeType.RESTART, width: W_COL2 }),
      hCell("Phân loại TNLĐ theo mức độ thương tật", { colSpan: 7, width: W_VAL * 7 }),
      hCell("Theo mức độ thương tật", { colSpan: 6, width: W_VAL * 6 }),
    ],
  });

  const headerRow2 = new TableRow({
    children: [
      vCont(), vCont(),
      hCell("Số vụ TNLĐ", { colSpan: 3, width: W_VAL * 3 }),
      hCell("Số người bị nạn (Người)", { colSpan: 4, width: W_VAL * 4 }),
      hCell("Tổng số ngày nghỉ vì TNLĐ", { vMerge: VerticalMergeType.RESTART, width: W_VAL }),
      hCell("Tổng số tiền (1.000đ)", { vMerge: VerticalMergeType.RESTART, width: W_VAL }),
      hCell("Khoản chi cụ thể (1.000đ)", { colSpan: 3, width: W_VAL * 3 }),
      hCell("Thiệt hại tài sản (1.000đ)", { vMerge: VerticalMergeType.RESTART, width: W_VAL }),
    ],
  });

  const headerRow3 = new TableRow({
    children: [
      vCont(), vCont(),
      hCell("Tổng số", { width: W_VAL }),
      hCell("Số vụ có người chết", { width: W_VAL }),
      hCell("Số vụ có từ 2 người bị nạn trở lên", { width: W_VAL }),
      hCell("Tổng số", { width: W_VAL }),
      hCell("Số LĐ nữ", { width: W_VAL }),
      hCell("Số người bị chết", { width: W_VAL }),
      hCell("Số người bị thương nặng", { width: W_VAL }),
      vCont(), vCont(),
      hCell("Y Tế", { width: W_VAL }),
      hCell("Trả lương theo thời gian điều trị", { width: W_VAL }),
      hCell("Bồi thường/ Trợ cấp", { width: W_VAL }),
      vCont(),
    ],
  });

  const t = stats.total;
  const totalRow = new TableRow({
    children: [
      sCell("Tổng số", true, undefined, true, W_COL1),
      sCell("", false, undefined, true, W_COL2),
      sCell(String(t.soVu), true, undefined, false, W_VAL),
      sCell(String(t.soVuCoNguoiChet), true, undefined, false, W_VAL),
      sCell(String(t.soVuCo2NguoiBiNan), true, undefined, false, W_VAL),
      sCell(String(t.soNguoiBiNan), true, undefined, false, W_VAL),
      sCell(String(t.soLDNu), true, undefined, false, W_VAL),
      sCell(String(t.soNguoiBiChet), true, undefined, false, W_VAL),
      sCell(String(t.soNguoiBiThuongNang), true, undefined, false, W_VAL),
      sCell(String(t.soNgayNghi), true, undefined, false, W_VAL),
      sCell(fmtMoney(t.tongSoTien), true, undefined, false, W_VAL),
      sCell(fmtMoney(t.chiPhiYTe), true, undefined, false, W_VAL),
      sCell(fmtMoney(t.chiPhiTraLuong), true, undefined, false, W_VAL),
      sCell(fmtMoney(t.boiThuongTroCap), true, undefined, false, W_VAL),
      sCell(fmtMoney(t.thiethaiTaiSan), true, undefined, false, W_VAL),
    ],
  });

  const rows: TableRow[] = [headerRow1, headerRow2, headerRow3, totalRow];

  for (const group of TONGHOP_II_GROUPS) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 15,
            borders: ALL_BORDERS,
            shading: { fill: "FFFFFF" },
            verticalAlign: VerticalAlign.CENTER,
            width: { size: W_COL1 + W_COL2 + W_VAL * 13, type: WidthType.DXA },
            children: [p(group.category, true, false)],
          }),
        ],
      }),
    );
    for (const item of group.items) {
      const rowVals = stats.phanLoai?.[item.ma];
      const displayVals = rowVals ?? Array(13).fill(0);
      const v = (i: number) => {
        const val = displayVals[i];
        return String(val ?? 0);
      };

      let displayMa = item.ma;
      if (group.category === "Phân theo ngành nghề") {
        displayMa = matchCategoryCode(dbSectors, item.label, "sector") || item.ma;
      } else if (group.category === "Phân theo yếu tố gây chấn thương") {
        displayMa = matchCategoryCode(dbFactors, item.label, "factor") || item.ma;
      }

      rows.push(
        new TableRow({
          children: [
            dCell(item.label, false, true, 200, W_COL1),
            dCell(displayMa, false, false, 0, W_COL2),
            ...Array.from({ length: 13 }, (_, i) => dCell(v(i), false, false, 0, W_VAL)),
          ],
        }),
      );
    }
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: {
      top: 100,
      bottom: 100,
      left: 150,
      right: 150,
    },
    rows,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function exportTonghopDocx(stats: TonghopExportStats): Promise<void> {
  let dbSectors: { ten: string; ma: string }[] = [];
  let dbFactors: { ten: string; ma: string }[] = [];

  try {
    const list = await getBusinessSectorList();
    dbSectors = list.map((item) => ({
      ten: cleanName(item.ten),
      ma: item.ma,
    }));
  } catch (err) {
    console.error("Failed to load business sectors for docx", err);
  }

  try {
    const list = await getInjuryFactorList();
    dbFactors = list.filter((item) => item.active).map((item) => ({
      ten: cleanName(item.ten),
      ma: item.ma,
    }));
  } catch (err) {
    console.error("Failed to load injury factors for docx", err);
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 120 },
            children: [
              new TextRun({
                text: "BÁO CÁO TỔNG HỢP TÌNH HÌNH TAI NẠN LAO ĐỘNG",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({ children: [] }),
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({
                text: "I. Thông tin tổng quan:",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          buildSection1Table(stats),
          new Paragraph({ children: [] }),
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({
                text: "II. Phân loại TNLĐ:",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          buildSection2Table(stats, dbSectors, dbFactors),
          new Paragraph({ children: [] }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bao-cao-tong-hop-TNLD.docx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
