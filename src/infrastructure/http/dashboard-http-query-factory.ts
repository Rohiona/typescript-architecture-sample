import type { DashboardQueryPort } from "../../application/ports/dashboard-query-port.js";
import type { JsonHttpClient } from "./json-http-client.js";

export function createDashboardHttpQuery(client: JsonHttpClient): DashboardQueryPort {
  return { readDashboard: () => client.request("/api/dashboard") };
}
