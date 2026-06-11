// Client gọi API auth của backend NestJS.
// Cấu hình URL qua biến môi trường NEXT_PUBLIC_API_URL (mặc định http://localhost:3001).

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TOKEN_KEY = "tts_access_token";

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
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

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
}

// --- Hàm fetch dùng chung ---

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = false } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Không thể kết nối tới máy chủ. Vui lòng thử lại.", 0);
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const payload = data as { message?: string | string[] } | null;
    let message = "Đã có lỗi xảy ra. Vui lòng thử lại.";
    if (payload?.message) {
      message = Array.isArray(payload.message)
        ? payload.message[0]
        : payload.message;
    }
    throw new ApiError(message, res.status);
  }

  return data as T;
}

// --- API công khai ---

export function login(input: {
  username: string;
  password: string;
  rememberMe?: boolean;
}) {
  return request<{ message: string; accessToken: string; user: AuthUser }>(
    "/auth/login",
    { method: "POST", body: input },
  );
}

export function forgotPassword(email: string) {
  return request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
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
  });
}

// --- API cần token ---

export function getProfile() {
  return request<AuthUser>("/auth/profile", { auth: true });
}

export function updateProfile(input: Partial<AuthUser>) {
  return request<AuthUser>("/auth/profile", {
    method: "PUT",
    body: input,
    auth: true,
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
    auth: true,
  });
}

export function requestChangeEmailOtp() {
  return request<{ message: string }>("/auth/request-change-email", {
    method: "POST",
    body: {},
    auth: true,
  });
}

export function changeEmail(input: { otpCode: string; newEmail: string }) {
  return request<{ message: string }>("/auth/change-email", {
    method: "POST",
    body: input,
    auth: true,
  });
}

export async function uploadAvatar(file: File): Promise<{ message: string; avatarUrl: string }> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const formData = new FormData();
  formData.append("file", file);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/profile/avatar`, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch {
    throw new ApiError("Không thể kết nối tới máy chủ. Vui lòng thử lại.", 0);
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const payload = data as { message?: string | string[] } | null;
    let message = "Đã có lỗi xảy ra. Vui lòng thử lại.";
    if (payload?.message) {
      message = Array.isArray(payload.message)
        ? payload.message[0]
        : payload.message;
    }
    throw new ApiError(message, res.status);
  }

  return data as { message: string; avatarUrl: string };
}
