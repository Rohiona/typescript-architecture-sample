import type { Equipment, Reservation } from "../../../../domain/rentals/types.js";

/** Confirmed future bookings do not create physical stock; unreturned units and preparation do consume it. */
export function getPhysicalAvailableQuantity(
  equipment: Equipment,
  reservations: readonly Reservation[],
  excludedId: string,
  now: number,
): number {
  const occupied = reservations
    .filter(
      (reservation) =>
        reservation.equipmentId === equipment.id &&
        reservation.id !== excludedId &&
        (reservation.status === "checked_out" ||
          (reservation.status === "returned" &&
            (reservation.returnedAt === null || now < reservation.returnedAt + equipment.turnaroundMinutes * 60_000))),
    )
    .reduce((total, reservation) => total + reservation.quantity, 0);
  return Math.max(0, equipment.totalQuantity - occupied);
}
