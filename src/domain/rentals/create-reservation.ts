import { getAvailableQuantity } from "./availability";
import { validateReservationRequest } from "./reservation-request";
import type { Equipment, Reservation, ReservationRequest, Result } from "./types";

export function createReservation(
  input: ReservationRequest,
  equipment: Equipment,
  existing: Reservation[],
  now: number,
  id: string,
): Result<Reservation> {
  const validated = validateReservationRequest(input, now);
  if (!validated.ok) return validated;
  if (input.equipmentId !== equipment.id) {
    return {
      ok: false,
      error: { code: "EQUIPMENT_MISMATCH", message: "選択した機材と予約対象の機材が一致しません。" },
    };
  }
  if (input.quantity > equipment.totalQuantity) {
    return { ok: false, error: { code: "QUANTITY_EXCEEDED", message: "機材の保有数を超える数量は予約できません。" } };
  }
  if (input.quantity > getAvailableQuantity(equipment, existing, input, now)) {
    return {
      ok: false,
      error: {
        code: "INSUFFICIENT_AVAILABILITY",
        message: "指定した時間帯に必要な台数を確保できません。点検と返却後の準備時間も含めて確認してください。",
      },
    };
  }
  return {
    ok: true,
    value: {
      ...input,
      id,
      status: "held",
      holdExpiresAt: now + 15 * 60_000,
      createdAt: now,
      returnedAt: null,
      version: 1,
    },
  };
}
