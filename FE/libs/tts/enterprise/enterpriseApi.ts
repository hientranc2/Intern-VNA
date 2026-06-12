import { request, requestFormData } from "@/libs/tts/auth/apiClient";

export type Business = {
  id: string;
  businessName: string;
  taxCode: string;
  businessType: string;
  mainIndustry: string;
  registeredWard: string;
  isActive: boolean;
};

export type BusinessDetail = Business & {
  licenseDate?: string;
  registeredProvince?: string;
  address?: string;
  foreignName?: string;
  email?: string;
  officePhone?: string;
  operatingProvince?: string;
  operatingWard?: string;
  operatingAddress?: string;
  representative?: string;
  representativePhone?: string;
  licenseFile?: string;
  otherFile?: string;
};

export type BusinessListResponse = {
  data: Business[];
  total: number;
  page: number;
  limit: number;
};

export type BusinessCreateResponse = {
  message: string;
  business: BusinessDetail;
  account: { username: string; password: string };
};

export function getBusinessList(params?: {
  businessName?: string;
  taxCode?: string;
  businessType?: string;
  mainIndustry?: string;
  registeredWard?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.businessName) query.set("businessName", params.businessName);
  if (params?.taxCode) query.set("taxCode", params.taxCode);
  if (params?.businessType) query.set("businessType", params.businessType);
  if (params?.mainIndustry) query.set("mainIndustry", params.mainIndustry);
  if (params?.registeredWard) query.set("registeredWard", params.registeredWard);
  if (params?.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return request<BusinessListResponse>(`/businesses${qs ? `?${qs}` : ""}`);
}

export function getBusinessById(id: string) {
  return request<BusinessDetail>(`/businesses/${id}`);
}

export function getBusinessAccount(id: string) {
  return request<{ username: string }>(`/businesses/${id}/account`);
}

export function createBusiness(formData: FormData) {
  return requestFormData<BusinessCreateResponse>("/businesses", formData);
}

export function updateBusiness(id: string, formData: FormData) {
  return requestFormData<BusinessDetail>(`/businesses/${id}`, formData, "PUT");
}

export function toggleBusinessStatus(id: string, isActive: boolean) {
  return request<{ id: string; isActive: boolean }>(`/businesses/${id}/status`, {
    method: "PATCH",
    body: { isActive },
  });
}

export function deleteBusiness(id: string) {
  return request<{ message: string }>(`/businesses/${id}`, { method: "DELETE" });
}
