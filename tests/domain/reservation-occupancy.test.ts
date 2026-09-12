import { describe, expect, it } from "vitest";
import { getReservationOccupancy } from "../../src/domain/rentals/reservation-occupancy";
import { HOUR, MINUTE, NOW, reservation } from "./fixtures";

describe("reservation occupancy", () => {
  it("includes return preparation for a live hold", () => {
    expect(getReservationOccupancy(reservation(), 15, NOW)).toEqual({
      startAt: NOW + HOUR,
      endAt: NOW + 2 * HOUR + 15 * MINUTE,
    });
  });

  it("keeps confirmed occupancy after the original hold deadline", () => {
    expect(getReservationOccupancy(reservation({ status: "confirmed" }), 0, NOW + HOUR)).toEqual({
      startAt: NOW + HOUR,
      endAt: NOW + 2 * HOUR,
    });
  });

  it.each(["cancelled", "expired"] as const)("does not occupy stock for %s", (status) => {
    expect(getReservationOccupancy(reservation({ status }), 15, NOW)).toBeNull();
  });

  it("releases an unconfirmed hold at its deadline", () => {
    expect(getReservationOccupancy(reservation(), 15, NOW + 15 * MINUTE)).toBeNull();
  });

  it("blocks checked out stock indefinitely, even beyond its planned end", () => {
    expect(getReservationOccupancy(reservation({ status: "checked_out" }), 15, NOW + 24 * HOUR)).toEqual({
      startAt: NOW + HOUR,
      endAt: Infinity,
    });
  });

  it.each([NOW + HOUR + 10 * MINUTE, NOW + 4 * HOUR])("uses the actual early or late return at %s", (returnedAt) => {
    expect(getReservationOccupancy(reservation({ status: "returned", returnedAt }), 15, NOW + 5 * HOUR)).toEqual({
      startAt: NOW + HOUR,
      endAt: returnedAt + 15 * MINUTE,
    });
  });

  it("fails closed when a returned record lacks its actual return timestamp", () => {
    expect(getReservationOccupancy(reservation({ status: "returned", returnedAt: null }), 15, NOW)).toEqual({
      startAt: NOW + HOUR,
      endAt: Infinity,
    });
  });
});
