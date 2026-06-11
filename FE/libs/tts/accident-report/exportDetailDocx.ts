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
import { DETAIL_REPORT_ROWS } from "./accidentReportData";

type VMerge = (typeof VerticalMergeType)[keyof typeof VerticalMergeType];

const B = { style: BorderStyle.SINGLE, size: 4, color: "000000" } as const;
const ALL_BORDERS = { top: B, bottom: B, left: B, right: B };
const FILL_HEADER = "bdd7ee";
const FILL_SECTION = "f2f2f2";
const FILL_CAT = "e2efda";

function p(text: string, bold = false, center = true, indentLeft = 0): Paragraph {
  return new Paragraph({
    alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    indent: indentLeft > 0 ? { left: indentLeft } : undefined,
    children: [new TextRun({ text, bold, size: 18, font: "Times New Roman" })],
  });
}

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

function vCont(): TableCell {
  return new TableCell({
    verticalMerge: VerticalMergeType.CONTINUE,
    borders: ALL_BORDERS,
    children: [new Paragraph({})],
  });
}

function dCell(text: string, bold = false, left = false, indentLeft = 0): TableCell {
  return new TableCell({
    borders: ALL_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    children: [p(text, bold, !left, indentLeft)],
  });
}

// ─── Bảng I – Phân loại TNLĐ theo mức độ thương tật ─────────────────────────
// 13 columns:
// 0  Tên chỉ tiêu thống kê (rs=4)
// 1  Mã số (rs=4)
// 2  Số vụ – Tổng số (rs=2)
// 3  Số vụ – Có người chết (rs=2)
// 4  Số vụ – Từ 2 người bị nạn (rs=2)
// 5  Người bị nạn Tổng – Tổng số
// 6  Người bị nạn Tổng – NN không QL
// 7  LĐ nữ – Tổng số
// 8  LĐ nữ – NN không QL
// 9  Người bị chết – Tổng số
// 10 Người bị chết – NN không QL
// 11 Người bị thương nặng – Tổng số
// 12 Người bị thương nặng – NN không QL
function buildTable1(): Table {
  const r1 = new TableRow({
    tableHeader: true,
    children: [
      hCell("Tên chỉ tiêu thống kê", { vMerge: VerticalMergeType.RESTART }),
      hCell("Mã số", { vMerge: VerticalMergeType.RESTART }),
      hCell("Phân loại TNLĐ theo mức độ thương tật", { colSpan: 11 }),
    ],
  });
  const r2 = new TableRow({
    tableHeader: true,
    children: [
      vCont(), vCont(),
      hCell("Số vụ (Vụ)", { colSpan: 3 }),
      hCell("Số người bị nạn (Người)", { colSpan: 8 }),
    ],
  });
  const r3 = new TableRow({
    tableHeader: true,
    children: [
      vCont(), vCont(),
      hCell("Tổng số", { vMerge: VerticalMergeType.RESTART }),
      hCell("Số vụ có người chết", { vMerge: VerticalMergeType.RESTART }),
      hCell("Số vụ có từ 2 người bị nạn trở lên", { vMerge: VerticalMergeType.RESTART }),
      hCell("Tổng số", { colSpan: 2 }),
      hCell("Số LĐ nữ", { colSpan: 2 }),
      hCell("Số người bị chết", { colSpan: 2 }),
      hCell("Số người bị thương nặng", { colSpan: 2 }),
    ],
  });
  const r4 = new TableRow({
    tableHeader: true,
    children: [
      vCont(), vCont(),
      vCont(), vCont(), vCont(),
      hCell("Tổng số"),
      hCell("NN không thuộc quyền quản lý"),
      hCell("Tổng số"),
      hCell("NN không thuộc quyền quản lý"),
      hCell("Tổng số"),
      hCell("NN không thuộc quyền quản lý"),
      hCell("Tổng số"),
      hCell("NN không thuộc quyền quản lý"),
    ],
  });

  const dataRows = DETAIL_REPORT_ROWS.map((row) => {
    if (row.kind === "sub") {
      return new TableRow({
        children: [
          new TableCell({
            columnSpan: 13,
            borders: ALL_BORDERS,
            shading: row.bold ? { fill: FILL_CAT } : undefined,
            children: [p(row.label, row.bold, false, row.bold ? 0 : 200)],
          }),
        ],
      });
    }

    const vals = row.vals && row.vals.length > 0 ? row.vals : Array(11).fill(0);
    const v = (i: number) => (vals[i] !== undefined && vals[i] !== 0 ? String(vals[i]) : "");

    if (row.kind === "section") {
      return new TableRow({
        children: [
          new TableCell({
            borders: ALL_BORDERS,
            shading: { fill: FILL_SECTION },
            children: [p(row.label, true, false)],
          }),
          dCell("", true),
          ...Array.from({ length: 11 }, (_, i) => {
            const val = v(i);
            return new TableCell({
              borders: ALL_BORDERS,
              shading: { fill: FILL_SECTION },
              verticalAlign: VerticalAlign.CENTER,
              children: [p(val, true)],
            });
          }),
        ],
      });
    }

    return new TableRow({
      children: [
        dCell(row.label, false, true, 200),
        dCell(row.ma ?? ""),
        ...Array.from({ length: 11 }, (_, i) => dCell(v(i))),
      ],
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [r1, r2, r3, r4, ...dataRows],
  });
}

// ─── Bảng II – Thiệt hại do tai nạn lao động ─────────────────────────────────
// 6 columns:
// 0  Tổng số ngày nghỉ (rs=3)
// 1  Tổng số tiền chi phí – Tổng (rs=2)
// 2  Chi phí cụ thể – Y tế
// 3  Chi phí cụ thể – Trả lương
// 4  Chi phí cụ thể – Bồi thường
// 5  Thiệt hại tài sản (rs=3)
function buildTable2(): Table {
  const r1 = new TableRow({
    tableHeader: true,
    children: [
      hCell("Tổng số ngày nghỉ vì tai nạn lao động (kể cả ngày nghỉ chế độ)", { vMerge: VerticalMergeType.RESTART }),
      hCell("Tổng số ngày nghỉ vì TNLĐ (1.000đ)", { colSpan: 4 }),
      hCell("Thiệt hại tài sản (1.000đ)", { vMerge: VerticalMergeType.RESTART }),
    ],
  });
  const r2 = new TableRow({
    tableHeader: true,
    children: [
      vCont(),
      hCell("Tổng số", { vMerge: VerticalMergeType.RESTART }),
      hCell("Khoảng chi cụ thể của cơ sở", { colSpan: 3 }),
      vCont(),
    ],
  });
  const r3 = new TableRow({
    tableHeader: true,
    children: [
      vCont(),
      vCont(),
      hCell("Y tế"),
      hCell("Trả lương trong thời gian điều trị"),
      hCell("Bồi thường trợ cấp"),
      vCont(),
    ],
  });
  const dataRow = new TableRow({
    children: [
      dCell("20"),
      dCell("6.000.000"),
      dCell("2.000.000"),
      dCell("2.000.000"),
      dCell("2.000.000"),
      dCell("20.000.000"),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [r1, r2, r3, dataRow],
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function exportDetailDocx(kyBaoCao = "6 tháng năm 2023"): Promise<void> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { orientation: PageOrientation.LANDSCAPE } },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `BÁO CÁO TỔNG HỢP TÌNH HÌNH TAI NẠN LAO ĐỘNG - KỲ BÁO CÁO: ${kyBaoCao.toUpperCase()}`,
                bold: true,
                size: 26,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({ children: [] }),
          buildTable1(),
          new Paragraph({ children: [] }),
          new Paragraph({
            children: [
              new TextRun({
                text: "II. Thiệt hại do tai nạn lao động",
                bold: true,
                size: 22,
                font: "Times New Roman",
              }),
            ],
          }),
          buildTable2(),
          new Paragraph({ children: [] }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bao-cao-TNLD-${kyBaoCao.replace(/\s+/g, "-")}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
