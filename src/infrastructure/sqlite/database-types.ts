import type Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "./schema.js";

export interface RentalDatabase {
  connection: Database.Database;
  orm: BetterSQLite3Database<typeof schema>;
}
