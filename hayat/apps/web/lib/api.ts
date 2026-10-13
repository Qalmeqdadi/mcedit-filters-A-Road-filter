import type { AuditEvent, Pulse } from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_HAYAT_API_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store", ...init });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(String(detail), res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  pulse: () => request<Pulse>("/api/pulse"),
  events: (limit = 50) => request<AuditEvent[]>(`/api/events?limit=${limit}`),
  triggerDemoDisruption: () => request<Pulse>("/api/demo/disruption", { method: "POST" }),
  resetDemo: () => request<Pulse>("/api/demo/reset", { method: "POST" }),
  streamUrl: (afterId: number) => `${API_URL}/api/events/stream?after_id=${afterId}`,
};
