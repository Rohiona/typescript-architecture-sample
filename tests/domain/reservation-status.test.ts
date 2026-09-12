import { describe, expect, it } from "vitest";
import { getEffectiveStatus } from "../../src/domain/rentals/reservation-status";
import type { ReservationStatus } from "../../src/domain/rentals/types";
import { MINUTE, NOW, reservation } from "./fixtures";

describe("effective reservation status", () => {
  it.each([
    [NOW + 15 * MINUTE - 1, "held"],
    [NOW + 15 * MINUTE, "expired"],
    [NOW + 15 * MINUTE + 1, "expired"],
  ] as const)("resolves a hold at %s as %s", (now, expected) => {
    const held = reservation();
    expect(getEffectiveStatus(held, now)).toBe(expected);
    expect(held.status).toBe("held");
  });

  it.each(["confirmed", "checked_out", "returned", "cancelled", "expired"] satisfies ReservationStatus[])(
    "never expires the %s state using an old hold deadline",
    (status) => {
      expect(getEffectiveStatus(reservation({ status }), NOW + 60 * MINUTE)).toBe(status);
    },
  );
});
