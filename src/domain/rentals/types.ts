export type ReservationStatus = "held" | "confirmed" | "checked_out" | "returned" | "cancelled" | "expired";
export type RentalAction = "confirm" | "cancel" | "check_out" | "return";
export interface Customer {
  id: string;
  name: string;
  role: "member" | "staff";
}
export interface Period {
  startAt: number;
  endAt: number;
}
export interface Equipment {
  id: string;
  name: string;
  category: "camera" | "projector" | "tripod";
  description: string;
  totalQuantity: number;
  turnaroundMinutes: number;
  maintenance: Period[];
}
export interface Reservation extends Period {
  id: string;
  equipmentId: string;
  customerId: string;
  quantity: number;
  status: ReservationStatus;
  holdExpiresAt: number;
  createdAt: number;
  returnedAt: number | null;
  version: number;
}
export interface ReservationRequest extends Period {
  equipmentId: string;
  customerId: string;
  quantity: number;
}
export interface DomainIssue {
  code: string;
  message: string;
}
export type Result<T> = { ok: true; value: T } | { ok: false; error: DomainIssue };
