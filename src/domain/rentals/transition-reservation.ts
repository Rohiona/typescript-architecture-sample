import { getEffectiveStatus } from "./reservation-status";
import type { Customer, RentalAction, Reservation, ReservationStatus, Result } from "./types";

export function transitionReservation(
  reservation: Reservation,
  action: RentalAction,
  actor: Customer,
  now: number,
): Result<Reservation> {
  if (!Number.isFinite(now)) {
    return { ok: false, error: { code: "INVALID_TIME", message: "操作日時が正しくありません。" } };
  }
  if (
    actor.role !== "staff" &&
    (actor.id !== reservation.customerId || (action !== "confirm" && action !== "cancel"))
  ) {
    return { ok: false, error: { code: "FORBIDDEN", message: "この予約に対してその操作を行う権限がありません。" } };
  }
  const status = getEffectiveStatus(reservation, now);
  let nextStatus: ReservationStatus;
  switch (action) {
    case "confirm":
      if (status !== "held") {
        return { ok: false, error: { code: "INVALID_TRANSITION", message: "有効な仮予約のみ確定できます。" } };
      }
      if (now >= reservation.endAt) {
        return {
          ok: false,
          error: { code: "RESERVATION_PERIOD_ENDED", message: "利用時間が終了した仮予約は確定できません。" },
        };
      }
      nextStatus = "confirmed";
      break;
    case "cancel":
      if (status !== "held" && status !== "confirmed") {
        return {
          ok: false,
          error: { code: "INVALID_TRANSITION", message: "仮予約または確定済みの予約のみ取り消せます。" },
        };
      }
      nextStatus = "cancelled";
      break;
    case "check_out":
      if (status !== "confirmed") {
        return { ok: false, error: { code: "INVALID_TRANSITION", message: "確定済みの予約のみ貸し出せます。" } };
      }
      if (now < reservation.startAt || now >= reservation.endAt) {
        return {
          ok: false,
          error: {
            code: "OUTSIDE_PICKUP_PERIOD",
            message: "貸出は予約の開始時刻以降、終了時刻より前に行ってください。",
          },
        };
      }
      nextStatus = "checked_out";
      break;
    case "return":
      if (status !== "checked_out") {
        return { ok: false, error: { code: "INVALID_TRANSITION", message: "貸出中の予約のみ返却できます。" } };
      }
      nextStatus = "returned";
      break;
  }
  return {
    ok: true,
    value: {
      ...reservation,
      status: nextStatus,
      returnedAt: action === "return" ? now : reservation.returnedAt,
      version: reservation.version + 1,
    },
  };
}
