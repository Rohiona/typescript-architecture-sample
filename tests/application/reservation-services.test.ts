import { describe, expect, it, vi } from "vitest";
import { createReservationCreationService } from "../../src/application/services/reservations/create/create-reservation-service-factory.js";
import { createReservationChangeService } from "../../src/application/services/reservations/change/change-reservation-service-factory.js";
import { getPhysicalAvailableQuantity } from "../../src/application/services/reservations/change/available-physical-quantity.js";
import { createReservationActivityMessage } from "../../src/application/services/reservations/change/activity-message.js";
import { NOW, MINUTE, camera, member, staff, reservation, createCommandHarness } from "./rental-harness.js";

const request = { actorId: member.id, equipmentId: camera.id, quantity: 1, startAt: NOW, endAt: NOW + 60 * MINUTE };

describe("reservation creation service", () => {
  it("reads and writes in the transaction and records only a successful hold", () => {
    const harness = createCommandHarness();
    const result = createReservationCreationService(harness.dependencies).execute(request);
    expect(result).toMatchObject({ ok: true, value: { status: "held", version: 1, customerId: member.id } });
    expect(harness.transactionSpy).toHaveBeenCalledOnce();
    expect(harness.transaction.insertReservation).toHaveBeenCalledOnce();
    expect(harness.transaction.appendActivity).toHaveBeenCalledOnce();
  });
  it.each([
    [{ actorId: "missing" }, "CUSTOMER_NOT_FOUND"],
    [{ equipmentId: "missing" }, "EQUIPMENT_NOT_FOUND"],
    [{ quantity: 2 }, "QUANTITY_EXCEEDED"],
    [{ startAt: NOW - 1 }, "START_IN_PAST"],
  ])("does not persist rejected creation %j", (overrides, code) => {
    const harness = createCommandHarness();
    const result = createReservationCreationService(harness.dependencies).execute({ ...request, ...overrides });
    expect(result).toMatchObject({ ok: false, error: { code } });
    expect(harness.transaction.insertReservation).not.toHaveBeenCalled();
    expect(harness.transaction.appendActivity).not.toHaveBeenCalled();
  });
  it("checks fresh reservations before allocating stock", () => {
    const harness = createCommandHarness([reservation()]);
    expect(createReservationCreationService(harness.dependencies).execute(request)).toMatchObject({
      ok: false,
      error: { code: "INSUFFICIENT_AVAILABILITY" },
    });
    expect(harness.transaction.insertReservation).not.toHaveBeenCalled();
  });
});

describe("reservation change service", () => {
  it("records a successful versioned transition", () => {
    const harness = createCommandHarness([reservation()]);
    expect(
      createReservationChangeService(harness.dependencies).execute({
        actorId: member.id,
        reservationId: "existing",
        action: "confirm",
      }),
    ).toMatchObject({ ok: true, value: { status: "confirmed", version: 2 } });
    expect(harness.transaction.appendActivity).toHaveBeenCalledOnce();
  });
  it.each([
    ["missing", "existing", "CUSTOMER_NOT_FOUND"],
    [member.id, "missing", "RESERVATION_NOT_FOUND"],
  ])("rejects missing records without writing", (actorId, reservationId, code) => {
    const harness = createCommandHarness([reservation()]);
    expect(
      createReservationChangeService(harness.dependencies).execute({ actorId, reservationId, action: "confirm" }),
    ).toMatchObject({ ok: false, error: { code } });
    expect(harness.transaction.updateReservation).not.toHaveBeenCalled();
  });
  it("rejects a missing equipment record", () => {
    const harness = createCommandHarness([reservation({ equipmentId: "missing" })]);
    expect(
      createReservationChangeService(harness.dependencies).execute({
        actorId: staff.id,
        reservationId: "existing",
        action: "confirm",
      }),
    ).toMatchObject({ ok: false, error: { code: "EQUIPMENT_NOT_FOUND" } });
  });
  it("does not write an unauthorized action or an optimistic-lock failure", () => {
    const harness = createCommandHarness([reservation({ status: "confirmed" })]);
    const service = createReservationChangeService(harness.dependencies);
    expect(service.execute({ actorId: member.id, reservationId: "existing", action: "check_out" })).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(harness.transaction.updateReservation).not.toHaveBeenCalled();
    vi.mocked(harness.transaction.updateReservation).mockReturnValue(false);
    expect(service.execute({ actorId: staff.id, reservationId: "existing", action: "check_out" })).toMatchObject({
      ok: false,
      error: { code: "VERSION_CONFLICT" },
    });
    expect(harness.transaction.appendActivity).not.toHaveBeenCalled();
  });
  it("blocks a scheduled pickup while an earlier unit is still physically checked out", () => {
    const harness = createCommandHarness([
      reservation({ status: "confirmed" }),
      reservation({ id: "overdue", status: "checked_out", startAt: NOW - 120 * MINUTE, endAt: NOW - 60 * MINUTE }),
    ]);
    expect(
      createReservationChangeService(harness.dependencies).execute({
        actorId: staff.id,
        reservationId: "existing",
        action: "check_out",
      }),
    ).toMatchObject({ ok: false, error: { code: "PHYSICAL_STOCK_UNAVAILABLE" } });
    expect(harness.transaction.updateReservation).not.toHaveBeenCalled();
    expect(harness.transaction.appendActivity).not.toHaveBeenCalled();
  });
  it("allows pickup exactly when actual-return preparation ends", () => {
    const harness = createCommandHarness([
      reservation({ status: "confirmed" }),
      reservation({ id: "returned", status: "returned", returnedAt: NOW - 30 * MINUTE }),
    ]);
    expect(
      createReservationChangeService(harness.dependencies).execute({
        actorId: staff.id,
        reservationId: "existing",
        action: "check_out",
      }),
    ).toMatchObject({ ok: true, value: { status: "checked_out" } });
  });
});

describe("physical stock", () => {
  it.each([
    ["checked_out", null, NOW, 0],
    ["returned", NOW - 30 * MINUTE + 1, NOW, 0],
    ["returned", NOW - 30 * MINUTE, NOW, 1],
    ["returned", null, NOW, 0],
    ["confirmed", null, NOW, 1],
    ["cancelled", null, NOW, 1],
  ] as const)("counts %s and preparation boundaries", (status, returnedAt, now, expected) => {
    expect(getPhysicalAvailableQuantity(camera, [reservation({ status, returnedAt })], "another", now)).toBe(expected);
  });
  it("ignores another equipment and the current booking, and never returns negative stock", () => {
    expect(
      getPhysicalAvailableQuantity(
        camera,
        [
          reservation({ id: "self", status: "checked_out" }),
          reservation({ equipmentId: "projector", status: "checked_out" }),
        ],
        "self",
        NOW,
      ),
    ).toBe(1);
    expect(
      getPhysicalAvailableQuantity(camera, [reservation({ status: "checked_out", quantity: 3 })], "other", NOW),
    ).toBe(0);
  });
  it.each(["confirm", "cancel", "check_out", "return"] as const)("creates an activity for %s", (action) => {
    expect(createReservationActivityMessage("凛", "カメラ", action)).toContain("凛さんがカメラ");
  });
});
