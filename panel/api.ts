import type { GuestRequest, GuestRequestResult } from "@openchamber/sdk";
import type {
  CreateMemoryInput,
  MemoryPage,
  MemoryStats,
  MemoryTag,
  UpdateMemoryInput,
  UserProfile,
} from "./types";

type ServiceHost = {
  serviceRequest(request: GuestRequest): Promise<GuestRequestResult>;
};

export type MemoryApiErrorCode =
  | "NO_SERVICE"
  | "SERVICE_FAILED"
  | "UPSTREAM_UNAUTHORIZED"
  | "UPSTREAM_ERROR"
  | "INVALID_RESPONSE";

export class MemoryApiError extends Error {
  constructor(readonly code: MemoryApiErrorCode, message: string) {
    super(message);
    this.name = "MemoryApiError";
  }
}

export type MemoryApi = {
  getMemories(input: { page: number; pageSize: number; includePrompts?: boolean; containerTag?: string }): Promise<MemoryPage>;
  searchMemories(input: { query: string; page: number; pageSize: number; containerTag?: string }): Promise<MemoryPage>;
  getTags(): Promise<{ project: MemoryTag[] }>;
  getStats(): Promise<MemoryStats>;
  createMemory(input: CreateMemoryInput): Promise<Record<string, unknown>>;
  updateMemory(id: string, input: UpdateMemoryInput): Promise<Record<string, unknown>>;
  deleteMemory(id: string): Promise<Record<string, unknown>>;
  bulkDelete(ids: string[]): Promise<Record<string, unknown>>;
  pinMemory(id: string): Promise<Record<string, unknown>>;
  unpinMemory(id: string): Promise<Record<string, unknown>>;
  cleanup(): Promise<Record<string, unknown>>;
  deduplicate(): Promise<Record<string, unknown>>;
  getUserProfile(): Promise<UserProfile>;
  refreshUserProfile(): Promise<Record<string, unknown>>;
};

function errorMessage(value: unknown, fallback: string): string {
  if (typeof value === "object" && value !== null) {
    const error = "error" in value ? value.error : undefined;
    const message = "message" in value ? value.message : undefined;
    if (typeof error === "string") {
      return error;
    }
    if (typeof message === "string") {
      return message;
    }
  }
  return fallback;
}

function mapServiceError(error: unknown): MemoryApiError {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = error.code;
    const message = errorMessage(error, "The local service request failed");
    if (code === "NO_SERVICE" || code === "SERVICE_FAILED") {
      return new MemoryApiError(code, message);
    }
  }
  return new MemoryApiError("SERVICE_FAILED", "The local service request failed");
}

function decode<T>(result: GuestRequestResult): T {
  let value: unknown;
  try {
    value = JSON.parse(result.body);
  } catch {
    if (result.status < 200 || result.status >= 300) {
      throw new MemoryApiError(
        result.status === 401 ? "UPSTREAM_UNAUTHORIZED" : "UPSTREAM_ERROR",
        `The upstream request failed with status ${result.status}`,
      );
    }
    throw new MemoryApiError("INVALID_RESPONSE", "The service returned invalid JSON");
  }

  const message = errorMessage(value, `The upstream request failed with status ${result.status}`);
  if (result.status < 200 || result.status >= 300) {
    throw new MemoryApiError(result.status === 401 ? "UPSTREAM_UNAUTHORIZED" : "UPSTREAM_ERROR", message);
  }
  if (typeof value !== "object" || value === null || !("success" in value)) {
    throw new MemoryApiError("INVALID_RESPONSE", "The service returned an invalid response envelope");
  }
  if (value.success !== true) {
    throw new MemoryApiError("UPSTREAM_ERROR", message);
  }
  if (!("data" in value)) {
    throw new MemoryApiError("INVALID_RESPONSE", "The service response is missing data");
  }
  return value.data as T;
}

function query(values: Record<string, string | number | boolean | undefined>): Record<string, string> | undefined {
  const entries = Object.entries(values).flatMap(([key, value]) =>
    value === undefined ? [] : [[key, String(value)]],
  );
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function createMemoryApi(host: ServiceHost): MemoryApi {
  async function request<T>(request: GuestRequest): Promise<T> {
    try {
      return decode<T>(await host.serviceRequest(request));
    } catch (error) {
      if (error instanceof MemoryApiError) {
        throw error;
      }
      throw mapServiceError(error);
    }
  }

  return {
    getMemories: (input) =>
      request({
        method: "GET",
        path: "/memory-api/api/memories",
        query: query(input),
      }),
    searchMemories: (input) =>
      request({
        method: "GET",
        path: "/memory-api/api/search",
        query: query({
          q: input.query,
          page: input.page,
          pageSize: input.pageSize,
          containerTag: input.containerTag,
        }),
      }),
    getTags: () => request({ method: "GET", path: "/memory-api/api/tags" }),
    getStats: () => request({ method: "GET", path: "/memory-api/api/stats" }),
    createMemory: (input) =>
      request({ method: "POST", path: "/memory-api/api/memories", body: JSON.stringify(input) }),
    updateMemory: (id, input) =>
      request({ method: "PUT", path: `/memory-api/api/memories/${encodeURIComponent(id)}`, body: JSON.stringify(input) }),
    deleteMemory: (id) => request({ method: "DELETE", path: `/memory-api/api/memories/${encodeURIComponent(id)}` }),
    bulkDelete: (ids) => request({ method: "POST", path: "/memory-api/api/memories/bulk-delete", body: JSON.stringify({ ids }) }),
    pinMemory: (id) => request({ method: "POST", path: `/memory-api/api/memories/${encodeURIComponent(id)}/pin` }),
    unpinMemory: (id) => request({ method: "POST", path: `/memory-api/api/memories/${encodeURIComponent(id)}/unpin` }),
    cleanup: () => request({ method: "POST", path: "/memory-api/api/cleanup" }),
    deduplicate: () => request({ method: "POST", path: "/memory-api/api/deduplicate" }),
    getUserProfile: () => request({ method: "GET", path: "/memory-api/api/user-profile" }),
    refreshUserProfile: () => request({ method: "POST", path: "/memory-api/api/user-profile/refresh" }),
  };
}
