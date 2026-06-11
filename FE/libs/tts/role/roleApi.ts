import { request } from "@/libs/tts/auth/apiClient";
import type { Role } from "./roleData";

export type CreateRoleInput = {
  ma: string;
  ten: string;
  perms: string[];
};

export type UpdateRoleInput = Partial<CreateRoleInput>;

export function getRoleList() {
  return request<Role[]>("/roles");
}

export function getRoleById(id: number) {
  return request<Role>(`/roles/${id}`);
}

export function createRole(input: CreateRoleInput) {
  return request<Role>("/roles", { method: "POST", body: input });
}

export function updateRole(id: number, input: UpdateRoleInput) {
  return request<Role>(`/roles/${id}`, { method: "PUT", body: input });
}

export function deleteRole(id: number) {
  return request<{ message: string }>(`/roles/${id}`, { method: "DELETE" });
}
