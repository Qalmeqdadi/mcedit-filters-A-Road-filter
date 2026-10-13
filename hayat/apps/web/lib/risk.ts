import type { Status } from "./types";

export const STATUS_COLOR: Record<Status, string> = {
  NORMAL: "var(--c-normal)",
  LOW: "var(--c-low)",
  ELEVATED: "var(--c-elevated)",
  HIGH: "var(--c-high)",
  CRITICAL: "var(--c-critical)",
  DISRUPTED: "var(--c-critical)",
  EXPOSED: "var(--c-elevated)",
};

export function statusColor(status: Status | undefined): string {
  return STATUS_COLOR[status ?? "NORMAL"];
}
