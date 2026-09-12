import type { createReservationCreationService } from "../../../services/reservations/create/create-reservation-service-factory.js";
import type { CreateReservationCommand } from "../../../services/reservations/reservation-commands.js";

export function createReservationCreationUseCase(service: ReturnType<typeof createReservationCreationService>) {
  return { execute: (command: CreateReservationCommand) => service.execute(command) };
}
