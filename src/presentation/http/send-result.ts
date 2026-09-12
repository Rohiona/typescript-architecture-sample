import type { Context } from "hono";
import type { Result } from "../../domain/rentals/types.js";
import { getErrorStatus } from "./error-status.js";

export function sendResult<T>(
  context: Context,
  result: Result<T>,
  status: 200 | 201,
  body: (value: T) => Record<string, unknown>,
): Response {
  return result.ok
    ? context.json(body(result.value), status)
    : context.json({ error: result.error }, getErrorStatus(result.error.code));
}
