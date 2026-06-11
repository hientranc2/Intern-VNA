import { request } from "@/libs/tts/auth/apiClient";
import type { User } from "./userData";

export type UserListMeta = {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
};

export type UserListResponse = {
  data: User[];
  meta: UserListMeta;
};

export type CreateUserInput = {
  username: string;
  password: string;
  email: string;
  fullName: string;
  role?: string;
  jobTitle?: string;
  isActive?: boolean;
};

export type UpdateUserInput = {
  fullName?: string;
  email?: string;
  role?: string;
  jobTitle?: string;
  isActive?: boolean;
};

export function getUserList(params?: {
  page?: number;
  limit?: number;
  fullName?: string;
  username?: string;
  email?: string;
  role?: string;
  jobTitle?: string;
  isActive?: boolean;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.fullName) query.set("fullName", params.fullName);
  if (params?.username) query.set("username", params.username);
  if (params?.email) query.set("email", params.email);
  if (params?.role) query.set("role", params.role);
  if (params?.jobTitle) query.set("jobTitle", params.jobTitle);
  if (params?.isActive !== undefined) query.set("isActive", String(params.isActive));
  const qs = query.toString();
  return request<UserListResponse>(`/admin/users${qs ? `?${qs}` : ""}`);
}

export function createUser(input: CreateUserInput) {
  return request<{ message: string; user: User }>("/admin/users", {
    method: "POST",
    body: input,
  });
}

export function updateUser(id: string, input: UpdateUserInput) {
  return request<{ message: string; user: User }>(`/admin/users/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function toggleUserStatus(id: string) {
  return request<{ message: string; isActive: boolean }>(`/admin/users/${id}/status`, {
    method: "PATCH",
  });
}

export function resetUserPassword(id: string, newPassword: string) {
  return request<{ message: string }>(`/admin/users/${id}/reset-password`, {
    method: "PATCH",
    body: { newPassword },
  });
}
