import type { Result } from "../../../../domain/rentals/types.js";
import type { DemoStateCommandPort } from "../../../ports/demo-state-command-port.js";
import { failure } from "../../shared/failure.js";

export function createAdvanceDemoTimeService(demo: DemoStateCommandPort) {
  return {
    execute(minutes: number): Result<{ now: number }> {
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
        return failure("INVALID_MINUTES", "進める時間は1〜1440分の整数で指定してください。");
      }
      return { ok: true, value: { now: demo.advanceMinutes(minutes) } };
    },
  };
}
