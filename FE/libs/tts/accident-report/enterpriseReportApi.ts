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

export type DnReportForm = {
  configId: number;
  tongSoRows: Record<string, number[]>;
  chiTietRows: AccidentDetailRow[];
};

export function getDnReportList() {
  return request<DnReportRecord[]>("/enterprise-reports/my");
}

export function getDnReportById(id: number) {
  return request<DnReportRecord & { form: DnReportForm }>(`/enterprise-reports/${id}`);
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
