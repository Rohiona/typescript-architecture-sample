import { describe, expect, it } from "vitest";
import { getAvailableQuantity } from "../../src/domain/rentals/availability";
import { HOUR, MINUTE, NOW, equipment, request, reservation } from "./fixtures";

describe("equipment availability", () => {
  it("returns all stock for an empty calendar", () => {
    expect(getAvailableQuantity(equipment(), [], request(), NOW)).toBe(3);
  });

  it("counts live holds and releases them exactly at their deadline", () => {
    const held = reservation({ quantity: 2 });
    expect(getAvailableQuantity(equipment(), [held], request(), NOW + 15 * MINUTE - 1)).toBe(1);
    expect(getAvailableQuantity(equipment(), [held], request(), NOW + 15 * MINUTE)).toBe(3);
  });

  it("counts confirmed bookings, but ignores cancellations, expired records and other equipment", () => {
    const existing = [
      reservation({ status: "confirmed" }),
      reservation({ id: "cancelled", status: "cancelled", quantity: 3 }),
      reservation({ id: "expired", status: "expired", quantity: 3 }),
      reservation({ id: "other", equipmentId: "tripod", status: "confirmed", quantity: 3 }),
    ];
    expect(getAvailableQuantity(equipment(), existing, request(), NOW + 30 * MINUTE)).toBe(2);
  });

  it("never returns negative availability for overcommitted records", () => {
    expect(getAvailableQuantity(equipment(), [reservation({ quantity: 4 })], request(), NOW)).toBe(0);
  });

  it("uses peak stock usage across consecutive bookings instead of adding them", () => {
    const item = equipment({ turnaroundMinutes: 0 });
    const existing = [
      reservation({ id: "first", status: "confirmed", startAt: NOW, endAt: NOW + HOUR, quantity: 2 }),
      reservation({ id: "second", status: "confirmed", startAt: NOW + HOUR, endAt: NOW + 2 * HOUR, quantity: 2 }),
    ];
    expect(getAvailableQuantity(item, existing, { startAt: NOW, endAt: NOW + 2 * HOUR }, NOW)).toBe(1);
  });

  it("reserves preparation time after an existing booking and releases at its exact boundary", () => {
    const existing = [reservation({ status: "confirmed", startAt: NOW, endAt: NOW + HOUR, quantity: 3 })];
    expect(
      getAvailableQuantity(
        equipment(),
        existing,
        { startAt: NOW + HOUR + 15 * MINUTE - 1, endAt: NOW + 2 * HOUR },
        NOW,
      ),
    ).toBe(0);
    expect(
      getAvailableQuantity(equipment(), existing, { startAt: NOW + HOUR + 15 * MINUTE, endAt: NOW + 2 * HOUR }, NOW),
    ).toBe(3);
  });

  it("also reserves the new booking's preparation time before a later booking", () => {
    const existing = [
      reservation({ status: "confirmed", startAt: NOW + 2 * HOUR + 10 * MINUTE, endAt: NOW + 3 * HOUR, quantity: 3 }),
    ];
    expect(getAvailableQuantity(equipment(), existing, request(), NOW)).toBe(0);
    const touching = [reservation({ ...existing[0], startAt: NOW + 2 * HOUR + 15 * MINUTE })];
    expect(getAvailableQuantity(equipment(), touching, request(), NOW)).toBe(3);
  });

  it("makes all stock unavailable when the occupied window intersects maintenance", () => {
    const item = equipment({ maintenance: [{ startAt: NOW + 90 * MINUTE, endAt: NOW + 100 * MINUTE }] });
    expect(getAvailableQuantity(item, [], request(), NOW)).toBe(0);
  });

  it("includes the new booking's preparation when checking maintenance", () => {
    const item = equipment({ maintenance: [{ startAt: NOW + 2 * HOUR + 10 * MINUTE, endAt: NOW + 3 * HOUR }] });
    expect(getAvailableQuantity(item, [], request(), NOW)).toBe(0);
  });

  it("allows maintenance to end at the start or begin at the end of preparation", () => {
    const item = equipment({
      maintenance: [
        { startAt: NOW, endAt: NOW + HOUR },
        { startAt: NOW + 2 * HOUR + 15 * MINUTE, endAt: NOW + 3 * HOUR },
      ],
    });
    expect(getAvailableQuantity(item, [], request(), NOW)).toBe(3);
  });

  it("keeps overdue equipment occupied until it is actually returned", () => {
    const existing = [reservation({ status: "checked_out", startAt: NOW - 2 * HOUR, endAt: NOW - HOUR, quantity: 2 })];
    expect(getAvailableQuantity(equipment(), existing, request(), NOW)).toBe(1);
  });

  it("does not block a checked-out record before its recorded start", () => {
    const existing = [reservation({ status: "checked_out", startAt: NOW + 4 * HOUR, quantity: 3 })];
    expect(getAvailableQuantity(equipment(), existing, request(), NOW)).toBe(3);
  });

  it("uses actual return plus preparation instead of the later scheduled end", () => {
    const existing = [
      reservation({
        status: "returned",
        startAt: NOW - HOUR,
        endAt: NOW + 3 * HOUR,
        returnedAt: NOW + 45 * MINUTE,
        quantity: 3,
      }),
    ];
    expect(getAvailableQuantity(equipment(), existing, request(), NOW)).toBe(3);
    expect(getAvailableQuantity(equipment(), existing, { startAt: NOW + HOUR - 1, endAt: NOW + 2 * HOUR }, NOW)).toBe(
      0,
    );
  });

  it.each([
    { startAt: NOW, endAt: NOW },
    { startAt: NaN, endAt: NOW + HOUR },
    { startAt: NOW, endAt: Infinity },
  ])("returns no availability for an invalid query %j", (period) => {
    expect(getAvailableQuantity(equipment(), [], period, NOW)).toBe(0);
  });

  it("returns no availability when the clock is invalid", () => {
    expect(getAvailableQuantity(equipment(), [], request(), NaN)).toBe(0);
  });
});
