import type { RentalAction, Reservation } from "../../domain/rentals/types.js";

export interface CreateReservationInput {
  actorId: string;
  equipmentId: string;
  quantity: number;
  startAt: number;
  endAt: number;
}

export interface ReservationCommandPort {
  createReservation(input: CreateReservationInput): Promise<{ reservation: Reservation }>;
  performAction(input: {
    actorId: string;
    reservationId: string;
    action: RentalAction;
  }): Promise<{ reservation: Reservation }>;
}
