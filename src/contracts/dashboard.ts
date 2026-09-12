import type { Customer, Equipment, Reservation, ReservationStatus } from "../domain/rentals/types.js";
export interface Activity {
  id: string;
  at: number;
  message: string;
}
export interface ReservationView extends Reservation {
  effectiveStatus: ReservationStatus;
}
export interface Dashboard {
  now: number;
  customers: Customer[];
  equipment: Equipment[];
  reservations: ReservationView[];
  activities: Activity[];
}
export interface ApiError {
  error: { code: string; message: string };
}
