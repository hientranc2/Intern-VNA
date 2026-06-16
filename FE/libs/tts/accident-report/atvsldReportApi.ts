// API cho cụm "Ký báo cáo / Báo cáo định kỳ ATVSLĐ (Phụ lục II – TT 07/2016)".
// Dùng chung 1 tài nguyên /atvsld-reports cho cả Role Doanh nghiệp (khai báo + nộp)
// và Role Sở (tiếp nhận + duyệt/từ chối hàng loạt).
//
// LƯU Ý: BE chưa có các endpoint này (xem docs/atvsld-report-api.md). Khi BE sẵn sàng,
// thay mock INITIAL_ATVSLD_REPORTS / SAMPLE_DECLARATION trong 2 page bằng các hàm dưới đây.
import { request } from "@/libs/tts/auth/apiClient";
import type { AtvsldReport, DeclarationValues } from "./atvsldReportData";

// ─── Response types ──────────────────────────────────────────────────────────

// Chi tiết 1 báo cáo: record danh sách + nội dung khai báo (Phụ lục II).
export type AtvsldReportDetail = AtvsldReport & {
  declaration: DeclarationValues;
};

// Danh sách phía Sở có phân trang (đồng bộ với /accident-reports).
export type AtvsldReportListResponse = {
  data: AtvsldReport[];
  total: number;
  page: number;
  pageSize: number;
};

// ─── Input types ─────────────────────────────────────────────────────────────

export type SaveAtvsldReportInput = {
  ky: AtvsldReport["ky"];
  nam: number;
  declaration: DeclarationValues;
};

export type RejectInput = { lyDoTuChoi: string };

// ─── Role Doanh nghiệp ───────────────────────────────────────────────────────

export function getMyAtvsldReports(params?: {
  nam?: number;
  status?: string;
  ky?: string;
}) {
  const query = new URLSearchParams();
  if (params?.nam) query.set("nam", String(params.nam));
  if (params?.status) query.set("status", params.status);
  if (params?.ky) query.set("ky", params.ky);
  const qs = query.toString();
  return request<AtvsldReport[]>(`/atvsld-reports/my${qs ? `?${qs}` : ""}`);
}

export function getAtvsldReportById(id: number) {
  return request<AtvsldReportDetail>(`/atvsld-reports/${id}`);
}

// Tạo bản khai mới (DN). BE set status = "Nhập liệu".
export function createAtvsldReport(input: SaveAtvsldReportInput) {
  return request<AtvsldReport>("/atvsld-reports", { method: "POST", body: input });
}

// Lưu nháp / sửa lại khi bị từ chối. BE giữ/đặt status = "Nhập liệu".
export function updateAtvsldReport(id: number, input: Partial<SaveAtvsldReportInput>) {
  return request<AtvsldReport>(`/atvsld-reports/${id}`, { method: "PUT", body: input });
}

// Gửi báo cáo: status -> "Chờ tiếp nhận" (BE validate đủ field bắt buộc).
export function submitAtvsldReport(id: number) {
  return request<AtvsldReport>(`/atvsld-reports/${id}/submit`, { method: "PATCH" });
}

// ─── Role Sở ─────────────────────────────────────────────────────────────────

export function getAtvsldReportList(params?: {
  nam?: number;
  ten?: string;
  mst?: string;
  ward?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const query = new URLSearchParams();
  if (params?.nam) query.set("nam", String(params.nam));
  if (params?.ten) query.set("ten", params.ten);
  if (params?.mst) query.set("mst", params.mst);
  if (params?.ward) query.set("ward", params.ward);
  if (params?.status) query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  const qs = query.toString();
  return request<AtvsldReportListResponse>(`/atvsld-reports${qs ? `?${qs}` : ""}`);
}

// Duyệt 1 báo cáo -> "Hoàn thành".
export function approveAtvsldReport(id: number) {
  return request<{ message: string }>(`/atvsld-reports/${id}/approve`, { method: "POST" });
}

// Từ chối 1 báo cáo -> "Từ chối".
export function rejectAtvsldReport(id: number, input: RejectInput) {
  return request<{ message: string }>(`/atvsld-reports/${id}/reject`, {
    method: "POST",
    body: input,
  });
}

// Duyệt hàng loạt (trang Sở chọn nhiều bằng checkbox).
export function approveAtvsldReports(ids: number[]) {
  return request<{ message: string }>("/atvsld-reports/approve", {
    method: "POST",
    body: { ids },
  });
}

// Từ chối hàng loạt với 1 lý do chung.
export function rejectAtvsldReports(ids: number[], lyDoTuChoi: string) {
  return request<{ message: string }>("/atvsld-reports/reject", {
    method: "POST",
    body: { ids, lyDoTuChoi },
  });
}
