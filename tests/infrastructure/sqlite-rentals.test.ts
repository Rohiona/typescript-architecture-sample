import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createRentalDatabase } from "../../src/infrastructure/sqlite/rental-database-factory.js";
import { createSqliteRentalQueryPort } from "../../src/infrastructure/sqlite/rental-query-port-factory.js";
import { createSqliteRentalCommandPort } from "../../src/infrastructure/sqlite/rental-command-port-factory.js";
import { createSqliteDemoClockPorts } from "../../src/infrastructure/sqlite/demo-clock-ports-factory.js";
import { INITIAL_DEMO_TIME } from "../../src/infrastructure/sqlite/demo-seed.js";
import { createReservationCreationService } from "../../src/application/services/reservations/create/create-reservation-service-factory.js";
import { getAvailableQuantity } from "../../src/domain/rentals/availability.js";
import type { Reservation } from "../../src/domain/rentals/types.js";

const resources: Array<ReturnType<typeof createRentalDatabase>> = [];
const folders: string[] = [];
function open(path = ":memory:") {
  const database = createRentalDatabase(path);
  resources.push(database);
  return {
    database,
    query: createSqliteRentalQueryPort(database),
    commands: createSqliteRentalCommandPort(database),
    ...createSqliteDemoClockPorts(database),
  };
}
function filename() {
  const folder = mkdtempSync(join(tmpdir(), "architecture-sqlite-"));
  folders.push(folder);
  return join(folder, "rental.db");
}
function held(id: string): Reservation {
  return {
    id,
    equipmentId: "camera",
    customerId: "customer-a",
    quantity: 1,
    startAt: INITIAL_DEMO_TIME,
    endAt: INITIAL_DEMO_TIME + 3_600_000,
    status: "held",
    holdExpiresAt: INITIAL_DEMO_TIME + 900_000,
    createdAt: INITIAL_DEMO_TIME,
    returnedAt: null,
    version: 1,
  };
}
afterEach(() => {
  for (const resource of resources.splice(0)) if (resource.connection.open) resource.connection.close();
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

describe("SQLite persistence and migration", () => {
  it("migrates and seeds once, preserving bookings and demo time across reopening", () => {
    const path = filename();
    const first = open(path);
    first.commands.transaction((transaction) => transaction.insertReservation(held("saved")));
    first.demo.advanceMinutes(60);
    first.database.connection.close();
    const reopened = open(path);
    const snapshot = reopened.query.readSnapshot();
    expect(snapshot.customers).toHaveLength(3);
    expect(snapshot.equipment.map((item) => item.totalQuantity)).toEqual([1, 2, 3]);
    expect(snapshot.reservations).toHaveLength(3);
    expect(snapshot.reservations.find((item) => item.id === "saved")).toEqual(held("saved"));
    expect(reopened.clock.now()).toBe(INITIAL_DEMO_TIME + 3_600_000);
    expect(reopened.database.connection.prepare("SELECT version FROM schema_migrations").all()).toEqual([
      { version: 1 },
    ]);
  });
  it("supports in-memory storage and atomically restores the demo", () => {
    const store = open();
    const initial = store.query.readSnapshot();
    store.commands.transaction((transaction) => transaction.insertReservation(held("extra")));
    store.demo.advanceMinutes(1440);
    store.demo.reset();
    expect(store.clock.now()).toBe(INITIAL_DEMO_TIME);
    expect(store.query.readSnapshot()).toEqual(initial);
    store.demo.reset();
    expect(store.query.readSnapshot()).toEqual(initial);
  });
  it("rolls back a thrown exception including its activity", () => {
    const store = open();
    const before = store.query.readSnapshot();
    expect(() =>
      store.commands.transaction((transaction) => {
        transaction.insertReservation(held("rollback"));
        transaction.appendActivity({ id: "rollback-activity", at: INITIAL_DEMO_TIME, message: "not committed" });
        throw new Error("abort");
      }),
    ).toThrow("abort");
    expect(store.query.readSnapshot()).toEqual(before);
  });
  it("rolls back a rejected Result without leaking writes", () => {
    const store = open();
    const before = store.query.readSnapshot();
    const rejected = { ok: false, error: { code: "TEST_REJECTED", message: "rejected" } } as const;
    expect(
      store.commands.transaction((transaction) => {
        transaction.insertReservation(held("rejected"));
        transaction.appendActivity({ id: "rejected-activity", at: INITIAL_DEMO_TIME, message: "not committed" });
        return rejected;
      }),
    ).toBe(rejected);
    expect(store.query.readSnapshot()).toEqual(before);
  });
  it("uses optimistic versions and refuses stale or missing updates", () => {
    const store = open();
    store.commands.transaction((transaction) => transaction.insertReservation(held("versioned")));
    expect(
      store.commands.transaction((transaction) =>
        transaction.updateReservation({
          ...held("versioned"),
          status: "confirmed",
          version: 2,
        }),
      ),
    ).toBe(true);
    expect(
      store.commands.transaction((transaction) =>
        transaction.updateReservation({
          ...held("versioned"),
          status: "cancelled",
          version: 2,
        }),
      ),
    ).toBe(false);
    expect(
      store.commands.transaction((transaction) =>
        transaction.updateReservation({
          ...held("missing"),
          version: 2,
        }),
      ),
    ).toBe(false);
    expect(store.commands.transaction((transaction) => transaction.getReservation("versioned"))).toMatchObject({
      status: "confirmed",
      version: 2,
    });
  });
  it("acquires the write lock before any reads in a command transaction", () => {
    const path = filename();
    const first = open(path);
    const second = open(path);
    second.database.connection.pragma("busy_timeout = 1");
    first.commands.transaction((transaction) => {
      expect(() => second.commands.transaction((other) => other.insertReservation(held("blocked")))).toThrow(/locked/);
      transaction.insertReservation(held("winner"));
    });
    expect(second.query.readSnapshot().reservations.map((row) => row.id)).toContain("winner");
    expect(second.query.readSnapshot().reservations.map((row) => row.id)).not.toContain("blocked");
  });
  it("prevents two reservations from stale availability observed on independent connections", () => {
    const path = filename();
    const first = open(path);
    const second = open(path);
    const one = first.query.readSnapshot();
    const two = second.query.readSnapshot();
    const period = { startAt: INITIAL_DEMO_TIME, endAt: INITIAL_DEMO_TIME + 3_600_000 };
    const equipment = one.equipment.find((row) => row.id === "camera");
    if (!equipment) throw new Error("Fixture missing camera");
    expect(getAvailableQuantity(equipment, one.reservations, period, first.clock.now())).toBe(1);
    expect(getAvailableQuantity(equipment, two.reservations, period, second.clock.now())).toBe(1);
    const service = (store: typeof first, prefix: string) => {
      let sequence = 0;
      return createReservationCreationService({
        rentals: store.commands,
        clock: store.clock,
        ids: { next: () => prefix + ++sequence },
      });
    };
    const input = { ...period, actorId: "customer-a", equipmentId: "camera", quantity: 1 };
    expect(service(first, "first").execute(input)).toMatchObject({ ok: true });
    expect(service(second, "second").execute({ ...input, actorId: "customer-b" })).toMatchObject({
      ok: false,
      error: { code: "INSUFFICIENT_AVAILABILITY" },
    });
    expect(second.query.readSnapshot().reservations.filter((row) => row.equipmentId === "camera")).toHaveLength(1);
  });
  it("rolls back reset if seed fails partway", () => {
    const store = open();
    store.demo.advanceMinutes(60);
    const before = store.query.readSnapshot();
    store.database.connection.exec(
      "CREATE TRIGGER block_seed BEFORE INSERT ON customers BEGIN SELECT RAISE(ABORT, 'seed blocked'); END",
    );
    expect(() => store.demo.reset()).toThrow("seed blocked");
    expect(store.query.readSnapshot()).toEqual(before);
    expect(store.clock.now()).toBe(INITIAL_DEMO_TIME + 3_600_000);
  });
});
