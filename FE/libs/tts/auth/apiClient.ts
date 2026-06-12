// Shared HTTP client cho toàn bộ API calls trong dự án.
// Tự động đính kèm Bearer token và xử lý lỗi 401 (redirect về login).

import { getToken, clearToken } from "./authApi";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function handle401(): never {
  clearToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
  throw new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", 401);
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

  if (res.status === 401 && auth) return handle401();

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

  if (res.status === 401) return handle401();

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
