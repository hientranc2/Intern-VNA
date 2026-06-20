import { request, requestFormData } from "@/libs/tts/auth/apiClient";
import type { InjuryFactor, TreeNode } from "./categoryData";

// --- Yếu tố gây chấn thương ---

export type CreateInjuryFactorInput = {
  ma: string;
  ten: string;
  active?: boolean;
};

export function getInjuryFactorList() {
  return request<InjuryFactor[]>("/categories/injury-factors");
}

export function createInjuryFactor(input: CreateInjuryFactorInput) {
  return request<InjuryFactor>("/categories/injury-factors", {
    method: "POST",
    body: input,
  });
}

export function updateInjuryFactor(id: number, input: Partial<CreateInjuryFactorInput>) {
  return request<InjuryFactor>(`/categories/injury-factors/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteInjuryFactor(id: number) {
  return request<{ message: string }>(`/categories/injury-factors/${id}`, {
    method: "DELETE",
  });
}

export function toggleInjuryFactorActive(id: number, active: boolean) {
  return request<InjuryFactor>(`/categories/injury-factors/${id}/active`, {
    method: "PATCH",
    body: { active },
  });
}

// --- Loại chấn thương ---

export type CreateTreeNodeInput = {
  ma: string;
  ten: string;
  cap: number;
  cha?: string;
};

export function getInjuryTypeList() {
  return request<TreeNode[]>("/categories/injury-types");
}

export function createInjuryType(input: CreateTreeNodeInput) {
  return request<TreeNode>("/categories/injury-types", {
    method: "POST",
    body: input,
  });
}

export function updateInjuryType(id: number, input: Partial<CreateTreeNodeInput>) {
  return request<TreeNode>(`/categories/injury-types/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteInjuryType(id: number) {
  return request<{ message: string }>(`/categories/injury-types/${id}`, {
    method: "DELETE",
  });
}

// --- Nghề nghiệp ---

export function getOccupationList() {
  return request<TreeNode[]>("/categories/occupations");
}

export function createOccupation(input: CreateTreeNodeInput) {
  return request<TreeNode>("/categories/occupations", {
    method: "POST",
    body: input,
  });
}

export function updateOccupation(id: number, input: Partial<CreateTreeNodeInput>) {
  return request<TreeNode>(`/categories/occupations/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteOccupation(id: number) {
  return request<{ message: string }>(`/categories/occupations/${id}`, {
    method: "DELETE",
  });
}

export function importInjuryFactors(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return requestFormData<{ message: string; imported: number }>("/categories/injury-factors/import", fd, "POST");
}

export function importInjuryTypes(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return requestFormData<{ message: string; imported: number }>("/categories/injury-types/import", fd, "POST");
}

export function importOccupations(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return requestFormData<{ message: string; imported: number }>("/categories/occupations/import", fd, "POST");
}
