const notFound = new Set(["CUSTOMER_NOT_FOUND", "EQUIPMENT_NOT_FOUND", "RESERVATION_NOT_FOUND"]);
const conflict = new Set([
  "INSUFFICIENT_AVAILABILITY",
  "QUANTITY_EXCEEDED",
  "INVALID_TRANSITION",
  "OUTSIDE_PICKUP_PERIOD",
  "RESERVATION_PERIOD_ENDED",
  "PHYSICAL_STOCK_UNAVAILABLE",
  "VERSION_CONFLICT",
]);
export function getErrorStatus(code: string): 400 | 403 | 404 | 409 {
  if (code === "FORBIDDEN") return 403;
  if (notFound.has(code)) return 404;
  return conflict.has(code) ? 409 : 400;
}
