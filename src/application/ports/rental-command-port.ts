import type { Activity } from "../../contracts/dashboard.js";
import type { Customer, Equipment, Reservation } from "../../domain/rentals/types.js";
export interface RentalTransaction {
  getEquipment(id: string): Equipment | null;
  getCustomer(id: string): Customer | null;
  getReservation(id: string): Reservation | null;
  listReservations(): Reservation[];
  insertReservation(reservation: Reservation): void;
  updateReservation(reservation: Reservation): boolean;
  appendActivity(activity: Activity): void;
}
export interface RentalCommandPort {
  transaction<T>(work: (transaction: RentalTransaction) => T): T;
}
