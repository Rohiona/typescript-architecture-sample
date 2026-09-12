import type { createReadDashboardUseCase } from "../../application/usecases/dashboard/read/read-dashboard-usecase-factory.js";
import type { createReservationCreationUseCase } from "../../application/usecases/reservations/create/create-reservation-usecase-factory.js";
import type { createReservationChangeUseCase } from "../../application/usecases/reservations/change/change-reservation-usecase-factory.js";
import type { createAdvanceDemoTimeUseCase } from "../../application/usecases/demo/advance/advance-demo-time-usecase-factory.js";
import type { createResetDemoUseCase } from "../../application/usecases/demo/reset/reset-demo-usecase-factory.js";

export interface RentalHttpUseCases {
  dashboard: ReturnType<typeof createReadDashboardUseCase>;
  createReservation: ReturnType<typeof createReservationCreationUseCase>;
  changeReservation: ReturnType<typeof createReservationChangeUseCase>;
  advanceTime: ReturnType<typeof createAdvanceDemoTimeUseCase>;
  resetDemo: ReturnType<typeof createResetDemoUseCase>;
}
