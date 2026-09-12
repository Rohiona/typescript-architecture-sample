import { describe, expect, it } from "vitest";
import { transitionReservation } from "../../src/domain/rentals/transition-reservation";
import type { RentalAction, ReservationStatus } from "../../src/domain/rentals/types";
import { HOUR, MINUTE, NOW, member, reservation, staff } from "./fixtures";

describe("reservation transitions", () => {
  it.each([
    ["held", "confirm", "confirmed"],
    ["held", "cancel", "cancelled"],
    ["confirmed", "cancel", "cancelled"],
  ] as const)("allows the owner to %s -> %s", (status, action, nextStatus) => {
    const before = reservation({ status, version: 4 });
    const original = structuredClone(before);
    expect(transitionReservation(before, action, member, NOW)).toEqual({
      ok: true,
      value: { ...before, status: nextStatus, version: 5 },
    });
    expect(before).toEqual(original);
  });

  it.each(["confirm", "cancel", "check_out", "return"] satisfies RentalAction[])(
    "denies another member's %s request",
    (action) => {
      expect(transitionReservation(reservation(), action, { ...member, id: "other" }, NOW)).toEqual({
        ok: false,
        error: { code: "FORBIDDEN", message: "この予約に対してその操作を行う権限がありません。" },
      });
    },
  );

  it.each([
    ["confirmed", "check_out"],
    ["checked_out", "return"],
  ] as const)("requires staff even when the member owns a %s reservation", (status, action) => {
    expect(transitionReservation(reservation({ status, startAt: NOW }), action, member, NOW)).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  const states: ReservationStatus[] = ["held", "confirmed", "checked_out", "returned", "cancelled", "expired"];
  const transitions: { action: RentalAction; from: ReservationStatus[]; target: ReservationStatus }[] = [
    { action: "confirm", from: ["held"], target: "confirmed" },
    { action: "cancel", from: ["held", "confirmed"], target: "cancelled" },
    { action: "check_out", from: ["confirmed"], target: "checked_out" },
    { action: "return", from: ["checked_out"], target: "returned" },
  ];
  for (const { action, from, target } of transitions) {
    it.each(states)("checks the staff transition from %s using " + action, (status) => {
      const current = reservation({ status, startAt: NOW, version: 7 });
      const result = transitionReservation(current, action, staff, NOW);
      if (from.includes(status)) {
        expect(result).toEqual({
          ok: true,
          value: { ...current, status: target, returnedAt: action === "return" ? NOW : null, version: 8 },
        });
      } else {
        expect(result).toMatchObject({ ok: false, error: { code: "INVALID_TRANSITION" } });
      }
    });
  }

  it.each(["confirm", "cancel"] as const)("rejects %s at the hold deadline", (action) => {
    expect(transitionReservation(reservation(), action, member, NOW + 15 * MINUTE)).toMatchObject({
      ok: false,
      error: { code: "INVALID_TRANSITION" },
    });
  });

  it("still confirms one millisecond before the hold deadline", () => {
    expect(transitionReservation(reservation(), "confirm", member, NOW + 15 * MINUTE - 1)).toMatchObject({
      ok: true,
      value: { status: "confirmed" },
    });
  });

  it.each([NOW + 5 * MINUTE, NOW + 5 * MINUTE + 1])(
    "rejects confirmation after the rental period has ended at %s, even while the hold is valid",
    (now) => {
      const current = reservation({ startAt: NOW, endAt: NOW + 5 * MINUTE });
      expect(transitionReservation(current, "confirm", member, now)).toEqual({
        ok: false,
        error: { code: "RESERVATION_PERIOD_ENDED", message: "利用時間が終了した仮予約は確定できません。" },
      });
    },
  );

  it("allows confirmation before the rental period ends", () => {
    const current = reservation({ startAt: NOW, endAt: NOW + 5 * MINUTE });
    expect(transitionReservation(current, "confirm", member, NOW + 5 * MINUTE - 1)).toMatchObject({
      ok: true,
      value: { status: "confirmed" },
    });
  });

  it.each([
    [NOW - 1, false],
    [NOW, true],
    [NOW + HOUR - 1, true],
    [NOW + HOUR, false],
    [NOW + HOUR + 1, false],
  ] as const)("checks the half-open pickup window at %s", (now, allowed) => {
    const current = reservation({ status: "confirmed", startAt: NOW, endAt: NOW + HOUR });
    const result = transitionReservation(current, "check_out", staff, now);
    expect(result).toMatchObject(
      allowed
        ? { ok: true, value: { status: "checked_out" } }
        : { ok: false, error: { code: "OUTSIDE_PICKUP_PERIOD" } },
    );
  });

  it("records an overdue actual return time without changing the planned interval", () => {
    const current = reservation({ status: "checked_out", version: 2 });
    expect(transitionReservation(current, "return", staff, NOW + 4 * HOUR)).toEqual({
      ok: true,
      value: { ...current, status: "returned", returnedAt: NOW + 4 * HOUR, version: 3 },
    });
  });

  it.each([NaN, Infinity, -Infinity])("rejects an invalid operation timestamp %s", (now) => {
    expect(transitionReservation(reservation(), "confirm", staff, now)).toEqual({
      ok: false,
      error: { code: "INVALID_TIME", message: "操作日時が正しくありません。" },
    });
  });
});
