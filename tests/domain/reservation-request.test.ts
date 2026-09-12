import { describe, expect, it } from "vitest";
import { validateReservationRequest } from "../../src/domain/rentals/reservation-request";
import { NOW, request } from "./fixtures";

describe("reservation request validation", () => {
  it("accepts a reservation starting now and preserves the validated input", () => {
    const input = request({ startAt: NOW });
    expect(validateReservationRequest(input, NOW)).toEqual({ ok: true, value: input });
  });

  it("accepts the largest safe integer quantity for subsequent capacity validation", () => {
    const input = request({ quantity: Number.MAX_SAFE_INTEGER });
    expect(validateReservationRequest(input, NOW)).toEqual({ ok: true, value: input });
  });

  it.each([NaN, Infinity, -Infinity])("rejects a non-finite clock %s", (now) => {
    expect(validateReservationRequest(request(), now)).toMatchObject({ ok: false, error: { code: "INVALID_PERIOD" } });
  });

  it.each([{ startAt: NaN }, { endAt: Infinity }, { endAt: NOW }, { startAt: NOW, endAt: NOW }])(
    "rejects invalid period %j",
    (overrides) => {
      expect(validateReservationRequest(request(overrides), NOW)).toMatchObject({
        ok: false,
        error: { code: "INVALID_PERIOD" },
      });
    },
  );

  it("rejects even one millisecond before the current time", () => {
    expect(validateReservationRequest(request({ startAt: NOW - 1 }), NOW)).toEqual({
      ok: false,
      error: { code: "START_IN_PAST", message: "予約の開始日時は現在以降を指定してください。" },
    });
  });

  it.each([0, -1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid quantity %s",
    (quantity) => {
      expect(validateReservationRequest(request({ quantity }), NOW)).toEqual({
        ok: false,
        error: { code: "INVALID_QUANTITY", message: "数量は1以上の安全な整数で指定してください。" },
      });
    },
  );
});
