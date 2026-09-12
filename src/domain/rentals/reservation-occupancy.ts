import { getEffectiveStatus } from "./reservation-status";
import type { Period, Reservation } from "./types";

/** A missing actual return time must never make unreturned equipment appear available. */
export function getReservationOccupancy(
  reservation: Reservation,
  turnaroundMinutes: number,
  now: number,
): Period | null {
  const status = getEffectiveStatus(reservation, now);
  if (status === "cancelled" || status === "expired") return null;
  if (status === "checked_out") return { startAt: reservation.startAt, endAt: Infinity };
  const releasedAt = status === "returned" ? (reservation.returnedAt ?? Infinity) : reservation.endAt;
  return { startAt: reservation.startAt, endAt: releasedAt + turnaroundMinutes * 60_000 };
}
