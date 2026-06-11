import { request } from "@/libs/tts/auth/apiClient";
import type { EnterpriseType } from "./enterpriseTypeData";

export type CreateEnterpriseTypeInput = {
  ma: string;
  ten: string;
  active?: boolean;
};

export function getEnterpriseTypeList() {
  return request<EnterpriseType[]>("/enterprise-types");
}

export function createEnterpriseType(input: CreateEnterpriseTypeInput) {
  return request<EnterpriseType>("/enterprise-types", {
    method: "POST",
    body: input,
  });
}

export function updateEnterpriseType(id: number, input: Partial<CreateEnterpriseTypeInput>) {
  return request<EnterpriseType>(`/enterprise-types/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteEnterpriseType(id: number) {
  return request<{ message: string }>(`/enterprise-types/${id}`, {
    method: "DELETE",
  });
}

export function toggleEnterpriseTypeActive(id: number, active: boolean) {
  return request<EnterpriseType>(`/enterprise-types/${id}/active`, {
    method: "PATCH",
    body: { active },
  });
}
