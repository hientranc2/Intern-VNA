import { request } from "@/libs/tts/auth/apiClient";
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
