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
import { DETAIL_REPORT_ROWS, type AccidentReport } from "./accidentReportData";
import { getInjuryFactorList, getOccupationList } from "../category/categoryApi";

const cleanName = (name: string): string => {
  return (name || "").replace(/^[–\-—\s\.\u2013\u2014]+/, "").trim();
};

type VMerge = (typeof VerticalMergeType)[keyof typeof VerticalMergeType];

const B = { style: BorderStyle.SINGLE, size: 4, color: "000000" } as const;
const ALL_BORDERS = { top: B, bottom: B, left: B, right: B };

// Clean black-and-white header cells (no colored fills)
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

// 12pt (size: 24) helper function for standard formatting
function p(text: string, bold = false, center = true, indentLeft = 0, italics = false): Paragraph {
  return new Paragraph({
    alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    indent: indentLeft > 0 ? { left: indentLeft } : undefined,
    spacing: { before: 60, after: 60, line: 240, lineRule: "auto" },
    children: [new TextRun({ text, bold, italics, size: 24, font: "Times New Roman" })],
  });
}

function vCont(): TableCell {
  return new TableCell({
    verticalMerge: VerticalMergeType.CONTINUE,
    borders: ALL_BORDERS,
    children: [new Paragraph({})],
  });
}

function dCell(text: string, bold = false, left = false, indentLeft = 0, width?: number): TableCell {
  return new TableCell({
    borders: ALL_BORDERS,
    shading: { fill: "FFFFFF" },
    verticalAlign: VerticalAlign.CENTER,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    children: [p(text, bold, !left, indentLeft)],
  });
}

function getVal(val: any): number {
  if (val === undefined || val === null || isNaN(Number(val))) return 0;
  return Number(val);
}

function fmtMoney(n: number): string {
  if (!n) return "0";
  return n.toLocaleString("vi-VN");
}

// ─── Grid Square Cells for Codes ─────────────────────────────────────────────
function buildGridCell(): TableCell {
  return new TableCell({
    width: { size: 300, type: WidthType.DXA },
    borders: ALL_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: " ", size: 24, font: "Times New Roman" })],
      }),
    ],
  });
}

function buildGrid(): Table {
  return new Table({
    alignment: AlignmentType.LEFT,
    width: { size: 1200, type: WidthType.DXA },
    borders: {
      top: B, bottom: B, left: B, right: B,
      insideHorizontal: B, insideVertical: B,
    },
    rows: [
      new TableRow({
        children: Array.from({ length: 4 }, () => buildGridCell()),
      }),
    ],
  });
}

