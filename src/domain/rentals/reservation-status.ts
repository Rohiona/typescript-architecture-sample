import type { Reservation, ReservationStatus } from "./types";

export function getEffectiveStatus(reservation: Reservation, now: number): ReservationStatus {
  return reservation.status === "held" && now >= reservation.holdExpiresAt ? "expired" : reservation.status;
}
