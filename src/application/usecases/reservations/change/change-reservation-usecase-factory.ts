import type { createReservationChangeService } from "../../../services/reservations/change/change-reservation-service-factory.js";
import type { ChangeReservationCommand } from "../../../services/reservations/reservation-commands.js";

export function createReservationChangeUseCase(service: ReturnType<typeof createReservationChangeService>) {
  return { execute: (command: ChangeReservationCommand) => service.execute(command) };
}
