import { asc, desc } from "drizzle-orm";
import type { RentalQueryPort } from "../../application/ports/rental-query-port.js";
import { activities, customers, equipment, reservations } from "./schema.js";
import type { RentalDatabase } from "./database-types.js";

export function createSqliteRentalQueryPort(database: RentalDatabase): RentalQueryPort {
  const { connection, orm } = database;
  return {
    readSnapshot: () =>
      connection.transaction(() => ({
        customers: orm.select().from(customers).orderBy(asc(customers.id)).all(),
        equipment: orm.select().from(equipment).orderBy(asc(equipment.id)).all(),
        reservations: orm.select().from(reservations).orderBy(desc(reservations.createdAt), asc(reservations.id)).all(),
        activities: orm.select().from(activities).orderBy(desc(activities.at), desc(activities.id)).limit(40).all(),
      }))(),
  };
}
