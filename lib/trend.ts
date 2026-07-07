import { Trend } from "@/lib/types";

export function computeTrend(current: number | null, previous: number | null): Trend {
  if (previous === null) return current === null ? "flat" : "new";
  if (current === null) return "flat";
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "flat";
}
