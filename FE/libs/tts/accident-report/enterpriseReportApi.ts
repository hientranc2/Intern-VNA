// API cho Role Doanh nghiệp: nộp và xem báo cáo TNLĐ.
import { request } from "@/libs/tts/auth/apiClient";

export type DnReportRecord = {
  id: number;
  ten: string;
  mst: string;
  ky: string;
  tt: "Đang báo cáo" | "Đã nộp";
  configId: number;
};

export type AccidentDetailRow = {
  id: number;
  hoTen: string;
  ngaySinh: string;
  gioiTinh: string;
  ngheNghiep: string;
  loaiHopDong: string;
  mucDo: string;
  ngayXayRa: string;
  diaDiem: string;
  yeuTo: string;
};

// 13 số liệu tổng hợp phần I (khớp cột phần II của biểu mẫu Sở).
export type ReportTongHop = {
  soLaoDong: number;
  soLDCoBaoHiem: number;
  soLDNu: number;
  soVu: number;
  soVuCoNguoiChet: number;
  soVuCo2NguoiBiNan: number;
  soNguoiBiNan: number;
  soNguoiBiChet: number;
  soNguoiBiThuongNang: number;
  soNgayNghi: number;
  tongSoTien: number;
  chiPhiYTe: number;
  chiPhiTraLuong: number;
  boiThuongTroCap: number;
  thiethaiTaiSan: number;
};

export type DnReportForm = {
  configId: number;
  status?: string;
  tongSoRows: Record<string, number[]>;
  chiTietRows: AccidentDetailRow[];
  // Phân loại phần II: key mã hạng mục "1".."24" -> number[13]
  phanLoaiRows?: Record<string, number[]>;
} & Partial<ReportTongHop>;

export type DnReportDetail = DnReportRecord & {
  form: {
    configId: number;
    tongSoRows: Record<string, number[]>;
    chiTietRows: AccidentDetailRow[];
    phanLoaiRows: Record<string, number[]>;
    tongHop: ReportTongHop;
  };
};

export function getDnReportList() {
  return request<DnReportRecord[]>("/enterprise-reports/my");
}

export function getDnReportById(id: number) {
  return request<DnReportDetail>(`/enterprise-reports/${id}`);
}

export function submitDnReport(input: DnReportForm) {
  return request<DnReportRecord>("/enterprise-reports", {
    method: "POST",
    body: input,
  });
}

export function updateDnReport(id: number, input: Partial<DnReportForm>) {
  return request<DnReportRecord>(`/enterprise-reports/${id}`, {
    method: "PUT",
    body: input,
  });
}
