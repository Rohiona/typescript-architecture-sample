import type { ClockQueryPort } from "../../ports/clock-query-port.js";
import type { IdentifierPort } from "../../ports/identifier-port.js";
import type { RentalCommandPort } from "../../ports/rental-command-port.js";

export interface ReservationCommandDependencies {
  rentals: RentalCommandPort;
  clock: ClockQueryPort;
  ids: IdentifierPort;
}
