import { eq } from "drizzle-orm";
import type { ClockQueryPort } from "../../application/ports/clock-query-port.js";
import type { DemoStateCommandPort } from "../../application/ports/demo-state-command-port.js";
import { activities, customers, demoClock, equipment, reservations } from "./schema.js";
import { runAtomic } from "./atomic-transaction.js";
import { seedDemo } from "./demo-seed.js";
import type { RentalDatabase } from "./database-types.js";

export function createSqliteDemoClockPorts(database: RentalDatabase): {
  clock: ClockQueryPort;
  demo: DemoStateCommandPort;
} {
  const { connection, orm } = database;
  const clock: ClockQueryPort = {
    now() {
      const row = orm.select().from(demoClock).where(eq(demoClock.id, 1)).get();
      if (!row) throw new Error("Demo clock is missing");
      return row.now;
    },
  };
  const demo: DemoStateCommandPort = {
    advanceMinutes: (minutes) =>
      runAtomic(connection, () => {
        const now = clock.now() + minutes * 60_000;
        orm.update(demoClock).set({ now }).where(eq(demoClock.id, 1)).run();
        return now;
      }),
    reset: () =>
      runAtomic(connection, () => {
        orm.delete(activities).run();
        orm.delete(reservations).run();
        orm.delete(equipment).run();
        orm.delete(customers).run();
        orm.delete(demoClock).run();
        seedDemo(orm);
      }),
  };
  return { clock, demo };
}
