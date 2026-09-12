import type { RentalAction } from "../../../domain/rentals/types.js";

export interface CreateReservationCommand {
  actorId: string;
  equipmentId: string;
  quantity: number;
  startAt: number;
  endAt: number;
}
export interface ChangeReservationCommand {
  reservationId: string;
  actorId: string;
  action: RentalAction;
}
