import { periodsOverlap } from "./period";
import type { Period } from "./types";

export interface QuantityOccupancy {
  period: Period;
  quantity: number;
}

/** Count peak simultaneous use inside the requested window, not all intersecting reservations. */
export function getMaximumConcurrentQuantity(occupancies: readonly QuantityOccupancy[], window: Period): number {
  const changes = new Map<number, number>();
  for (const occupancy of occupancies) {
    if (!periodsOverlap(occupancy.period, window)) continue;
    const start = Math.max(occupancy.period.startAt, window.startAt);
    const end = Math.min(occupancy.period.endAt, window.endAt);
    changes.set(start, (changes.get(start) ?? 0) + occupancy.quantity);
    changes.set(end, (changes.get(end) ?? 0) - occupancy.quantity);
  }
  let current = 0;
  let maximum = 0;
  // Combine changes at equal timestamps before counting: an ending interval is no longer occupied.
  for (const [, change] of [...changes].sort(([left], [right]) => left - right)) {
    current += change;
    maximum = Math.max(maximum, current);
  }
  return maximum;
}
