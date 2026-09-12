import { and, eq } from "drizzle-orm";
import type { RentalCommandPort, RentalTransaction } from "../../application/ports/rental-command-port.js";
import { activities, customers, equipment, reservations } from "./schema.js";
import { runAtomic } from "./atomic-transaction.js";
import type { RentalDatabase } from "./database-types.js";

export function createSqliteRentalCommandPort(database: RentalDatabase): RentalCommandPort {
  const { connection, orm } = database;
  const transaction: RentalTransaction = {
    getEquipment: (id) => orm.select().from(equipment).where(eq(equipment.id, id)).get() ?? null,
    getCustomer: (id) => orm.select().from(customers).where(eq(customers.id, id)).get() ?? null,
    getReservation: (id) => orm.select().from(reservations).where(eq(reservations.id, id)).get() ?? null,
    listReservations: () => orm.select().from(reservations).all(),
    insertReservation: (reservation) => {
      orm.insert(reservations).values(reservation).run();
    },
    updateReservation: (reservation) =>
      orm
        .update(reservations)
        .set(reservation)
        .where(and(eq(reservations.id, reservation.id), eq(reservations.version, reservation.version - 1)))
        .run().changes === 1,
    appendActivity: (activity) => {
      orm.insert(activities).values(activity).run();
    },
  };
  return { transaction: (work) => runAtomic(connection, () => work(transaction)) };
}