// ─── Input Data Validation ───────────────────────────────────────────────────
export function validateAccidentReportData(report: AccidentReport): string[] {
  const errors: string[] = [];
  const rows = report.rows || {};

  const get11 = (ma: string): number[] => {
    const raw = rows[ma];
    if (!Array.isArray(raw)) return Array(11).fill(0);
    return Array(11).fill(0).map((_, i) => Number(raw[i] ?? 0));
  };

  const soLaoDong = getVal(report.soLaoDong);
  const soLDNu = rows["company_info"]?.[0] ? getVal(rows["company_info"][0]) : 0;

  if (soLDNu > soLaoDong) {
    errors.push(`Tổng số lao động nữ (${soLDNu}) không được lớn hơn tổng số lao động (${soLaoDong}).`);
  }

  const soVu = getVal(report.soVu);
  const soVuChet = getVal(report.soVuCoNguoiChet);
  const soVuNhieu = getVal(report.soVuCo2NguoiBiNan);
  const soNan = getVal(report.soNguoiBiNan);
  const soNuNan = getVal(report.soLDNu);
  const soChet = getVal(report.soNguoiBiChet);
  const soThuong = getVal(report.soNguoiBiThuongNang);

  if (soVuChet > soVu) {
    errors.push(`Mục I: Số vụ có người chết (${soVuChet}) không được lớn hơn tổng số vụ (${soVu}).`);
  }
  if (soVuNhieu > soVu) {
    errors.push(`Mục I: Số vụ có từ 2 người bị nạn trở lên (${soVuNhieu}) không được lớn hơn tổng số vụ (${soVu}).`);
  }
  if (soNuNan > soNan) {
    errors.push(`Mục I: Số LĐ nữ bị nạn (${soNuNan}) không được lớn hơn tổng số người bị nạn (${soNan}).`);
  }
  if (soChet > soNan) {
    errors.push(`Mục I: Số người bị chết (${soChet}) không được lớn hơn tổng số người bị nạn (${soNan}).`);
  }
  if (soThuong > soNan) {
    errors.push(`Mục I: Số người bị thương nặng (${soThuong}) không được lớn hơn tổng số người bị nạn (${soNan}).`);
  }

  const tcVals = get11("10");
  const tcVu = getVal(tcVals[0]);
  const tcVuChet = getVal(tcVals[1]);
  const tcVuNhieu = getVal(tcVals[2]);
  const tcNan = getVal(tcVals[3]);
  const tcNanKQL = getVal(tcVals[4]);
  const tcNu = getVal(tcVals[5]);
  const tcNuKQL = getVal(tcVals[6]);
  const tcChet = getVal(tcVals[7]);
  const tcChetKQL = getVal(tcVals[8]);
  const tcThuong = getVal(tcVals[9]);
  const tcThuongKQL = getVal(tcVals[10]);

  if (tcVuChet > tcVu) {
    errors.push(`Mục II: Số vụ có người chết (${tcVuChet}) không được lớn hơn tổng số vụ (${tcVu}).`);
  }
  if (tcVuNhieu > tcVu) {
    errors.push(`Mục II: Số vụ có từ 2 người bị nạn trở lên (${tcVuNhieu}) không được lớn hơn tổng số vụ (${tcVu}).`);
  }
  if (tcNu > tcNan) {
    errors.push(`Mục II: Số LĐ nữ bị nạn (${tcNu}) không được lớn hơn tổng số người bị nạn (${tcNan}).`);
  }
  if (tcChet > tcNan) {
    errors.push(`Mục II: Số người bị chết (${tcChet}) không được lớn hơn tổng số người bị nạn (${tcNan}).`);
  }
  if (tcThuong > tcNan) {
    errors.push(`Mục II: Số người bị thương nặng (${tcThuong}) không được lớn hơn tổng số người bị nạn (${tcNan}).`);
  }
  if (tcNuKQL > tcNuKQL) {
    errors.push(`Mục II: Số LĐ nữ bị nạn ngoài QL (${tcNuKQL}) không được lớn hơn tổng số người bị nạn ngoài QL (${tcNanKQL}).`);
  }
  if (tcChetKQL > tcNanKQL) {
    errors.push(`Mục II: Số người bị chết ngoài QL (${tcChetKQL}) không được lớn hơn tổng số người bị nạn ngoài QL (${tcNanKQL}).`);
  }
  if (tcThuongKQL > tcNanKQL) {
    errors.push(`Mục II: Số người bị thương nặng ngoài QL (${tcThuongKQL}) không được lớn hơn tổng số người bị nạn ngoài QL (${tcNanKQL}).`);
  }

  return errors;
}

