import { vi } from "vitest";
import type { Customer, Equipment, Reservation } from "../../src/domain/rentals/types.js";
import type { RentalCommandPort, RentalTransaction } from "../../src/application/ports/rental-command-port.js";

export const NOW = Date.parse("2026-09-14T09:00:00+09:00");
export const MINUTE = 60_000;
export const camera: Equipment = {
  id: "camera",
  name: "カメラ",
  category: "camera",
  description: "テスト機材",
  totalQuantity: 1,
  turnaroundMinutes: 30,
  maintenance: [],
};
export const member: Customer = { id: "member", name: "利用者", role: "member" };
export const staff: Customer = { id: "staff", name: "スタッフ", role: "staff" };
export function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "existing",
    customerId: member.id,
    equipmentId: camera.id,
    quantity: 1,
    startAt: NOW,
    endAt: NOW + 60 * MINUTE,
    status: "held",
    holdExpiresAt: NOW + 15 * MINUTE,
    createdAt: NOW,
    returnedAt: null,
    version: 1,
    ...overrides,
  };
}
export function createCommandHarness(initial: Reservation[] = []) {
  const rows = initial.map((row) => ({ ...row }));
  let sequence = 0;
  const transaction = {
    getCustomer: vi.fn((id: string) => [member, staff].find((actor) => actor.id === id) ?? null),
    getEquipment: vi.fn((id: string) => (id === camera.id ? camera : null)),
    getReservation: vi.fn((id: string) => rows.find((row) => row.id === id) ?? null),
    listReservations: vi.fn(() => structuredClone(rows)),
    insertReservation: vi.fn((row: Reservation) => {
      rows.push({ ...row });
    }),
    updateReservation: vi.fn((row: Reservation) => {
      const index = rows.findIndex((existing) => existing.id === row.id && existing.version === row.version - 1);
      if (index < 0) return false;
      rows[index] = { ...row };
      return true;
    }),
    appendActivity: vi.fn(),
  } satisfies RentalTransaction;
  const rentals: RentalCommandPort = { transaction: (work) => work(transaction) };
  const transactionSpy = vi.spyOn(rentals, "transaction");
  const dependencies = { rentals, clock: { now: vi.fn(() => NOW) }, ids: { next: () => "generated-" + ++sequence } };
  return { transaction, transactionSpy, rows, dependencies };
}
