"use client";

import { ImportFile } from "@/libs/shared/core/components/ImportFile/ImportFile";

interface Props {
  onClose: () => void;
  onFileReady: (file: File, fileName: string) => void;
}

export function BusinessSectorImportForm({ onClose, onFileReady }: Props) {
  const buildTemplateWithDropdown = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();

    const wsCap = wb.addWorksheet("_cap", { state: "veryHidden" });
    ["1", "2", "3", "4"].forEach((v, i) => (wsCap.getCell(`A${i + 1}`).value = v));

    const ws = wb.addWorksheet("Ngành nghề");

    ws.columns = [
      { header: "Mã ngành *", width: 18 },
      { header: "Tên ngành *", width: 40 },
      { header: "Cấp *", width: 12 },
      { header: "Mã cha", width: 18 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    const exampleRow = ws.addRow(["0111", "Trồng lúa", "4", "011"]);
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
        formulae: ["_cap!$A$1:$A$4"],
        showErrorMessage: true,
        errorTitle: "Không hợp lệ",
        error: "Cấp độ phải từ 1 đến 4",
      };
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "file-mau-nganh-nghe.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ImportFile
      title="Thêm ngành nghề kinh doanh từ file"
      templateColumns={[
        { label: "Mã ngành", required: true },
        { label: "Tên ngành", required: true },
        { label: "Cấp", required: true, note: "Số từ 1 đến 4" },
        { label: "Mã cha", required: false, note: "Để trống nếu là cấp 1" },
      ]}
      templateExample={["0111", "Trồng lúa", "4", "011"]}
      templateFileName="file-mau-nganh-nghe.xlsx"
      onDownloadTemplate={buildTemplateWithDropdown}
      onFileReady={onFileReady}
      onClose={onClose}
    />
  );
}