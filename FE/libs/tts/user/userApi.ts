import { request, requestFormData } from "@/libs/tts/auth/apiClient";
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
  roleId?: number;
  jobTitle?: string;
  isActive?: boolean;
  avatar?: File | null;
  dob?: string;
  gender?: string;
  province?: string;
  ward?: string;
  address?: string;
};

export type UpdateUserInput = {
  fullName?: string;
  email?: string;
  role?: string;
  roleId?: number;
  jobTitle?: string;
  isActive?: boolean;
  avatar?: File | null;
  dob?: string;
  gender?: string;
  province?: string;
  ward?: string;
  address?: string;
};

export function getUserList(params?: {
  page?: number;
  limit?: number;
  fullName?: string;
  username?: string;
  email?: string;
  role?: string;
  roleId?: number;
  jobTitle?: string;
  isActive?: boolean;
  province?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.fullName) query.set("fullName", params.fullName);
  if (params?.username) query.set("username", params.username);
  if (params?.email) query.set("email", params.email);
  if (params?.role) query.set("role", params.role);
  if (params?.roleId !== undefined) query.set("roleId", String(params.roleId));
  if (params?.jobTitle) query.set("jobTitle", params.jobTitle);
  if (params?.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params?.province) query.set("province", params.province);
  const qs = query.toString();
  return request<UserListResponse>(`/admin/users${qs ? `?${qs}` : ""}`);
}

// Build FormData từ input — chỉ append field có giá trị để tránh gửi chuỗi rỗng
// làm hỏng transform số/boolean ở BE.
function buildUserFormData(
  input: CreateUserInput | UpdateUserInput,
): FormData {
  const fd = new FormData();
  if ("username" in input && input.username)
    fd.append("username", input.username);
  if ("password" in input && input.password)
    fd.append("password", input.password);
  if (input.email) fd.append("email", input.email);
  if (input.fullName) fd.append("fullName", input.fullName);
  if (input.role) fd.append("role", input.role);
  if (input.roleId !== undefined) fd.append("roleId", String(input.roleId));
  if (input.jobTitle) fd.append("jobTitle", input.jobTitle);
  if (input.isActive !== undefined)
    fd.append("isActive", String(input.isActive));
  if (input.avatar) fd.append("avatar", input.avatar);
  if (input.dob) fd.append("dob", input.dob);
  if (input.gender) fd.append("gender", input.gender);
  if (input.province) fd.append("province", input.province);
  if (input.ward) fd.append("ward", input.ward);
  if (input.address) fd.append("address", input.address);
  return fd;
}

export function createUser(input: CreateUserInput) {
  return requestFormData<{ message: string; user: User }>(
    "/admin/users",
    buildUserFormData(input),
    "POST",
  );
}

export function updateUser(id: string, input: UpdateUserInput) {
  return requestFormData<{ message: string; user: User }>(
    `/admin/users/${id}`,
    buildUserFormData(input),
    "PUT",
  );
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

export function deleteUser(id: string) {
  return request<{ message: string }>(`/admin/users/${id}`, { method: "DELETE" });
}

export function importUsers(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return requestFormData<{ message: string; imported: number }>("/admin/users/import", fd, "POST");
}

