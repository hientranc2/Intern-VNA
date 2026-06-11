import { request } from "@/libs/tts/auth/apiClient";
import type { Permission } from "./permissionData";

export function getPermissionList() {
  return request<Permission[]>("/permissions");
}
