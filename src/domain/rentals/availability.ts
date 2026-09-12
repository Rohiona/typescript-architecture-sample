import { getMaximumConcurrentQuantity, type QuantityOccupancy } from "./concurrent-quantity";
import { isValidPeriod, periodsOverlap } from "./period";
import { getReservationOccupancy } from "./reservation-occupancy";
import type { Equipment, Period, Reservation } from "./types";

export function getAvailableQuantity(
  equipment: Equipment,
  reservations: Reservation[],
  period: Period,
  now: number,
): number {
  if (!isValidPeriod(period) || !Number.isFinite(now)) return 0;
  const requestedOccupancy = {
    startAt: period.startAt,
    endAt: period.endAt + equipment.turnaroundMinutes * 60_000,
  };
  if (equipment.maintenance.some((maintenance) => periodsOverlap(maintenance, requestedOccupancy))) return 0;
  const occupancies: QuantityOccupancy[] = [];
  for (const reservation of reservations) {
    if (reservation.equipmentId !== equipment.id) continue;
    const occupied = getReservationOccupancy(reservation, equipment.turnaroundMinutes, now);
    if (occupied) occupancies.push({ period: occupied, quantity: reservation.quantity });
  }
  return Math.max(0, equipment.totalQuantity - getMaximumConcurrentQuantity(occupancies, requestedOccupancy));
}
