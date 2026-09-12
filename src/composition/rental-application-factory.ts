import { createRentalDatabase } from "../infrastructure/sqlite/rental-database-factory.js";
import { createSqliteRentalQueryPort } from "../infrastructure/sqlite/rental-query-port-factory.js";
import { createSqliteRentalCommandPort } from "../infrastructure/sqlite/rental-command-port-factory.js";
import { createSqliteDemoClockPorts } from "../infrastructure/sqlite/demo-clock-ports-factory.js";
import { uuidPort } from "../infrastructure/identifiers/uuid-identifier-port.js";
import { createReservationCreationService } from "../application/services/reservations/create/create-reservation-service-factory.js";
import { createReservationChangeService } from "../application/services/reservations/change/change-reservation-service-factory.js";
import { createDashboardQueryService } from "../application/services/dashboard/read/dashboard-query-service-factory.js";
import { createAdvanceDemoTimeService } from "../application/services/demo/advance/advance-demo-time-service-factory.js";
import { createReservationCreationUseCase } from "../application/usecases/reservations/create/create-reservation-usecase-factory.js";
import { createReservationChangeUseCase } from "../application/usecases/reservations/change/change-reservation-usecase-factory.js";
import { createReadDashboardUseCase } from "../application/usecases/dashboard/read/read-dashboard-usecase-factory.js";
import { createAdvanceDemoTimeUseCase } from "../application/usecases/demo/advance/advance-demo-time-usecase-factory.js";
import { createResetDemoUseCase } from "../application/usecases/demo/reset/reset-demo-usecase-factory.js";

export function createRentalApplication(databasePath = ".data/rentals.db") {
  const database = createRentalDatabase(databasePath);
  const query = createSqliteRentalQueryPort(database);
  const rentals = createSqliteRentalCommandPort(database);
  const { clock, demo } = createSqliteDemoClockPorts(database);
  const dependencies = { rentals, clock, ids: uuidPort };
  return {
    dashboard: createReadDashboardUseCase(createDashboardQueryService(query, clock)),
    createReservation: createReservationCreationUseCase(createReservationCreationService(dependencies)),
    changeReservation: createReservationChangeUseCase(createReservationChangeService(dependencies)),
    advanceTime: createAdvanceDemoTimeUseCase(createAdvanceDemoTimeService(demo)),
    resetDemo: createResetDemoUseCase(demo),
    close: () => database.connection.close(),
  };
}
