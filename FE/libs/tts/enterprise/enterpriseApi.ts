import { request } from "@/libs/tts/auth/apiClient";
import type { Enterprise, EnterpriseForm } from "./enterpriseData";

export type EnterpriseListResponse = {
  data: Enterprise[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateEnterpriseInput = EnterpriseForm & {
  accountUsername?: string;
  accountPassword?: string;
};

export function getEnterpriseList(params?: {
  page?: number;
  pageSize?: number;
  ten?: string;
  mst?: string;
  loai?: string;
  phuong?: string;
  active?: boolean;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.ten) query.set("ten", params.ten);
  if (params?.mst) query.set("mst", params.mst);
  if (params?.loai) query.set("loai", params.loai);
  if (params?.phuong) query.set("phuong", params.phuong);
  if (params?.active !== undefined) query.set("active", String(params.active));
  const qs = query.toString();
  return request<EnterpriseListResponse>(`/enterprises${qs ? `?${qs}` : ""}`);
}

export function getEnterpriseById(id: number) {
  return request<Enterprise & { form: EnterpriseForm }>(`/enterprises/${id}`);
}

export function createEnterprise(input: CreateEnterpriseInput) {
  return request<Enterprise>("/enterprises", { method: "POST", body: input });
}

export function updateEnterprise(id: number, input: Partial<EnterpriseForm>) {
  return request<Enterprise>(`/enterprises/${id}`, { method: "PUT", body: input });
}

export function deleteEnterprise(id: number) {
  return request<{ message: string }>(`/enterprises/${id}`, { method: "DELETE" });
}

export function toggleEnterpriseActive(id: number, active: boolean) {
  return request<Enterprise>(`/enterprises/${id}/active`, {
    method: "PATCH",
    body: { active },
  });
}
