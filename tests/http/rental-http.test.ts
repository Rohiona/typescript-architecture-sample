import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRentalApplication } from "../../src/composition/rental-application-factory.js";
import { createRentalHttpApp } from "../../src/presentation/http/rental-http-app-factory.js";
import type { Dashboard } from "../../src/contracts/dashboard.js";

let application: ReturnType<typeof createRentalApplication>;
let app: ReturnType<typeof createRentalHttpApp>;
beforeEach(() => {
  application = createRentalApplication(":memory:");
  app = createRentalHttpApp(application);
});
afterEach(() => application.close());

function post(path: string, body: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
async function dashboard(): Promise<Dashboard> {
  return (await app.request("/api/dashboard")).json() as Promise<Dashboard>;
}
async function createCamera() {
  const current = await dashboard();
  return post("/api/reservations", {
    actorId: "customer-a",
    equipmentId: "camera",
    quantity: 1,
    startAt: current.now,
    endAt: current.now + 3_600_000,
  });
}

describe("HTTP demo API", () => {
  it("serves health and the real database snapshot", async () => {
    expect(await (await app.request("/api/health")).json()).toEqual({ status: "ok" });
    const response = await app.request("/api/dashboard");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const result = (await response.json()) as Dashboard;
    expect(result.customers).toHaveLength(3);
    expect(result.equipment).toHaveLength(3);
    expect(result.reservations).toHaveLength(2);
  });
  it("creates, confirms, checks out, and returns through the public API", async () => {
    const created = await createCamera();
    expect(created.status).toBe(201);
    const { reservation } = (await created.json()) as { reservation: { id: string; version: number } };
    const path = "/api/reservations/" + reservation.id + "/actions";
    expect((await post(path, { actorId: "customer-a", action: "confirm" })).status).toBe(200);
    const checkedOut = await post(path, { actorId: "staff-1", action: "check_out" });
    expect(checkedOut.status).toBe(200);
    expect(await checkedOut.json()).toMatchObject({ reservation: { status: "checked_out", version: 3 } });
    await post("/api/demo/advance", { minutes: 60 });
    const returned = await post(path, { actorId: "staff-1", action: "return" });
    expect(returned.status).toBe(200);
    expect(await returned.json()).toMatchObject({
      reservation: { status: "returned", version: 4, returnedAt: (await dashboard()).now },
    });
  });
  it.each([
    {},
    { actorId: "", equipmentId: "camera", quantity: 1, startAt: 1, endAt: 2 },
    { actorId: "customer-a", equipmentId: "camera", quantity: 0, startAt: 1, endAt: 2 },
    { actorId: "customer-a", equipmentId: "camera", quantity: "1", startAt: 1, endAt: 2 },
    { actorId: "customer-a", equipmentId: "camera", quantity: 1.5, startAt: 1, endAt: 2 },
  ])("rejects malformed reservation input", async (body) => {
    const response = await post("/api/reservations", body);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "INVALID_INPUT" } });
  });
  it("rejects invalid JSON and missing JSON content type", async () => {
    for (const headers of [new Headers({ "Content-Type": "application/json" }), new Headers()]) {
      const response = await app.request("/api/reservations", { method: "POST", headers, body: "{" });
      expect(response.status).toBe(400);
    }
  });
  it("returns 403 for another member and for a member attempting staff-only operations", async () => {
    const { reservation } = (await (await createCamera()).json()) as { reservation: { id: string } };
    const path = "/api/reservations/" + reservation.id + "/actions";
    expect((await post(path, { actorId: "customer-b", action: "confirm" })).status).toBe(403);
    await post(path, { actorId: "customer-a", action: "confirm" });
    expect((await post(path, { actorId: "customer-a", action: "check_out" })).status).toBe(403);
  });
  it("returns 409 for exhausted stock without adding a second booking", async () => {
    expect((await createCamera()).status).toBe(201);
    const conflict = await createCamera();
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ error: { code: "INSUFFICIENT_AVAILABILITY" } });
    expect((await dashboard()).reservations.filter((row) => row.equipmentId === "camera")).toHaveLength(1);
  });
  it("returns 404 for unknown actors, equipment, reservations, and routes", async () => {
    const { now } = await dashboard();
    const body = { actorId: "customer-a", equipmentId: "camera", quantity: 1, startAt: now, endAt: now + 3_600_000 };
    expect((await post("/api/reservations", { ...body, actorId: "missing" })).status).toBe(404);
    expect((await post("/api/reservations", { ...body, equipmentId: "missing" })).status).toBe(404);
    expect((await post("/api/reservations/missing/actions", { actorId: "staff-1", action: "cancel" })).status).toBe(
      404,
    );
    expect((await app.request("/api/missing")).status).toBe(404);
  });
  it("rejects an unsupported action", async () => {
    expect(
      (await post("/api/reservations/seed-tripod/actions", { actorId: "customer-a", action: "delete" })).status,
    ).toBe(400);
  });
  it("shows a held reservation expired just by advancing time and refuses confirming it", async () => {
    const { now } = await dashboard();
    const response = await post("/api/demo/advance", { minutes: 15 });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ now: now + 900_000 });
    const row = (await dashboard()).reservations.find((item) => item.id === "seed-tripod");
    expect(row).toMatchObject({ status: "held", effectiveStatus: "expired" });
    expect(
      (await post("/api/reservations/seed-tripod/actions", { actorId: "customer-a", action: "confirm" })).status,
    ).toBe(409);
  });
  it.each([0, -1, 0.5, 1441, "15"])("rejects invalid clock advance %s", async (minutes) => {
    const before = await dashboard();
    expect((await post("/api/demo/advance", { minutes })).status).toBe(400);
    expect((await dashboard()).now).toBe(before.now);
  });
  it("resets the persisted state to the initial demo", async () => {
    const initial = await dashboard();
    await createCamera();
    await post("/api/demo/advance", { minutes: 60 });
    const response = await post("/api/demo/reset", {});
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(await dashboard()).toEqual(initial);
  });
  it("does not expose unexpected internal exception details", async () => {
    app = createRentalHttpApp({
      ...application,
      dashboard: {
        execute: () => {
          throw new Error("SQL secret database detail");
        },
      },
    });
    const response = await app.request("/api/dashboard");
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toContain("INTERNAL_ERROR");
    expect(text).not.toContain("SQL");
    expect(text).not.toContain("secret");
  });
});
