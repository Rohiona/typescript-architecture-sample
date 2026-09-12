import type { ReservationCommandPort } from "../../application/ports/reservation-command-port.js";
import type { JsonHttpClient } from "./json-http-client-factory.js";

export function createReservationHttpCommand(client: JsonHttpClient): ReservationCommandPort {
  return {
    createReservation: (input) => client.request("/api/reservations", input),
    performAction: ({ reservationId, actorId, action }) =>
      client.request("/api/reservations/" + encodeURIComponent(reservationId) + "/actions", { actorId, action }),
  };
}
