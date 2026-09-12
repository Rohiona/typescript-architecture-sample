import type { Period } from "./types";

export function isValidPeriod(period: Period): boolean {
  return Number.isFinite(period.startAt) && Number.isFinite(period.endAt) && period.endAt > period.startAt;
}

/** Half-open intervals allow one reservation to begin exactly when another ends. */
export function periodsOverlap(left: Period, right: Period): boolean {
  return Math.max(left.startAt, right.startAt) < Math.min(left.endAt, right.endAt);
}
