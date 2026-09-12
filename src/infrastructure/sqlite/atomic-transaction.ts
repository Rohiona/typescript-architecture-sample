import type Database from "better-sqlite3";

/** Keep the read/check/write sequence under SQLite's write lock; rejected Results also roll back. */
export function runAtomic<T>(connection: Database.Database, work: () => T): T {
  let rejected: { value: T } | undefined;
  try {
    return connection
      .transaction(() => {
        const value = work();
        if (typeof value === "object" && value !== null && "ok" in value && value.ok === false) {
          rejected = { value };
          throw rejected;
        }
        return value;
      })
      .immediate();
  } catch (error) {
    if (rejected !== undefined && error === rejected) return rejected.value;
    throw error;
  }
}
