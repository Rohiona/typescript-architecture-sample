import type { createDashboardQueryService } from "../../../services/dashboard/read/dashboard-query-service-factory.js";

export function createReadDashboardUseCase(service: ReturnType<typeof createDashboardQueryService>) {
  return { execute: () => service.execute() };
}
