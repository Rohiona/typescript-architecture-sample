import { Hono } from "hono";
import type { RentalHttpUseCases } from "./http-usecases.js";
import { createReservationSchema, changeReservationSchema, advanceTimeSchema } from "./request-schemas.js";
import { parseRequestBody } from "./parse-request-body.js";
import { sendResult } from "./send-result.js";

export function createRentalHttpApp(usecases: RentalHttpUseCases) {
  const app = new Hono();
  app.use("/api/*", async (context, next) => {
    context.header("Cache-Control", "no-store");
    await next();
  });
  app.onError((_error, context) =>
    context.json(
      {
        error: { code: "INTERNAL_ERROR", message: "処理を完了できませんでした。もう一度お試しください。" },
      },
      500,
    ),
  );
  app.get("/api/health", (context) => context.json({ status: "ok" }));
  app.get("/api/dashboard", (context) => context.json(usecases.dashboard.execute()));
  app.post("/api/reservations", async (context) => {
    const input = await parseRequestBody(context.req.raw, createReservationSchema);
    if (!input.ok) return context.json({ error: input.error }, 400);
    return sendResult(context, usecases.createReservation.execute(input.value), 201, (reservation) => ({
      reservation,
    }));
  });
  app.post("/api/reservations/:id/actions", async (context) => {
    const input = await parseRequestBody(context.req.raw, changeReservationSchema);
    if (!input.ok) return context.json({ error: input.error }, 400);
    const result = usecases.changeReservation.execute({ ...input.value, reservationId: context.req.param("id") });
    return sendResult(context, result, 200, (reservation) => ({ reservation }));
  });
  app.post("/api/demo/advance", async (context) => {
    const input = await parseRequestBody(context.req.raw, advanceTimeSchema);
    if (!input.ok) return context.json({ error: input.error }, 400);
    return sendResult(context, usecases.advanceTime.execute(input.value.minutes), 200, (value) => ({ now: value.now }));
  });
  app.post("/api/demo/reset", (context) => context.json(usecases.resetDemo.execute()));
  app.notFound((context) => context.json({ error: { code: "NOT_FOUND", message: "ページが見つかりません。" } }, 404));
  return app;
}
