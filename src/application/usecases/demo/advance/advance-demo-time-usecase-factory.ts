import type { createAdvanceDemoTimeService } from "../../../services/demo/advance/advance-demo-time-service-factory.js";

export function createAdvanceDemoTimeUseCase(service: ReturnType<typeof createAdvanceDemoTimeService>) {
  return { execute: (minutes: number) => service.execute(minutes) };
}
