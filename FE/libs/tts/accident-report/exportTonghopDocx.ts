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

export type TonghopExportStats = {
  total: RowStats;
  byLoaiHinh: RowStats[];
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
const FILL_HEADER = "bdd7ee";
const FILL_TOTAL = "f2f2f2";
const FILL_CAT = "e2efda";

function fmtMoney(n: number): string {
  return n.toLocaleString("vi-VN");
}

function fmtRate(n: number, d: number): string {
  return d === 0 ? "0" : ((n / d) * 1000).toFixed(2);
}

function p(text: string, bold = false, center = true, indentLeft = 0): Paragraph {
  return new Paragraph({
    alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    indent: indentLeft > 0 ? { left: indentLeft } : undefined,
    children: [new TextRun({ text, bold, size: 16, font: "Times New Roman" })],
  });
}

// Header cell – shaded blue, centered, bold
function hCell(text: string, opts: { colSpan?: number; vMerge?: VMerge } = {}): TableCell {
  return new TableCell({
    columnSpan: opts.colSpan,
    verticalMerge: opts.vMerge,
    borders: ALL_BORDERS,
    shading: { fill: FILL_HEADER },
    verticalAlign: VerticalAlign.CENTER,
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

// Plain data cell
function dCell(text: string, bold = false, left = false, indentLeft = 0): TableCell {
  return new TableCell({
    borders: ALL_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    children: [p(text, bold, !left, indentLeft)],
  });
}

// Shaded summary / category cell
function sCell(text: string, bold = false, fill = FILL_TOTAL, colSpan?: number, left = true): TableCell {
  return new TableCell({
    columnSpan: colSpan,
    borders: ALL_BORDERS,
    shading: { fill },
    verticalAlign: VerticalAlign.CENTER,
    children: [p(text, bold, !left)],
  });
}

// ─── Section I – 12 columns ───────────────────────────────────────────────────
// 0  Loại hình cơ sở (rs=3)
// 1  Mã số (rs=3)
// 2  Cơ sở – Tổng số
// 3  Cơ sở – Số tham gia
// 4  Lực lượng – Tổng LĐ
// 5  Lực lượng – LĐ bảo hiểm
// 6  TNLĐ – Người bị nạn tổng
// 7  TNLĐ – Số chết
// 8  TNLĐ – Thương nặng
// 9  Tần suất – KTNLĐ (rs=2)
// 10 Tần suất – KCNN  (rs=2)
// 11 Ghi chú (rs=3)
function buildSection1Table(stats: TonghopExportStats): Table {
  const headerRow1 = new TableRow({
    tableHeader: true,
    children: [
      hCell("Loại hình cơ sở", { vMerge: VerticalMergeType.RESTART }),
      hCell("Mã số", { vMerge: VerticalMergeType.RESTART }),
      hCell("Cơ sở", { colSpan: 2 }),
      hCell("Lực lượng lao động", { colSpan: 2 }),
      hCell("Tổng số tai nạn lao động", { colSpan: 3 }),
      hCell("Tần suất tai nạn lao động", { colSpan: 2 }),
      hCell("Ghi chú", { vMerge: VerticalMergeType.RESTART }),
    ],
  });

  const headerRow2 = new TableRow({
    tableHeader: true,
    children: [
      vCont(), vCont(),
      hCell("Tổng số", { vMerge: VerticalMergeType.RESTART }),
      hCell("Số cơ sở tham gia", { vMerge: VerticalMergeType.RESTART }),
      hCell("Tổng số lao động", { vMerge: VerticalMergeType.RESTART }),
      hCell("Số lđ có tham gia bảo hiểm", { vMerge: VerticalMergeType.RESTART }),
      hCell("Số người bị TNLĐ", { colSpan: 3 }),
      hCell("KTNLĐ", { vMerge: VerticalMergeType.RESTART }),
      hCell("KCNN", { vMerge: VerticalMergeType.RESTART }),
      vCont(),
    ],
  });

  const headerRow3 = new TableRow({
    tableHeader: true,
    children: [
      vCont(), vCont(),
      vCont(), vCont(), vCont(), vCont(),
      hCell("Tổng số"),
      hCell("Số người bị chết"),
      hCell("Số người bị thương nặng"),
      vCont(), vCont(),
      vCont(),
    ],
  });

  const totalRow = new TableRow({
    children: [
      sCell("Tổng số", true),
      sCell(""),
      sCell(String(stats.total.coSoTongSo), true),
      sCell(String(stats.total.coSoThamGia), true),
      sCell(String(stats.total.soLaoDong), true),
      sCell(String(stats.total.soLDCoBaoHiem), true),
      sCell(String(stats.total.soNguoiBiNan), true),
      sCell(String(stats.total.soNguoiBiChet), true),
      sCell(String(stats.total.soNguoiBiThuongNang), true),
      sCell(fmtRate(stats.total.soNguoiBiNan, stats.total.soLaoDong), true),
      sCell(fmtRate(stats.total.soNguoiBiChet, stats.total.soLaoDong), true),
      sCell(""),
    ],
  });

  const loaiHinhRows = TONGHOP_I_ROWS.map((name, i) => {
    const row = stats.byLoaiHinh[i];
    const hasData = row.coSoTongSo > 0;
    const v = (n: number) => (hasData ? String(n) : "");
    const r = (n: number, d: number) => (hasData ? fmtRate(n, d) : "");
    return new TableRow({
      children: [
        dCell(name, false, true, 200),
        dCell(""),
        dCell(v(row.coSoTongSo)),
        dCell(v(row.coSoThamGia)),
        dCell(v(row.soLaoDong)),
        dCell(v(row.soLDCoBaoHiem)),
        dCell(v(row.soNguoiBiNan)),
        dCell(v(row.soNguoiBiChet)),
        dCell(v(row.soNguoiBiThuongNang)),
        dCell(r(row.soNguoiBiNan, row.soLaoDong)),
        dCell(r(row.soNguoiBiChet, row.soLaoDong)),
        dCell(""),
      ],
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow1, headerRow2, headerRow3, totalRow, ...loaiHinhRows],
  });
}

// ─── Section II – 15 columns ──────────────────────────────────────────────────
// 0  Tên chỉ tiêu (rs=3)
// 1  Mã số (rs=3)
// 2  Số vụ – Tổng
// 3  Số vụ – Người chết
// 4  Số vụ – Từ 2 người
// 5  Người bị nạn – Tổng
// 6  Người bị nạn – LĐ nữ
// 7  Người bị nạn – Chết
// 8  Người bị nạn – Thương nặng
// 9  Tổng số ngày nghỉ (rs=2)
// 10 Tổng số tiền (rs=2)
// 11 Y Tế
// 12 Trả lương điều trị
// 13 Bồi thường/Trợ cấp
// 14 Thiệt hại tài sản (rs=2)
function buildSection2Table(stats: TonghopExportStats): Table {
  const headerRow1 = new TableRow({
    tableHeader: true,
    children: [
      hCell("Tên chỉ tiêu thống kê", { vMerge: VerticalMergeType.RESTART }),
      hCell("Mã số", { vMerge: VerticalMergeType.RESTART }),
      hCell("Phân loại TNLĐ theo mức độ thương tật", { colSpan: 7 }),
      hCell("Theo mức độ thương tật", { colSpan: 6 }),
    ],
  });

  const headerRow2 = new TableRow({
    tableHeader: true,
    children: [
      vCont(), vCont(),
      hCell("Số vụ TNLĐ", { colSpan: 3 }),
      hCell("Số người bị nạn (Người)", { colSpan: 4 }),
      hCell("Tổng số ngày nghỉ vì TNLĐ", { vMerge: VerticalMergeType.RESTART }),
      hCell("Tổng số tiền (1.000đ)", { vMerge: VerticalMergeType.RESTART }),
      hCell("Khoản chi cụ thể (1.000đ)", { colSpan: 3 }),
      hCell("Thiệt hại tài sản (1.000đ)", { vMerge: VerticalMergeType.RESTART }),
    ],
  });

  const headerRow3 = new TableRow({
    tableHeader: true,
    children: [
      vCont(), vCont(),
      hCell("Tổng số"),
      hCell("Số vụ có người chết"),
      hCell("Số vụ có từ 2 người bị nạn trở lên"),
      hCell("Tổng số"),
      hCell("Số LĐ nữ"),
      hCell("Số người bị chết"),
      hCell("Số người bị thương nặng"),
      vCont(), vCont(),
      hCell("Y Tế"),
      hCell("Trả lương theo thời gian điều trị"),
      hCell("Bồi thường/ Trợ cấp"),
      vCont(),
    ],
  });

  const t = stats.total;
  const totalRow = new TableRow({
    children: [
      sCell("Tổng số", true),
      sCell(""),
      sCell(String(t.soVu), true),
      sCell(String(t.soVuCoNguoiChet), true),
      sCell(String(t.soVuCo2NguoiBiNan), true),
      sCell(String(t.soNguoiBiNan), true),
      sCell(String(t.soLDNu), true),
      sCell(String(t.soNguoiBiChet), true),
      sCell(String(t.soNguoiBiThuongNang), true),
      sCell(String(t.soNgayNghi), true),
      sCell(fmtMoney(t.tongSoTien), true),
      sCell(fmtMoney(t.chiPhiYTe), true),
      sCell(fmtMoney(t.chiPhiTraLuong), true),
      sCell(fmtMoney(t.boiThuongTroCap), true),
      sCell(fmtMoney(t.thiethaiTaiSan), true),
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
            shading: { fill: FILL_CAT },
            verticalAlign: VerticalAlign.CENTER,
            children: [p(group.category, true, false)],
          }),
        ],
      }),
    );
    for (const item of group.items) {
      rows.push(
        new TableRow({
          children: [
            dCell(item.label, false, true, 200),
            dCell(item.ma),
            ...Array.from({ length: 13 }, () => dCell("")),
          ],
        }),
      );
    }
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function exportTonghopDocx(stats: TonghopExportStats): Promise<void> {
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
            children: [
              new TextRun({
                text: "BÁO CÁO TỔNG HỢP TÌNH HÌNH TAI NẠN LAO ĐỘNG",
                bold: true,
                size: 28,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({ children: [] }),
          new Paragraph({
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
            children: [
              new TextRun({
                text: "II. Phân loại TNLĐ:",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          buildSection2Table(stats),
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
