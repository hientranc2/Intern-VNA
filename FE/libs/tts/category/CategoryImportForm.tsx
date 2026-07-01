"use client";

import { ImportFile } from "@/libs/shared/core/components/ImportFile/ImportFile";
import type { CategoryTab } from "@/libs/tts/category/categoryData";

interface Props {
  tab: CategoryTab;
  onClose: () => void;
  onFileReady: (file: File, fileName: string) => void;
}

const TAB_CONFIG = {
  factor: {
    title: "Thêm yếu tố gây chấn thương từ file",
    templateColumns: [
      { label: "Mã yếu tố", required: true },
      { label: "Tên yếu tố gây chấn thương", required: true },
      { label: "Trạng thái", required: false, note: "Sử dụng / Ngừng" },
    ],
    templateExample: ["CT001", "Ngã từ trên cao", "Sử dụng"],
    templateFileName: "file-mau-yeu-to-chan-thuong.xlsx",
    sheetName: "Yếu tố chấn thương",
  },
  injuryType: {
    title: "Thêm loại chấn thương từ file",
    templateColumns: [
      { label: "Mã số", required: true },
      { label: "Tên loại chấn thương", required: true },
      { label: "Cấp", required: true, note: "Số từ 1 đến 4" },
      { label: "Mã cha", required: false, note: "Để trống nếu là cấp 1" },
    ],
    templateExample: ["S00", "Chấn thương đầu", "1", ""],
    templateFileName: "file-mau-loai-chan-thuong.xlsx",
    sheetName: "Loại chấn thương",
  },
  occupation: {
    title: "Thêm danh mục nghề nghiệp từ file",
    templateColumns: [
      { label: "Mã nghề", required: true },
      { label: "Tên nghề nghiệp", required: true },
      { label: "Cấp", required: true, note: "Số từ 1 đến 4" },
      { label: "Mã cha", required: false, note: "Để trống nếu là cấp 1" },
    ],
    templateExample: ["01", "Nông nghiệp, lâm nghiệp và thủy sản", "1", ""],
    templateFileName: "file-mau-nghe-nghiep.xlsx",
    sheetName: "Nghề nghiệp",
  },
} satisfies Record<CategoryTab, {
  title: string;
  templateColumns: { label: string; required?: boolean; note?: string }[];
  templateExample: string[];
  templateFileName: string;
  sheetName: string;
}>;

export function CategoryImportForm({ tab, onClose, onFileReady }: Props) {
  const cfg = TAB_CONFIG[tab];

  const buildTemplate = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(cfg.sheetName);

    ws.columns = cfg.templateColumns.map((col) => ({
      header: col.required ? `${col.label} *` : col.label,
      width: Math.max(col.label.length + 6, 20),
    }));

    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Dòng ví dụ
    const exampleRow = ws.addRow(cfg.templateExample);
    exampleRow.eachCell((cell) => {
      cell.font = { italic: true, color: { argb: "FF9CA3AF" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF9E6" } };
    });

    // Dropdown trạng thái cho tab factor
    if (tab === "factor") {
      const wsTT = wb.addWorksheet("_trangthai", { state: "veryHidden" });
      ["Sử dụng", "Ngừng"].forEach((v, i) => (wsTT.getCell(`A${i + 1}`).value = v));

      for (let i = 0; i < 50; i++) {
        ws.addRow([]);
        const r = i + 3;
        ws.getCell(`C${r}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ["_trangthai!$A$1:$A$2"],
          showErrorMessage: true,
          errorTitle: "Không hợp lệ",
          error: "Chỉ chọn Sử dụng hoặc Ngừng",
        };
      }
    } else {
      // Dropdown cấp 1-4 cho injuryType và occupation
      const wsCap = wb.addWorksheet("_cap", { state: "veryHidden" });
      ["1", "2", "3", "4"].forEach((v, i) => (wsCap.getCell(`A${i + 1}`).value = v));

      for (let i = 0; i < 50; i++) {
        ws.addRow([]);
        const r = i + 3;
        ws.getCell(`C${r}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ["_cap!$A$1:$A$4"],
          showErrorMessage: true,
          errorTitle: "Không hợp lệ",
          error: "Cấp phải là số từ 1 đến 4",
        };
      }
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = cfg.templateFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ImportFile
      title={cfg.title}
      templateColumns={cfg.templateColumns}
      templateExample={cfg.templateExample}
      templateFileName={cfg.templateFileName}
      onDownloadTemplate={buildTemplate}
      onFileReady={onFileReady}
      onClose={onClose}
    />
  );
}