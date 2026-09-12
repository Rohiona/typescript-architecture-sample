import { readFileSync } from "node:fs";
import type Database from "better-sqlite3";
import { runAtomic } from "./atomic-transaction.js";

const migrations = [{ version: 1, path: new URL("./migrations/0001-initial.sql", import.meta.url) }];

export function migrate(connection: Database.Database): void {
  runAtomic(connection, () => {
    connection.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL)");
    for (const migration of migrations) {
      const applied = connection
        .prepare("SELECT version FROM schema_migrations WHERE version = ?")
        .get(migration.version);
      if (applied) continue;
      connection.exec(readFileSync(migration.path, "utf8"));
      connection.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(migration.version);
    }
  });
}
