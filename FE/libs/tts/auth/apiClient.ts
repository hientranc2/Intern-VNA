// Shared HTTP client cho toàn bộ API calls trong dự án.
// Tự động đính kèm Bearer token và xử lý lỗi 401 (redirect về login).

import { getToken, clearToken, getBusinessId } from "./authApi";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Chuyển đường dẫn asset tương đối từ BE (vd /uploads/avatars/x.png) thành URL đầy đủ.
export function assetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const ACCOUNT_LOCKED_KEY = "tts_account_locked";

function extractMessage(data: unknown): string | undefined {
  const payload = data as { message?: string | string[] } | null;
  if (!payload?.message) return undefined;
  return Array.isArray(payload.message) ? payload.message[0] : payload.message;
}

function handle401(message?: string): never {
  const isBusiness = typeof window !== "undefined" && !!getBusinessId();
  // Tài khoản bị khóa giữa phiên: đánh dấu để trang login hiện popup thông báo.
  const locked = !!message && /(kh[oó]a|vô hiệu)/i.test(message);
  if (locked && typeof window !== "undefined") {
    window.sessionStorage.setItem(ACCOUNT_LOCKED_KEY, message as string);
  }
  clearToken();
  if (typeof window !== "undefined") {
    window.location.href = isBusiness ? "/enterprise-login" : "/login";
  }
  throw new ApiError(message ?? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", 401);
}

export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;

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

  if (res.status === 401 && auth) return handle401(extractMessage(data));

  if (!res.ok) {
    throw new ApiError(extractMessage(data) ?? "Đã có lỗi xảy ra. Vui lòng thử lại.", res.status);
  }

  return data as T;
}

export async function requestFormData<T>(path: string, formData: FormData, method: "POST" | "PUT" = "POST"): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
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

  if (res.status === 401) return handle401(extractMessage(data));

  if (!res.ok) {
    throw new ApiError(extractMessage(data) ?? "Đã có lỗi xảy ra. Vui lòng thử lại.", res.status);
  }

  return data as T;
}
