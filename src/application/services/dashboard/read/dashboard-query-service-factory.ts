import type { Dashboard } from "../../../../contracts/dashboard.js";
import { getEffectiveStatus } from "../../../../domain/rentals/reservation-status.js";
import type { ClockQueryPort } from "../../../ports/clock-query-port.js";
import type { RentalQueryPort } from "../../../ports/rental-query-port.js";

export function createDashboardQueryService(rentals: RentalQueryPort, clock: ClockQueryPort) {
  return {
    execute(): Dashboard {
      const snapshot = rentals.readSnapshot();
      const now = clock.now();
      return {
        ...snapshot,
        now,
        reservations: snapshot.reservations.map((reservation) => ({
          ...reservation,
          effectiveStatus: getEffectiveStatus(reservation, now),
        })),
      };
    },
  };
}
