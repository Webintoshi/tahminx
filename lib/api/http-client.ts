import { z } from "zod";
import { apiResponseSchema } from "@/lib/api/contract-schemas";
import { env, normalizeBrowserUrl } from "@/lib/config/env";
import { getMockResponse } from "@/lib/api/mock-adapter";
import type { ApiError, ApiResponse } from "@/types/api-contract";

export class ApiClientError extends Error {
  status?: number;
  payload?: ApiError;

  constructor(message: string, status?: number, payload?: ApiError) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
  }
}

const normalizePath = (path: string) => (path.startsWith("/") ? path : `/${path}`);

const withBase = (path: string) => {
  const base = env.apiBaseUrl.endsWith("/") ? env.apiBaseUrl.slice(0, -1) : env.apiBaseUrl;
  return normalizeBrowserUrl(`${base}${normalizePath(path)}`);
};

const parseEnvelope = <T extends z.ZodTypeAny>(raw: unknown, schema: T): ApiResponse<z.infer<T>> => {
  const parsed = apiResponseSchema(schema).safeParse(raw);

  if (!parsed.success) {
    throw new ApiClientError(
      `Response parse failed: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`
    );
  }

  return parsed.data as ApiResponse<z.infer<T>>;
};

const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiClientError && error.payload) return error.payload;
  if (error instanceof Error) return { code: "REQUEST_FAILED", message: error.message };
  return { code: "UNKNOWN", message: "Unknown error" };
};

async function requestCore<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  init?: RequestInit,
  token?: string
): Promise<ApiResponse<z.infer<T>>> {
  const fullPath = withBase(path);

  if (env.apiMode === "mock") {
    const mockResponse = await getMockResponse(fullPath);
    const parsed = parseEnvelope(mockResponse, schema);
    if (!parsed.success) {
      throw new ApiClientError(parsed.error?.message ?? "Mock request failed", 400, parsed.error ?? undefined);
    }
    return parsed;
  }

  try {
    const response = await fetch(fullPath, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {})
      },
      cache: "no-store"
    });

    const raw = await response.json();
    const parsed = parseEnvelope(raw, schema);

    if (!response.ok || !parsed.success) {
      throw new ApiClientError(
        parsed.error?.message ?? `Request failed (${response.status})`,
        response.status,
        parsed.error ?? undefined
      );
    }

    return parsed;
  } catch (error) {
    if (env.mockFallback) {
      const fallback = await getMockResponse(fullPath);
      const parsed = parseEnvelope(fallback, schema);
      if (!parsed.success) {
        throw new ApiClientError(parsed.error?.message ?? "Mock fallback failed", 400, parsed.error ?? undefined);
      }
      return parsed;
    }

    throw new ApiClientError(toApiError(error).message);
  }
}

export async function publicRequest<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  init?: RequestInit
): Promise<ApiResponse<z.infer<T>>> {
  return requestCore(path, schema, init);
}

export async function privateRequest<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  token: string,
  init?: RequestInit
): Promise<ApiResponse<z.infer<T>>> {
  return requestCore(path, schema, init, token);
}
