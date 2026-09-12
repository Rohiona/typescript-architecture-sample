import { isValidPeriod } from "./period";
import type { ReservationRequest, Result } from "./types";

export function validateReservationRequest(input: ReservationRequest, now: number): Result<ReservationRequest> {
  if (!Number.isFinite(now) || !isValidPeriod(input)) {
    return {
      ok: false,
      error: { code: "INVALID_PERIOD", message: "開始と終了に有効な日時を指定し、終了を開始より後にしてください。" },
    };
  }
  if (input.startAt < now) {
    return { ok: false, error: { code: "START_IN_PAST", message: "予約の開始日時は現在以降を指定してください。" } };
  }
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) {
    return { ok: false, error: { code: "INVALID_QUANTITY", message: "数量は1以上の安全な整数で指定してください。" } };
  }
  return { ok: true, value: input };
}
