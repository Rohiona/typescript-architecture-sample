import type { Dashboard } from "../../contracts/dashboard.js";

export interface DashboardQueryPort {
  readDashboard(): Promise<Dashboard>;
}
