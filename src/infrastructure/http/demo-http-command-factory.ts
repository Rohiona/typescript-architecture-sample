import type { DemoCommandPort } from "../../application/ports/demo-command-port.js";
import type { JsonHttpClient } from "./json-http-client.js";

export function createDemoHttpCommand(client: JsonHttpClient): DemoCommandPort {
  return {
    advanceTime: (minutes) => client.request("/api/demo/advance", { minutes }),
    resetDemo: () => client.request("/api/demo/reset", {}),
  };
}
