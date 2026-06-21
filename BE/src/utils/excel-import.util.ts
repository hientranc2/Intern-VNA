import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

// Một dòng trong file import: key = header cột (nguyên văn), value = chuỗi ô.
export type ImportRow = Record<string, string>;

// Parse buffer Excel/CSV thành mảng dòng. Mỗi dòng là object key=header, value=chuỗi.
// - defval: ''    → ô trống thành chuỗi rỗng thay vì bỏ field (đồng nhất key giữa các dòng).
// - raw: false    → luôn trả chuỗi định dạng hiển thị, tránh số ngày tháng bị thành serial number.
export function parseExcelToRows(buffer: Buffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new BadRequestException('File không có sheet dữ liệu nào');
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, {
    defval: '',
    raw: false,
  });
  if (rows.length === 0) {
    throw new BadRequestException(
      'File không có dòng dữ liệu nào (chỉ có header hoặc rỗng)',
    );
  }
  return rows;
}

// Lấy giá trị chuỗi của một ô theo nhiều tên header có thể có (không phân biệt hoa thường,
// bỏ khoảng trắng 2 đầu). Trả về chuỗi đã trim hoặc chuỗi rỗng.
export function pickCell(row: ImportRow, headerCandidates: string[]): string {
  for (const key of Object.keys(row)) {
    const normalized = key.trim().toLowerCase();
    if (headerCandidates.some((h) => h.trim().toLowerCase() === normalized)) {
      return String(row[key] ?? '').trim();
    }
  }
  return '';
}

// Số dòng hiển thị cho người dùng: header = dòng 1 trong Excel, dòng dữ liệu đầu = dòng 2.
export function excelRowNumber(dataRowIndex: number): number {
  return dataRowIndex + 2;
}
