// Client gọi API auth của backend NestJS.
// Cấu hình URL qua biến môi trường NEXT_PUBLIC_API_URL (mặc định http://localhost:3001).

export { ApiError } from "./apiClient";
import { request, requestFormData } from "./apiClient";

const TOKEN_KEY = "tts_access_token";
const BUSINESS_ID_KEY = "tts_business_id";
const PERMISSIONS_KEY = "tts_permissions";
const IS_SUPER_KEY = "tts_is_super";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  dob?: string | null;
  gender?: string | null;
  jobTitle?: string | null;
  role: string;
  avatarUrl?: string | null;
  province?: string | null;
  ward?: string | null;
  address?: string | null;
  isActive: boolean;
  permissions?: string[];
  roleName?: string;
  isSuper?: boolean; // user là ADMIN hoặc giữ vai trò toàn quyền (CEO)
};

// --- Quản lý token (chỉ chạy phía client) ---

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(BUSINESS_ID_KEY);
  window.localStorage.removeItem(PERMISSIONS_KEY);
  window.localStorage.removeItem(IS_SUPER_KEY);
}

export function setIsSuper(isSuper: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IS_SUPER_KEY, isSuper ? "1" : "0");
}

export function getIsSuper(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(IS_SUPER_KEY) === "1";
}

export function setPermissions(perms: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms));
}

export function getPermissions(): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(PERMISSIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setBusinessId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BUSINESS_ID_KEY, id);
}

export function getBusinessId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(BUSINESS_ID_KEY);
}

export type BusinessAccount = {
  id: string;
  username: string;
  role: string;
  businessId: string;
  businessName: string;
};

// --- API công khai (không cần token) ---

export function login(input: {
  username: string;
  password: string;
  rememberMe?: boolean;
}) {
  return request<{ message: string; accessToken: string; user: AuthUser }>(
    "/auth/login",
    { method: "POST", body: input, auth: false },
  );
}

export function loginBusiness(input: {
  username: string;
  password: string;
  rememberMe?: boolean;
}) {
  return request<{ message: string; accessToken: string; account: BusinessAccount }>(
    "/auth/business-login",
    { method: "POST", body: input, auth: false },
  );
}

export function sendRegisterOtp(email: string) {
  return request<{ message: string }>("/auth/register/send-otp", {
    method: "POST",
    body: { email },
    auth: false,
  });
}

export function verifyRegisterOtp(email: string, otpCode: string) {
  return request<{ message: string }>("/auth/register/verify-otp", {
    method: "POST",
    body: { email, otpCode },
    auth: false,
  });
}

export function forgotPassword(email: string) {
  return request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
    auth: false,
  });
}

export function resetPassword(input: {
  email: string;
  otpCode: string;
  newPassword: string;
}) {
  return request<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: input,
    auth: false,
  });
}

// --- API cần token ---

export function getProfile() {
  return request<AuthUser>("/auth/profile");
}

export function updateProfile(input: Partial<AuthUser>) {
  return request<AuthUser>("/auth/profile", {
    method: "PUT",
    body: input,
  });
}

export function changePassword(input: {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return request<{ message: string }>("/auth/change-password", {
    method: "POST",
    body: input,
  });
}

export function requestChangeEmailOtp() {
  return request<{ message: string }>("/auth/request-change-email", {
    method: "POST",
    body: {},
  });
}

export function changeEmail(input: { otpCode: string; newEmail: string }) {
  return request<{ message: string }>("/auth/change-email", {
    method: "POST",
    body: input,
  });
}

export function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return requestFormData<{ message: string; avatarUrl: string }>(
    "/auth/profile/avatar",
    formData,
  );
}
