import { transitionReservation } from "../../../../domain/rentals/transition-reservation.js";
import type { Reservation, Result } from "../../../../domain/rentals/types.js";
import type { ReservationCommandDependencies } from "../reservation-command-dependencies.js";
import type { ChangeReservationCommand } from "../reservation-commands.js";
import { failure } from "../../shared/failure.js";
import { getPhysicalAvailableQuantity } from "./available-physical-quantity.js";
import { createReservationActivityMessage } from "./activity-message.js";

export function createReservationChangeService(dependencies: ReservationCommandDependencies) {
  const { rentals, clock, ids } = dependencies;
  return {
    execute(command: ChangeReservationCommand): Result<Reservation> {
      return rentals.transaction((transaction) => {
        const actor = transaction.getCustomer(command.actorId);
        if (!actor) return failure("CUSTOMER_NOT_FOUND", "利用者が見つかりません。");
        const reservation = transaction.getReservation(command.reservationId);
        if (!reservation) return failure("RESERVATION_NOT_FOUND", "予約が見つかりません。");
        const equipment = transaction.getEquipment(reservation.equipmentId);
        if (!equipment) return failure("EQUIPMENT_NOT_FOUND", "機材が見つかりません。");
        const now = clock.now();
        const result = transitionReservation(reservation, command.action, actor, now);
        if (!result.ok) return result;
        if (
          command.action === "check_out" &&
          getPhysicalAvailableQuantity(equipment, transaction.listReservations(), reservation.id, now) <
            reservation.quantity
        ) {
          return failure("PHYSICAL_STOCK_UNAVAILABLE", "未返却または返却後の準備中の機材があるため、貸し出せません。");
        }
        if (!transaction.updateReservation(result.value)) {
          return failure("VERSION_CONFLICT", "予約が更新されています。最新の状態を読み込んでください。");
        }
        transaction.appendActivity({
          id: ids.next(),
          at: now,
          message: createReservationActivityMessage(actor.name, equipment.name, command.action),
        });
        return result;
      });
    },
  };
}
