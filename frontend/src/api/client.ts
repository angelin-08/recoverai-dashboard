import type { ApiResponse } from "@/types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "http://127.0.0.1:8000";
const API_PREFIX = "/api";

export class ApiErrorClass extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string = "API_ERROR", details?: any) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-merchant-id": "demo-merchant-001",
    ...(options.headers as Record<string, string>),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const json: ApiResponse<T> = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      const err = (json as any)?.error;
      throw new ApiErrorClass(
        err?.message || `HTTP error ${res.status}: ${res.statusText}`,
        err?.code || `HTTP_${res.status}`,
        err?.details,
      );
    }

    return json.data;
  } catch (err: any) {
    if (err instanceof ApiErrorClass) {
      throw err;
    }
    // Network failure (server offline)
    throw new ApiErrorClass(
      "Backend server is unavailable. Make sure the FastAPI server is running on " + API_BASE_URL,
      "NETWORK_ERROR",
      err,
    );
  }
}
