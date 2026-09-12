import { describe, expect, it } from "vitest";
import { createReservation } from "../../src/domain/rentals/create-reservation";
import { HOUR, MINUTE, NOW, equipment, request, reservation } from "./fixtures";

describe("reservation creation", () => {
  it("creates a 15-minute hold with the requested identifiers and initial version", () => {
    const input = request({ quantity: 2 });
    const item = equipment();
    const original = structuredClone({ input, item });
    expect(createReservation(input, item, [], NOW, "new-reservation")).toEqual({
      ok: true,
      value: {
        ...input,
        id: "new-reservation",
        status: "held",
        holdExpiresAt: NOW + 15 * MINUTE,
        createdAt: NOW,
        returnedAt: null,
        version: 1,
      },
    });
    expect({ input, item }).toEqual(original);
  });

  it("returns request validation failures without creating anything", () => {
    expect(createReservation(request({ quantity: 0 }), equipment(), [], NOW, "new")).toMatchObject({
      ok: false,
      error: { code: "INVALID_QUANTITY" },
    });
  });

  it("rejects a different equipment identifier", () => {
    expect(createReservation(request({ equipmentId: "tripod" }), equipment(), [], NOW, "new")).toEqual({
      ok: false,
      error: { code: "EQUIPMENT_MISMATCH", message: "選択した機材と予約対象の機材が一致しません。" },
    });
  });

  it("rejects a quantity beyond the equipment's total stock", () => {
    expect(createReservation(request({ quantity: 4 }), equipment(), [], NOW, "new")).toEqual({
      ok: false,
      error: { code: "QUANTITY_EXCEEDED", message: "機材の保有数を超える数量は予約できません。" },
    });
  });

  it("rejects a quantity beyond current availability and preserves existing reservations", () => {
    const existing = [reservation({ quantity: 2 })];
    const original = structuredClone(existing);
    expect(createReservation(request({ quantity: 2 }), equipment(), existing, NOW, "new")).toMatchObject({
      ok: false,
      error: { code: "INSUFFICIENT_AVAILABILITY" },
    });
    expect(existing).toEqual(original);
  });

  it("accepts exactly the remaining stock without counting consecutive bookings twice", () => {
    const item = equipment({ turnaroundMinutes: 0 });
    const existing = [
      reservation({ status: "confirmed", startAt: NOW, endAt: NOW + HOUR, quantity: 2 }),
      reservation({ id: "second", status: "confirmed", startAt: NOW + HOUR, endAt: NOW + 2 * HOUR, quantity: 2 }),
    ];
    expect(createReservation(request({ startAt: NOW }), item, existing, NOW, "new")).toMatchObject({
      ok: true,
      value: { quantity: 1, status: "held" },
    });
  });

  it("rejects a booking during maintenance, even with no reservations", () => {
    const item = equipment({ maintenance: [{ startAt: NOW, endAt: NOW + 3 * HOUR }] });
    expect(createReservation(request(), item, [], NOW, "new")).toMatchObject({
      ok: false,
      error: { code: "INSUFFICIENT_AVAILABILITY" },
    });
  });

  it("reuses stock exactly when another hold expires", () => {
    const existing = [reservation({ quantity: 3 })];
    expect(createReservation(request({ quantity: 3 }), equipment(), existing, NOW + 15 * MINUTE, "new")).toMatchObject({
      ok: true,
      value: { holdExpiresAt: NOW + 30 * MINUTE },
    });
  });
});
