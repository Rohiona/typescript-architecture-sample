import { createReservation } from "../../../../domain/rentals/create-reservation.js";
import type { Reservation, Result } from "../../../../domain/rentals/types.js";
import type { ReservationCommandDependencies } from "../reservation-command-dependencies.js";
import type { CreateReservationCommand } from "../reservation-commands.js";
import { failure } from "../../shared/failure.js";

export function createReservationCreationService(dependencies: ReservationCommandDependencies) {
  const { rentals, clock, ids } = dependencies;
  return {
    execute(command: CreateReservationCommand): Result<Reservation> {
      return rentals.transaction((transaction) => {
        const actor = transaction.getCustomer(command.actorId);
        if (!actor) return failure("CUSTOMER_NOT_FOUND", "利用者が見つかりません。");
        const equipment = transaction.getEquipment(command.equipmentId);
        if (!equipment) return failure("EQUIPMENT_NOT_FOUND", "機材が見つかりません。");
        const now = clock.now();
        const result = createReservation(
          {
            customerId: actor.id,
            equipmentId: equipment.id,
            quantity: command.quantity,
            startAt: command.startAt,
            endAt: command.endAt,
          },
          equipment,
          transaction.listReservations(),
          now,
          ids.next(),
        );
        if (!result.ok) return result;
        transaction.insertReservation(result.value);
        transaction.appendActivity({
          id: ids.next(),
          at: now,
          message: actor.name + "さんが" + equipment.name + "を" + command.quantity + "台、仮予約しました。",
        });
        return result;
      });
    },
  };
}
