import { request } from "@/libs/tts/auth/apiClient";
import type { User } from "./userData";

export type CreateUserInput = {
  username: string;
  fullname: string;
  email: string;
  password: string;
  role: string;
  chucdanh?: string;
  dob?: string;
  gender?: string;
  tinh?: string;
  phuong?: string;
  diachi?: string;
};

export type UpdateUserInput = Partial<Omit<CreateUserInput, "username" | "password">>;

export type UserListResponse = {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
};

export function getUserList(params?: {
  page?: number;
  pageSize?: number;
  fullname?: string;
  username?: string;
  email?: string;
  role?: string;
  chucdanh?: string;
  active?: boolean;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.fullname) query.set("fullname", params.fullname);
  if (params?.username) query.set("username", params.username);
  if (params?.email) query.set("email", params.email);
  if (params?.role) query.set("role", params.role);
  if (params?.chucdanh) query.set("chucdanh", params.chucdanh);
  if (params?.active !== undefined) query.set("active", String(params.active));
  const qs = query.toString();
  return request<UserListResponse>(`/users${qs ? `?${qs}` : ""}`);
}

export function getUserById(id: number) {
  return request<User>(`/users/${id}`);
}

export function createUser(input: CreateUserInput) {
  return request<User>("/users", { method: "POST", body: input });
}

export function updateUser(id: number, input: UpdateUserInput) {
  return request<User>(`/users/${id}`, { method: "PUT", body: input });
}

export function deleteUser(id: number) {
  return request<{ message: string }>(`/users/${id}`, { method: "DELETE" });
}

export function toggleUserActive(id: number, active: boolean) {
  return request<User>(`/users/${id}/active`, { method: "PATCH", body: { active } });
}

export function resetUserPassword(id: number, newPassword: string) {
  return request<{ message: string }>(`/users/${id}/reset-password`, {
    method: "POST",
    body: { newPassword },
  });
}
