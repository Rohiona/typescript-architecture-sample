import { describe, expect, it, vi } from "vitest";
import { createDashboardQueryService } from "../../src/application/services/dashboard/read/dashboard-query-service-factory.js";
import { createAdvanceDemoTimeService } from "../../src/application/services/demo/advance/advance-demo-time-service-factory.js";
import { createReadDashboardUseCase } from "../../src/application/usecases/dashboard/read/read-dashboard-usecase-factory.js";
import { createReservationCreationUseCase } from "../../src/application/usecases/reservations/create/create-reservation-usecase-factory.js";
import { createReservationChangeUseCase } from "../../src/application/usecases/reservations/change/change-reservation-usecase-factory.js";
import { createAdvanceDemoTimeUseCase } from "../../src/application/usecases/demo/advance/advance-demo-time-usecase-factory.js";
import { createResetDemoUseCase } from "../../src/application/usecases/demo/reset/reset-demo-usecase-factory.js";
import type { Reservation, Result } from "../../src/domain/rentals/types.js";
import { NOW, MINUTE, camera, member, reservation } from "./rental-harness.js";

describe("dashboard and demo clock", () => {
  it("shows an expired hold after advancing the injected clock without changing stored status", () => {
    const stored = reservation();
    let now = NOW;
    const query = {
      readSnapshot: vi.fn(() => ({
        customers: [member],
        equipment: [camera],
        reservations: [stored],
        activities: [],
      })),
    };
    const service = createDashboardQueryService(query, { now: () => now });
    expect(service.execute().reservations[0]?.effectiveStatus).toBe("held");
    now += 15 * MINUTE;
    expect(service.execute().reservations[0]?.effectiveStatus).toBe("expired");
    expect(stored.status).toBe("held");
  });
  it.each([0, -1, 0.5, 1441, NaN, Infinity])("rejects invalid advance %s before persistence", (minutes) => {
    const demo = { advanceMinutes: vi.fn(), reset: vi.fn() };
    expect(createAdvanceDemoTimeService(demo).execute(minutes)).toMatchObject({ ok: false });
    expect(demo.advanceMinutes).not.toHaveBeenCalled();
  });
  it.each([1, 15, 60, 1440])("persists a valid advance of %i minutes", (minutes) => {
    const demo = { advanceMinutes: vi.fn(() => NOW + minutes * MINUTE), reset: vi.fn() };
    expect(createAdvanceDemoTimeService(demo).execute(minutes)).toEqual({
      ok: true,
      value: { now: NOW + minutes * MINUTE },
    });
    expect(demo.advanceMinutes).toHaveBeenCalledWith(minutes);
  });
});

describe("UseCase wiring", () => {
  it("forwards creation and transitions without changing their result", () => {
    const outcome: Result<Reservation> = { ok: true, value: reservation() };
    const creation = { execute: vi.fn(() => outcome) };
    const change = { execute: vi.fn(() => outcome) };
    const createInput = { actorId: member.id, equipmentId: camera.id, quantity: 1, startAt: NOW, endAt: NOW + MINUTE };
    const changeInput = { actorId: member.id, reservationId: "existing", action: "confirm" as const };
    expect(createReservationCreationUseCase(creation).execute(createInput)).toBe(outcome);
    expect(creation.execute).toHaveBeenCalledExactlyOnceWith(createInput);
    expect(createReservationChangeUseCase(change).execute(changeInput)).toBe(outcome);
    expect(change.execute).toHaveBeenCalledExactlyOnceWith(changeInput);
  });
  it("connects dashboard, clock advance, and reset", () => {
    const dashboard = { now: NOW, customers: [], equipment: [], reservations: [], activities: [] };
    const read = { execute: vi.fn(() => dashboard) };
    expect(createReadDashboardUseCase(read).execute()).toBe(dashboard);
    const result = { ok: true, value: { now: NOW + MINUTE } } as const;
    const advance = { execute: vi.fn(() => result) };
    expect(createAdvanceDemoTimeUseCase(advance).execute(1)).toBe(result);
    expect(advance.execute).toHaveBeenCalledExactlyOnceWith(1);
    const demo = { reset: vi.fn(), advanceMinutes: vi.fn() };
    expect(createResetDemoUseCase(demo).execute()).toEqual({ ok: true });
    expect(demo.reset).toHaveBeenCalledOnce();
  });
});
