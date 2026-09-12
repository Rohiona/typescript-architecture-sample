import { createJsonHttpClient } from "../../infrastructure/http/json-http-client.js";
import { createDashboardHttpQuery } from "../../infrastructure/http/dashboard-http-query-factory.js";
import { createReservationHttpCommand } from "../../infrastructure/http/reservation-http-command-factory.js";
import { createDemoHttpCommand } from "../../infrastructure/http/demo-http-command-factory.js";

export function createRentalDesk() {
  const client = createJsonHttpClient();
  return {
    dashboardQuery: createDashboardHttpQuery(client),
    reservationCommands: createReservationHttpCommand(client),
    demoCommands: createDemoHttpCommand(client),
  };
}
