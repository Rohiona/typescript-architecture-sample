import type { DemoStateCommandPort } from "../../../ports/demo-state-command-port.js";

export function createResetDemoUseCase(demo: DemoStateCommandPort) {
  return {
    execute: () => {
      demo.reset();
      return { ok: true } as const;
    },
  };
}