// ─── Bảng I – Phân loại TNLĐ theo mức độ thương tật ─────────────────────────
function buildTable1(
  report: AccidentReport,
  dbFactors: { ten: string; ma: string }[],
  dbOccupations: { ten: string; ma: string }[],
): Table {
  // Columns widths allocation (Total: 13960 dxa)
  const W_COL1 = 4500; // Tên chỉ tiêu thống kê
  const W_COL2 = 500;  // Mã số
  const W_VAL = 860;   // Data values columns (11 columns * 860 = 9460)

  const r1 = new TableRow({
    children: [
      hCell("Tên chỉ tiêu thống kê", { vMerge: VerticalMergeType.RESTART, width: W_COL1 }),
      hCell("Mã số", { vMerge: VerticalMergeType.RESTART, width: W_COL2 }),
      hCell("Phân loại TNLĐ theo mức độ thương tật", { colSpan: 11, width: W_VAL * 11 }),
    ],
  });
  const r2 = new TableRow({
    children: [
      vCont(), vCont(),
      hCell("Số vụ (Vụ)", { colSpan: 3, width: W_VAL * 3 }),
      hCell("Số người bị nạn (Người)", { colSpan: 8, width: W_VAL * 8 }),
    ],
  });
  const r3 = new TableRow({
    children: [
      vCont(), vCont(),
      hCell("Tổng số", { vMerge: VerticalMergeType.RESTART, width: W_VAL }),
      hCell("Số vụ có người chết", { vMerge: VerticalMergeType.RESTART, width: W_VAL }),
      hCell("Số vụ có từ 2 người bị nạn trở lên", { vMerge: VerticalMergeType.RESTART, width: W_VAL }),
      hCell("Tổng số", { colSpan: 2, width: W_VAL * 2 }),
      hCell("Số LĐ nữ", { colSpan: 2, width: W_VAL * 2 }),
      hCell("Số người bị chết", { colSpan: 2, width: W_VAL * 2 }),
      hCell("Số người bị thương nặng", { colSpan: 2, width: W_VAL * 2 }),
    ],
  });
  const r4 = new TableRow({
    children: [
      vCont(), vCont(),
      vCont(), vCont(), vCont(),
      hCell("Tổng số", { width: W_VAL }),
      hCell("Nạn nhân không thuộc", { width: W_VAL }),
      hCell("Tổng số", { width: W_VAL }),
      hCell("Nạn nhân không thuộc", { width: W_VAL }),
      hCell("Tổng số", { width: W_VAL }),
      hCell("Nạn nhân không thuộc", { width: W_VAL }),
      hCell("Tổng số", { width: W_VAL }),
      hCell("Nạn nhân không thuộc", { width: W_VAL }),
    ],
  });

  const rows = report.rows || {};
  const get11 = (ma: string): number[] => {
    const raw = rows[ma];
    if (!Array.isArray(raw)) return Array(11).fill(0);
    return Array(11).fill(0).map((_, i) => Number(raw[i] ?? 0));
  };

  // Compute KQL statistics dynamically from individual accident details
  const details = report.chiTietRows || [];
  const nanKhongQL = details.reduce((sum, d: any) => sum + getVal(d.nanKhongQL), 0);
  const nuKhongQL = details.reduce((sum, d: any) => sum + getVal(d.nuKhongQL), 0);
  const chetKhongQL = details.reduce((sum, d: any) => sum + getVal(d.chetKhongQL), 0);
  const thuongKhongQL = details.reduce((sum, d: any) => sum + getVal(d.thuongKhongQL), 0);

  const section1Vals = [
    getVal(report.soVu),
    getVal(report.soVuCoNguoiChet),
    getVal(report.soVuCo2NguoiBiNan),
    getVal(report.soNguoiBiNan),
    nanKhongQL,
    getVal(report.soLDNu),
    nuKhongQL,
    getVal(report.soNguoiBiChet),
    chetKhongQL,
    getVal(report.soNguoiBiThuongNang),
    thuongKhongQL,
  ];

  const section2Vals = get11("10");
  const section3Vals = section1Vals.map((v, i) => v + section2Vals[i]);

  // 1. Get the list of factors and occupations dynamically from accidentDetails (or savedOverviewRows keys)
  const activeFactors = new Set<string>();
  const activeOccupations = new Set<string>();

  details.forEach((d: any) => {
    if (d.yeuTo) activeFactors.add(cleanName(d.yeuTo));
    if (d.ngheNghiep) activeOccupations.add(cleanName(d.ngheNghiep));
  });

  // Also include any saved keys from rows
  Object.keys(rows).forEach((key) => {
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
    activeOccupations.add("Nhà lãnh đạo cơ quan Đảng Cộng sản Việt nam cấp Trung ương");
    activeOccupations.add("Công nhân");
  }

  // Build the dynamic rows array for docx
  const dynamicRows: { kind: string; label: string; ma: string; bold?: boolean }[] = [];

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

  const dataRows = dynamicRows.map((row) => {
    if (row.kind === "sub") {
      return new TableRow({
        children: [
          new TableCell({
            columnSpan: 13,
            borders: ALL_BORDERS,
            shading: { fill: "FFFFFF" },
            width: { size: W_COL1 + W_COL2 + W_VAL * 11, type: WidthType.DXA },
            children: [p(row.label, row.bold, false, row.bold ? 0 : 200)],
          }),
        ],
      });
    }

    let vals = Array(11).fill(0);
    if (row.label === "Tai nạn lao động" && row.ma === "1") {
      vals = section1Vals;
    } else if (row.label === "Tổng số (3=1+2)" && row.ma === "total") {
      vals = section3Vals;
    } else if (row.ma) {
      vals = get11(row.ma);
    }

    const v = (i: number) => (vals[i] !== undefined && vals[i] !== 0 ? String(vals[i]) : "0");

    if (row.kind === "section") {
      return new TableRow({
        children: [
          new TableCell({
            columnSpan: 13,
            borders: ALL_BORDERS,
            shading: { fill: "FFFFFF" },
            width: { size: W_COL1 + W_COL2 + W_VAL * 11, type: WidthType.DXA },
            children: [p(row.label, true, false)],
          }),
        ],
      });
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

    return new TableRow({
      children: [
        dCell(row.label, false, true, 200, W_COL1),
        dCell(displayMa, false, false, 0, W_COL2),
        ...Array.from({ length: 11 }, (_, i) => dCell(v(i), false, false, 0, W_VAL)),
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
    rows: [r1, r2, r3, r4, ...dataRows],
  });
}

// ─── Bảng II – Thiệt hại do tai nạn lao động ─────────────────────────────────
function buildTable2(report: AccidentReport): Table {
  // Columns widths allocation (Total: 13960 dxa)
  const W_COL1 = 3000;
  const W_VAL = 2200; // (2200 * 4 = 8800)
  const W_COL6 = 2160;

  const r1 = new TableRow({
    children: [
      hCell("Tổng số ngày nghỉ vì tai nạn lao động (kể cả ngày nghỉ chế độ)", { vMerge: VerticalMergeType.RESTART, width: W_COL1 }),
      hCell("Tổng số tiền chi phí vì TNLĐ (1.000đ)", { colSpan: 4, width: W_VAL * 4 }),
      hCell("Thiệt hại tài sản (1.000đ)", { vMerge: VerticalMergeType.RESTART, width: W_COL6 }),
    ],
  });

  const r2 = new TableRow({
    children: [
      vCont(),
      hCell("Tổng số", { vMerge: VerticalMergeType.RESTART, width: W_VAL }),
      hCell("Khoản chi cụ thể của cơ sở", { colSpan: 3, width: W_VAL * 3 }),
      vCont(),
    ],
  });
  const r3 = new TableRow({
    children: [
      vCont(),
      vCont(),
      hCell("Y tế", { width: W_VAL }),
      hCell("Trả lương trong thời gian điều trị", { width: W_VAL }),
      hCell("Bồi thường trợ cấp", { width: W_VAL }),
      vCont(),
    ],
  });
  const dataRow = new TableRow({
    children: [
      dCell(String(getVal(report.soNgayNghi)), false, false, 0, W_COL1),
      dCell(fmtMoney(getVal(report.tongSoTien)), false, false, 0, W_VAL),
      dCell(fmtMoney(getVal(report.chiPhiYTe)), false, false, 0, W_VAL),
      dCell(fmtMoney(getVal(report.chiPhiTraLuong)), false, false, 0, W_VAL),
      dCell(fmtMoney(getVal(report.boiThuongTroCap)), false, false, 0, W_VAL),
      dCell(fmtMoney(getVal(report.thiethaiTaiSan)), false, false, 0, W_COL6),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: {
      top: 100,
      bottom: 100,
      left: 150,
      right: 150,
    },
    rows: [r1, r2, r3, dataRow],
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function exportDetailDocx(report: AccidentReport, businessDetail?: any): Promise<void> {
  let dbFactors: { ten: string; ma: string }[] = [];
  let dbOccupations: { ten: string; ma: string }[] = [];

  try {
    const list = await getInjuryFactorList();
    dbFactors = list.filter((item) => item.active).map((item) => ({
      ten: cleanName(item.ten),
      ma: item.ma,
    }));
  } catch (err) {
    console.error("Error fetching factors for docx export:", err);
  }

  try {
    const list = await getOccupationList();
    dbOccupations = list.map((item) => ({
      ten: cleanName(item.ten),
      ma: item.ma,
    }));
  } catch (err) {
    console.error("Error fetching occupations for docx export:", err);
  }

  const errors = validateAccidentReportData(report);
  if (errors.length > 0) {
    throw new Error("Dữ liệu không khớp:\n" + errors.join("\n"));
  }

  const companyName = report.ten || businessDetail?.businessName || "";
  const address = businessDetail?.address || report.province || "";
  const period = report.ky || "6 tháng";
  const year = report.nam || new Date().getFullYear().toString();
  
  const soLaoDong = getVal(report.soLaoDong);
  const soLDNu = report.rows?.["company_info"]?.[0] ? getVal(report.rows["company_info"][0]) : 0;
  const tongLuong = report.rows?.["company_info"]?.[1] ? getVal(report.rows["company_info"][1]) : 0;

  // Center-aligned titles at the very top (all 12pt / size: 24)
  const topHeaderParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({ text: "PHỤ LỤC XII", bold: true, size: 24, font: "Times New Roman" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({
          text: "MẪU BÁO CÁO TỔNG HỢP TÌNH HÌNH TAI NẠN LAO ĐỘNG CẤP CƠ SỞ (6 THÁNG HOẶC CẢ NĂM)",
          bold: false,
          size: 24,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 240 },
      children: [
        new TextRun({
          text: "(Kèm theo Nghị định số 39/2016/NĐ-CP ngày 15 tháng 5 năm 2016 của Chính phủ)",
          italics: true,
          size: 24,
          font: "Times New Roman",
        }),
      ],
    }),
  ];

  // 1. Metadata Top: Đơn vị báo cáo, Địa chỉ, Mã huyện, quận
  const metadataTableTop = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      // Row 1: Đơn vị báo cáo
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 3,
            children: [
              new Paragraph({
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({ text: `Đơn vị báo cáo: ${companyName}`, size: 24, font: "Times New Roman" }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Row 2: Địa chỉ & Mã huyện, quận
      new TableRow({
        children: [
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({ text: `Địa chỉ: ${address}`, size: 24, font: "Times New Roman" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({ text: "Mã huyện, quận¹: ", size: 24, font: "Times New Roman" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [buildGrid()],
          }),
        ],
      }),
    ],
  });

  // Centered main title block (all 12pt / size: 24)
  const titleParagraph1 = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 60 },
    children: [
      new TextRun({ text: "BÁO CÁO TỔNG HỢP TÌNH HÌNH TAI NẠN LAO ĐỘNG", bold: true, size: 24, font: "Times New Roman" }),
    ],
  });

  const titleParagraph2 = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({ text: `Kỳ báo cáo (6 tháng hoặc cả năm): ${period} năm ${year}`, bold: true, size: 24, font: "Times New Roman" }),
    ],
  });

  const titleParagraph3 = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 120 },
    children: [
      new TextRun({ text: "Ngày báo cáo: ................", italics: true, size: 24, font: "Times New Roman" }),
    ],
  });

  // 2. Metadata Bottom: Thuộc loại hình, Đơn vị nhận, Lĩnh vực, Tổng số lao động, Tổng quỹ lương
  const metadataTableBottom = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      // Row 1: Thuộc loại hình cơ sở & Mã loại hình
      new TableRow({
        children: [
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({
                    text: `Thuộc loại hình cơ sở² (doanh nghiệp): ${report.loaiHinh || businessDetail?.businessType || ""}`,
                    size: 24,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({ text: "Mã loại hình cơ sở: ", size: 24, font: "Times New Roman" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [buildGrid()],
          }),
        ],
      }),
      // Row 2: Đơn vị nhận báo cáo
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 3,
            children: [
              new Paragraph({
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({ text: "Đơn vị nhận báo cáo: Sở Lao động - Thương binh và Xã hội.", size: 24, font: "Times New Roman" }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Row 3: Lĩnh vực sản xuất chính & Mã lĩnh vực
      new TableRow({
        children: [
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({
                    text: `Lĩnh vực sản xuất chính của cơ sở: ${businessDetail?.mainIndustry || ""}`,
                    size: 24,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({ text: "Mã lĩnh vực: ", size: 24, font: "Times New Roman" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [buildGrid()],
          }),
        ],
      }),
      // Row 4: Tổng số lao động
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 3,
            children: [
              new Paragraph({
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({
                    text: `Tổng số lao động của cơ sở: ${soLaoDong} người, trong đó nữ: ${soLDNu} người.`,
                    size: 24,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Row 5: Tổng quỹ lương
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 3,
            children: [
              new Paragraph({
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({
                    text: `Tổng quỹ lương: ${tongLuong ? tongLuong.toLocaleString("vi-VN") : "0"} triệu đồng.`,
                    size: 24,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Footer/Signature block (all 12pt / size: 24)
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [] })],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new TextRun({ text: "ĐẠI DIỆN NGƯỜI SỬ DỤNG LAO ĐỘNG", bold: true, size: 24, font: "Times New Roman" }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "(Ký, ghi rõ họ tên, chức vụ, đóng dấu)", italics: true, size: 24, font: "Times New Roman" }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Footnote lines at the very bottom (all 12pt / size: 24, normal)
  const footnoteParagraphs = [
    new Paragraph({
      spacing: { before: 240, after: 60 },
      children: [
        new TextRun({
          text: "_________________",
          size: 24,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({
          text: "¹ Ghi mã số theo Danh Mục đơn vị hành chính do Thủ tướng Chính phủ ban hành theo quy định của Luật Thống kê.",
          size: 24,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({
          text: "² Ghi tên, mã số theo danh Mục và mã số các đơn vị kinh tế, hành chính sự nghiệp theo quy định pháp luật hiện hành trong báo cáo thống kê.",
          size: 24,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({
          text: "³ Ghi tên ngành, mã ngành theo Hệ thống ngành kinh tế do Thủ tướng Chính phủ ban hành theo quy định của Luật Thống kê.",
          size: 24,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({
          text: "⁴ Ghi 01 nguyên nhân chính gây tai nạn lao động.",
          size: 24,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({
          text: "⁵ Ghi tên và mã số theo danh Mục yếu tố gây chấn thương.",
          size: 24,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({
          text: "⁶ Ghi tên và mã số nghề nghiệp theo danh Mục nghề nghiệp do Thủ tướng Chính phủ ban hành theo quy định của Luật Thống kê.",
          size: 24,
          font: "Times New Roman",
        }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { orientation: PageOrientation.LANDSCAPE } },
        },
        children: [
          ...topHeaderParagraphs,
          metadataTableTop,
          titleParagraph1,
          titleParagraph2,
          titleParagraph3,
          metadataTableBottom,
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({
                text: "I. Tình hình chung tai nạn lao động",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          buildTable1(report, dbFactors, dbOccupations),
          new Paragraph({ children: [] }),
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({
                text: "II. Thiệt hại do tai nạn lao động",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          buildTable2(report),
          new Paragraph({ children: [] }),
          new Paragraph({ spacing: { before: 240, after: 120 }, children: [] }),
          signatureTable,
          ...footnoteParagraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BC-tinh-hinh-TNLD-Phu-Luc-XII-${companyName.replace(/\s+/g, "-")}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
