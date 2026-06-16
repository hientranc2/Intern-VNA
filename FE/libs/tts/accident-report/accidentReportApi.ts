import { request } from "@/libs/tts/auth/apiClient";
import type { AccidentReport } from "./accidentReportData";

export type AccidentReportListResponse = {
  data: AccidentReport[];
  total: number;
  page: number;
  pageSize: number;
};

export type AccidentReportDetail = {
  id: number;
  enterpriseId: number;
  configId: number;
  rows: Record<string, number[]>;
  submittedAt?: string;
  status: "Đang báo cáo" | "Đã tiếp nhận";
};

export function getAccidentReportList(params?: {
  page?: number;
  pageSize?: number;
  ten?: string;
  mst?: string;
  ky?: string;
  tt?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.ten) query.set("ten", params.ten);
  if (params?.mst) query.set("mst", params.mst);
  if (params?.ky) query.set("ky", params.ky);
  if (params?.tt) query.set("tt", params.tt);
  const qs = query.toString();
  return request<AccidentReportListResponse>(`/accident-reports${qs ? `?${qs}` : ""}`);
}

export function getAccidentReportById(id: number) {
  return request<AccidentReportDetail>(`/accident-reports/${id}`);
}

export function approveAccidentReport(id: number) {
  return request<{ message: string }>(`/accident-reports/${id}/approve`, {
    method: "POST",
  });
}

export type SummaryResponse = {
  rows: Record<string, number[]>;
  phanLoai: Record<string, number[]>;
};

export function getSummaryReport(params?: { nam?: string; ky?: string }) {
  const query = new URLSearchParams();
  if (params?.nam) query.set("nam", params.nam);
  if (params?.ky) query.set("ky", params.ky);
  const qs = query.toString();
  return request<SummaryResponse>(`/accident-reports/summary${qs ? `?${qs}` : ""}`);
}
