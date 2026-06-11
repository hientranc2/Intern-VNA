import { request } from "@/libs/tts/auth/apiClient";
import type { ReportConfig } from "./reportConfigData";

export type CreateReportConfigInput = {
  nam: string;
  ten: string;
  ky: string;
  batDau: string;
  ketThuc: string;
  active?: boolean;
};

export function getReportConfigList() {
  return request<ReportConfig[]>("/report-configs");
}

export function createReportConfig(input: CreateReportConfigInput) {
  return request<ReportConfig>("/report-configs", {
    method: "POST",
    body: input,
  });
}

export function updateReportConfig(id: number, input: Partial<CreateReportConfigInput>) {
  return request<ReportConfig>(`/report-configs/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteReportConfig(id: number) {
  return request<{ message: string }>(`/report-configs/${id}`, {
    method: "DELETE",
  });
}

export function toggleReportConfigActive(id: number, active: boolean) {
  return request<ReportConfig>(`/report-configs/${id}/active`, {
    method: "PATCH",
    body: { active },
  });
}
