"use client";

import { ImportFile } from "@/libs/shared/core/components/ImportFile/ImportFile";

interface Props {
  onClose: () => void;
  onFileReady: (file: File, fileName: string) => void;
}

export function UserImportForm({ onClose, onFileReady }: Props) {
  return (
    <ImportFile
      title="Thêm người dùng từ file"
      templateColumns={[
        { label: "Họ tên", required: true },
        { label: "Email", required: true },
        { label: "Số điện thoại", required: false },
        { label: "Vai trò", required: true },
      ]}
      templateExample={[
        "Nguyễn Văn A",
        "a@email.com",
        "0901234567",
        "Admin",
      ]}
      templateFileName="file-mau-nguoi-dung.xlsx"
      onFileReady={onFileReady}
      onClose={onClose}
    />
  );
}