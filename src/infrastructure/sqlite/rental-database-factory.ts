import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { migrate } from "./migrate.js";
import { seedDemo } from "./demo-seed.js";
import { runAtomic } from "./atomic-transaction.js";
import type { RentalDatabase } from "./database-types.js";

export function createRentalDatabase(path: string): RentalDatabase {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const connection = new Database(path);
  try {
    connection.pragma("foreign_keys = ON");
    connection.pragma("busy_timeout = 5000");
    connection.pragma("journal_mode = WAL");
    migrate(connection);
    const orm = drizzle(connection, { schema });
    runAtomic(connection, () => {
      if (!orm.select().from(schema.demoClock).get()) seedDemo(orm);
    });
    return { connection, orm };
  } catch (error) {
    connection.close();
    throw error;
  }
}
