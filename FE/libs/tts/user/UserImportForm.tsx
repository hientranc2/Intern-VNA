"use client";

import { useEffect } from "react";
import { ImportFile } from "@/libs/shared/core/components/ImportFile/ImportFile";
import { getRoleList } from "@/libs/tts/role/roleApi";
import { type Role } from "@/libs/tts/role/roleData";
import { GENDER_OPTIONS } from "@/libs/tts/user/userData";
import { PROVINCES, WARDS_BY_PROVINCE } from "@/libs/tts/location/locationData";
import { useState } from "react";

interface Props {
  onClose: () => void;
  onFileReady: (file: File, fileName: string) => void;
}

export function UserImportForm({ onClose, onFileReady }: Props) {
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    getRoleList().then(setRoles).catch(() => {});
  }, []);

  const buildTemplateWithDropdown = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();

    const roleNames = roles.map((r) => r.ten);

    const wsRole = wb.addWorksheet("_role", { state: "veryHidden" });
    roleNames.forEach((v, i) => wsRole.getCell(`A${i + 1}`).value = v);

    const wsGender = wb.addWorksheet("_gender", { state: "veryHidden" });
    GENDER_OPTIONS.forEach((v, i) => wsGender.getCell(`A${i + 1}`).value = v);

    const wsTinh = wb.addWorksheet("_tinh", { state: "veryHidden" });
    PROVINCES.forEach((v, i) => wsTinh.getCell(`A${i + 1}`).value = v);

    const wsPhuong = wb.addWorksheet("_phuong", { state: "veryHidden" });
    PROVINCES.forEach((province, colIdx) => {
      const col = colIdx + 1;
      const wards = WARDS_BY_PROVINCE[province] ?? [];
      wsPhuong.getCell(1, col).value = province;
      wards.forEach((ward, rowIdx) => {
        wsPhuong.getCell(rowIdx + 2, col).value = ward;
      });
      const colLetter = wsPhuong.getColumn(col).letter;
      const maxRow = wards.length + 1;
      wb.definedNames.add(
        `_phuong!$${colLetter}$2:$${colLetter}$${maxRow}`,
        `_tinh_${colIdx}`,
      );
    });

    const ws = wb.addWorksheet("Người dùng");

    ws.columns = [
      { header: "Tên đăng nhập *", width: 24 },
      { header: "Họ và tên *", width: 28 },
      { header: "Email *", width: 28 },
      { header: "Vai trò", width: 20 },
      { header: "Chức danh", width: 24 },
      { header: "Tỉnh/Thành", width: 26 },
      { header: "Phường/Xã", width: 22 },
      { header: "Địa chỉ", width: 28 },
      { header: "Ngày sinh", width: 16 },
      { header: "Giới tính", width: 14 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };
    });

    const exampleRow = ws.addRow([
      "nguyenvana",
      "Nguyễn Văn A",
      "nguyenvana@example.com",
      roleNames[0] ?? "Người dùng",
      "Nhân viên",
      "Thành phố Hồ Chí Minh",
      "Phường Bến Thành",
      "123 Đường Lê Lợi",
      "1995-01-15",
      GENDER_OPTIONS[0] ?? "Nam",
    ]);
    exampleRow.eachCell((cell) => {
      cell.font = { italic: true, color: { argb: "FF9CA3AF" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF9E6" } };
    });

    for (let i = 0; i < 50; i++) {
      ws.addRow([]);
      const r = i + 3;

      ws.getCell(`D${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`_role!$A$1:$A$${roleNames.length}`],
        showErrorMessage: true,
        errorTitle: "Không hợp lệ",
        error: "Vui lòng chọn từ danh sách vai trò",
      };

      ws.getCell(`F${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`_tinh!$A$1:$A$${PROVINCES.length}`],
        showErrorMessage: true,
        errorTitle: "Không hợp lệ",
        error: "Vui lòng chọn từ danh sách tỉnh/thành phố",
      };

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

      ws.getCell(`J${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`_gender!$A$1:$A$${GENDER_OPTIONS.length}`],
        showErrorMessage: true,
        errorTitle: "Không hợp lệ",
        error: "Vui lòng chọn từ danh sách giới tính",
      };
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "file-mau-nguoi-dung.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ImportFile
      title="Thêm người dùng từ file"
      templateColumns={[
        { label: "Tên đăng nhập", required: true },
        { label: "Họ và tên", required: true },
        { label: "Email", required: true },
        { label: "Vai trò", required: false, note: "Chọn từ danh sách" },
        { label: "Chức danh", required: false },
        { label: "Tỉnh/Thành", required: false, note: "Chọn từ danh sách" },
        { label: "Phường/Xã", required: false },
        { label: "Địa chỉ", required: false },
        { label: "Ngày sinh", required: false, note: "Định dạng: YYYY-MM-DD" },
        { label: "Giới tính", required: false, note: "Chọn từ danh sách" },
      ]}
      templateExample={[
        "nguyenvana",
        "Nguyễn Văn A",
        "nguyenvana@example.com",
        roles[0]?.ten ?? "Người dùng",
        "Nhân viên",
        "Thành phố Hồ Chí Minh",
        "Phường Bến Thành",
        "123 Đường Lê Lợi",
        "1995-01-15",
        GENDER_OPTIONS[0] ?? "Nam",
      ]}
      templateFileName="file-mau-nguoi-dung.xlsx"
      onDownloadTemplate={buildTemplateWithDropdown}
      onFileReady={onFileReady}
      onClose={onClose}
    />
  );
}