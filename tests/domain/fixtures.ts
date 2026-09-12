import type { Customer, Equipment, Reservation, ReservationRequest } from "../../src/domain/rentals/types";

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const NOW = Date.UTC(2026, 8, 14, 0, 0); // 09:00 Asia/Tokyo

export const member: Customer = { id: "member-1", name: "利用者", role: "member" };
export const staff: Customer = { id: "staff-1", name: "貸出担当", role: "staff" };

export function equipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: "camera",
    name: "カメラ",
    category: "camera",
    description: "撮影用",
    totalQuantity: 3,
    turnaroundMinutes: 15,
    maintenance: [],
    ...overrides,
  };
}

export function request(overrides: Partial<ReservationRequest> = {}): ReservationRequest {
  return {
    equipmentId: "camera",
    customerId: member.id,
    quantity: 1,
    startAt: NOW + HOUR,
    endAt: NOW + 2 * HOUR,
    ...overrides,
  };
}

export function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    ...request(),
    id: "reservation-1",
    status: "held",
    createdAt: NOW,
    holdExpiresAt: NOW + 15 * MINUTE,
    returnedAt: null,
    version: 1,
    ...overrides,
  };
}
