import type { Activity } from "../../contracts/dashboard.js";
import type { Customer, Equipment, Reservation } from "../../domain/rentals/types.js";
export interface RentalSnapshot {
  customers: Customer[];
  equipment: Equipment[];
  reservations: Reservation[];
  activities: Activity[];
}
export interface RentalQueryPort {
  readSnapshot(): RentalSnapshot;
}
