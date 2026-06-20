import { request, requestFormData } from "@/libs/tts/auth/apiClient";
import type { BusinessSector } from "./businessSectorData";

export type CreateBusinessSectorInput = {
  ma: string;
  ten: string;
  cap: number;
  cha?: string;
};

export function getBusinessSectorList() {
  return request<BusinessSector[]>("/business-sectors");
}

export function createBusinessSector(input: CreateBusinessSectorInput) {
  return request<BusinessSector>("/business-sectors", {
    method: "POST",
    body: input,
  });
}

export function updateBusinessSector(id: number, input: Partial<CreateBusinessSectorInput>) {
  return request<BusinessSector>(`/business-sectors/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteBusinessSector(id: number) {
  return request<{ message: string }>(`/business-sectors/${id}`, {
    method: "DELETE",
  });
}

export function importBusinessSectors(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return requestFormData<{ message: string; imported: number }>("/business-sectors/import", fd, "POST");
}
