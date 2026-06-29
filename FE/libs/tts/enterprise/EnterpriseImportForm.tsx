"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { ImportFile } from "@/libs/shared/core/components/ImportFile/ImportFile";
import { getEnterpriseTypeList } from "@/libs/tts/enterprise-type/enterpriseTypeApi";
import { getBusinessSectorList } from "@/libs/tts/business-sector/businessSectorApi";
import { PROVINCES, WARDS_BY_PROVINCE } from "@/libs/tts/location/locationData";

interface Props {
  onClose: () => void;
  onFileReady: (file: File, fileName: string) => void;
}

export function EnterpriseImportForm({ onClose, onFileReady }: Props) {
  const [loaiHinhOptions, setLoaiHinhOptions] = useState<string[]>([]);
  const [nganhCap4Options, setNganhCap4Options] = useState<string[]>([]);

  useEffect(() => {
    getEnterpriseTypeList()
      .then((types) =>
        setLoaiHinhOptions(types.filter((t) => t.active).map((t) => t.ten)),
      )
      .catch(() => {});
    getBusinessSectorList()
      .then((sectors) =>
        setNganhCap4Options(
          sectors
            .filter((s) => s.cap === 4)
            .map((s) => `${s.ma} - ${s.ten.replace(/^[–-]\s*/, "")}`),
        ),
      )
      .catch(() => {});
  }, []);

  const buildTemplateWithDropdown = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();

    // ── Sheet ẩn: Ngành nghề ──
    const wsNganh = wb.addWorksheet("_nganh", { state: "veryHidden" });
    nganhCap4Options.forEach((v, i) => {
      wsNganh.getCell(`A${i + 1}`).value = v;
    });

    // ── Sheet ẩn: Loại hình ──
    const wsLoaiHinh = wb.addWorksheet("_loaihinh", { state: "veryHidden" });
    loaiHinhOptions.forEach((v, i) => {
      wsLoaiHinh.getCell(`A${i + 1}`).value = v;
    });

    // ── Sheet ẩn: Tỉnh ──
    const wsTinh = wb.addWorksheet("_tinh", { state: "veryHidden" });
    PROVINCES.forEach((v, i) => {
      wsTinh.getCell(`A${i + 1}`).value = v;
    });

    // ── Sheet ẩn: Phường theo tỉnh ──
    // Mỗi tỉnh 1 cột, hàng 1 = tên tỉnh, hàng 2+ = danh sách phường
    // Dùng Named Range để INDIRECT tham chiếu được
    const wsPhuong = wb.addWorksheet("_phuong", { state: "veryHidden" });

    PROVINCES.forEach((province, colIdx) => {
      const col = colIdx + 1;
      const wards = WARDS_BY_PROVINCE[province] ?? [];

      // Hàng 1: tên tỉnh (làm key)
      wsPhuong.getCell(1, col).value = province;

      // Hàng 2 trở đi: danh sách phường
      wards.forEach((ward, rowIdx) => {
        wsPhuong.getCell(rowIdx + 2, col).value = ward;
      });

      // Tạo Named Range cho tỉnh này
      // Tên named range phải là chữ/số/gạch dưới, không dấu
      // Dùng index thay vì tên tỉnh để tránh lỗi ký tự đặc biệt
      const colLetter = wsPhuong.getColumn(col).letter;
      const maxRow = wards.length + 1;
      const rangeName = `_tinh_${colIdx}`;

      wb.definedNames.add(
        `_phuong!$${colLetter}$2:$${colLetter}$${maxRow}`,
        rangeName,
      );
    });

    // ── Sheet chính ──
    const ws = wb.addWorksheet("Doanh nghiệp");

    ws.columns = [
      { header: "Tên doanh nghiệp *", width: 32 },
      { header: "Mã số thuế *", width: 18 },
      { header: "Loại hình kinh doanh *", width: 30 },
      { header: "Ngành nghề kinh doanh *", width: 38 },
      { header: "Ngày cấp GPKD", width: 18 },
      { header: "Tỉnh ĐKKD *", width: 28 },
      { header: "Phường ĐKKD *", width: 24 },
      { header: "Địa chỉ", width: 30 },
      { header: "Tên tiếng nước ngoài", width: 30 },
      { header: "Email *", width: 28 },
      { header: "SĐT văn phòng", width: 18 },
      { header: "Tỉnh hoạt động", width: 28 },
      { header: "Phường hoạt động", width: 24 },
      { header: "Địa chỉ hoạt động", width: 30 },
      { header: "Người đại diện", width: 24 },
      { header: "SĐT đại diện", width: 18 },
    ];

    // Style header
    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };
    });

    // Dòng ví dụ (dòng 2) - in nghiêng, màu nhạt, nền vàng nhạt
    const exampleRow = ws.addRow([
      "Công ty TNHH Ví Dụ",
      "0123456789",
      loaiHinhOptions[0] ?? "Công ty TNHH một thành viên",
      nganhCap4Options[0] ?? "6201 - Lập trình máy vi tính",
      "2024-01-15",
      "Thành phố Hồ Chí Minh",
      "Phường Bến Thành",
      "123 Đường Lê Lợi",
      "Example Co., Ltd",
      "contact@example.com",
      "0901234567",
      "Thành phố Hồ Chí Minh",
      "Phường Bến Thành",
      "456 Đường Nguyễn Huệ",
      "Nguyễn Văn A",
      "0907654321",
    ]);
    exampleRow.eachCell((cell) => {
      cell.font = { italic: true, color: { argb: "FF9CA3AF" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF9E6" } };
    });

    // Hàm lấy index tỉnh để tìm Named Range phường
    const getProvinceIndex = (provinceName: string) =>
      PROVINCES.indexOf(provinceName);

    // 50 dòng trống + dropdown
    for (let i = 0; i < 50; i++) {
      ws.addRow([]);
      const r = i + 3; // dòng 3 → 52

      // Cột C - Loại hình kinh doanh
      ws.getCell(`C${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`_loaihinh!$A$1:$A$${loaiHinhOptions.length}`],
        showErrorMessage: true,
        errorTitle: "Không hợp lệ",
        error: "Vui lòng chọn từ danh sách loại hình",
      };

      // Cột D - Ngành nghề
      ws.getCell(`D${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`_nganh!$A$1:$A$${nganhCap4Options.length}`],
        showErrorMessage: true,
        errorTitle: "Không hợp lệ",
        error: "Vui lòng chọn từ danh sách ngành nghề",
      };

      // Cột F - Tỉnh ĐKKD
      ws.getCell(`F${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`_tinh!$A$1:$A$${PROVINCES.length}`],
        showErrorMessage: true,
        errorTitle: "Không hợp lệ",
        error: "Vui lòng chọn từ danh sách tỉnh/thành phố",
      };

      // Cột G - Phường ĐKKD (INDIRECT theo Tỉnh ĐKKD ở cột F)
      // MATCH tìm index tỉnh → lấy Named Range _tinh_{index}
      ws.getCell(`G${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [
          `INDIRECT("_tinh_"&(MATCH(F${r},_tinh!$A$1:$A$${PROVINCES.length},0)-1))`,
        ],
        showErrorMessage: true,
        errorTitle: "Không hợp lệ",
        error: "Vui lòng chọn tỉnh/thành phố trước",
      };

      // Cột L - Tỉnh hoạt động
      ws.getCell(`L${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`_tinh!$A$1:$A$${PROVINCES.length}`],
        showErrorMessage: true,
        errorTitle: "Không hợp lệ",
        error: "Vui lòng chọn từ danh sách tỉnh/thành phố",
      };

      // Cột M - Phường hoạt động (INDIRECT theo Tỉnh hoạt động ở cột L)
      ws.getCell(`M${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [
          `INDIRECT("_tinh_"&(MATCH(L${r},_tinh!$A$1:$A$${PROVINCES.length},0)-1))`,
        ],
        showErrorMessage: true,
        errorTitle: "Không hợp lệ",
        error: "Vui lòng chọn tỉnh/thành phố trước",
      };
    }

    // Xuất file
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "file-mau-doanh-nghiep.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ImportFile
      title="Thêm doanh nghiệp từ file"
      templateColumns={[
        { label: "Tên doanh nghiệp", required: true },
        { label: "Mã số thuế", required: true },
        { label: "Loại hình kinh doanh", required: true, note: "Chọn từ danh sách" },
        { label: "Ngành nghề kinh doanh", required: true, note: "Chọn từ danh sách" },
        { label: "Ngày cấp GPKD", required: false, note: "Định dạng: YYYY-MM-DD" },
        { label: "Tỉnh ĐKKD", required: true, note: "Chọn từ danh sách" },
        { label: "Phường ĐKKD", required: true },
        { label: "Địa chỉ", required: false },
        { label: "Tên tiếng nước ngoài", required: false },
        { label: "Email", required: true },
        { label: "SĐT văn phòng", required: false },
        { label: "Tỉnh hoạt động", required: false, note: "Chọn từ danh sách" },
        { label: "Phường hoạt động", required: false },
        { label: "Địa chỉ hoạt động", required: false },
        { label: "Người đại diện", required: false },
        { label: "SĐT đại diện", required: false },
      ]}
      templateExample={[
        "Công ty TNHH Ví Dụ",
        "0123456789",
        loaiHinhOptions[0] ?? "Công ty TNHH một thành viên",
        nganhCap4Options[0] ?? "6201 - Lập trình máy vi tính",
        "2024-01-15",
        "Thành phố Hồ Chí Minh",
        "Phường Bến Nghé",
        "123 Đường Lê Lợi",
        "Example Co., Ltd",
        "contact@example.com",
        "0901234567",
        "Thành phố Hồ Chí Minh",
        "Phường Bến Thành",
        "456 Đường Nguyễn Huệ",
        "Nguyễn Văn A",
        "0907654321",
      ]}
      templateFileName="file-mau-doanh-nghiep.xlsx"
      onDownloadTemplate={buildTemplateWithDropdown}
      onFileReady={onFileReady}
      onClose={onClose}
    />
  );
}