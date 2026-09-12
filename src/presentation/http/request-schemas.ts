import { z } from "zod";

const identifier = z.string().trim().min(1).max(100);
const instant = z.number().int().nonnegative();
export const createReservationSchema = z.strictObject({
  actorId: identifier,
  equipmentId: identifier,
  quantity: z.number().int().positive(),
  startAt: instant,
  endAt: instant,
});
export const changeReservationSchema = z.strictObject({
  actorId: identifier,
  action: z.enum(["confirm", "cancel", "check_out", "return"]),
});
export const advanceTimeSchema = z.strictObject({ minutes: z.number().int().min(1).max(1440) });
