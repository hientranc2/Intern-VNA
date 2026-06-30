"use client";

import { ImportFile } from "@/libs/shared/core/components/ImportFile/ImportFile";

interface Props {
  onClose: () => void;
  onFileReady: (file: File, fileName: string) => void;
}

export function EnterpriseTypeImportForm({ onClose, onFileReady }: Props) {
  const buildTemplateWithDropdown = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();

    const wsTrangThai = wb.addWorksheet("_trangthai", { state: "veryHidden" });
    ["Sử dụng", "Ngừng sử dụng"].forEach(
      (v, i) => (wsTrangThai.getCell(`A${i + 1}`).value = v),
    );

    const ws = wb.addWorksheet("Loại hình");

    ws.columns = [
      { header: "Mã loại hình *", width: 20 },
      { header: "Tên loại hình *", width: 36 },
      { header: "Trạng thái", width: 18 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    const exampleRow = ws.addRow(["TNHH", "Trách nhiệm hữu hạn", "Sử dụng"]);
    exampleRow.eachCell((cell) => {
      cell.font = { italic: true, color: { argb: "FF9CA3AF" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF9E6" } };
    });

    for (let i = 0; i < 50; i++) {
      ws.addRow([]);
      const r = i + 3;
      ws.getCell(`C${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ["_trangthai!$A$1:$A$2"],
        showErrorMessage: true,
        errorTitle: "Không hợp lệ",
        error: "Chỉ chọn Sử dụng hoặc Ngừng sử dụng",
      };
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "file-mau-loai-hinh.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ImportFile
      title="Thêm loại hình kinh doanh từ file"
      templateColumns={[
        { label: "Mã loại hình", required: true },
        { label: "Tên loại hình", required: true },
        { label: "Trạng thái", required: false, note: "Sử dụng / Ngừng sử dụng" },
      ]}
      templateExample={["TNHH", "Trách nhiệm hữu hạn", "Sử dụng"]}
      templateFileName="file-mau-loai-hinh.xlsx"
      onDownloadTemplate={buildTemplateWithDropdown}
      onFileReady={onFileReady}
      onClose={onClose}
    />
  );
}