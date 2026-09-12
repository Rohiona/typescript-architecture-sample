import { describe, expect, it, vi } from "vitest";
import { createJsonHttpClient } from "../../src/infrastructure/http/json-http-client-factory.js";
import { createDashboardHttpQuery } from "../../src/infrastructure/http/dashboard-http-query-factory.js";
import { createReservationHttpCommand } from "../../src/infrastructure/http/reservation-http-command-factory.js";
import { createDemoHttpCommand } from "../../src/infrastructure/http/demo-http-command-factory.js";
import { dashboard, DEMO_NOW, reservation } from "./fixtures.js";

describe("ブラウザーの HTTP アダプター", () => {
  it("Dashboard を取得し、表示用の実効ステータスをそのまま返す", async () => {
    const data = dashboard({ reservations: [reservation({ effectiveStatus: "expired" })] });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(data)));
    const query = createDashboardHttpQuery(createJsonHttpClient(fetcher));
    expect(await query.readDashboard()).toEqual(data);
    expect(fetcher).toHaveBeenCalledWith("/api/dashboard", { headers: { Accept: "application/json" } });
  });

  it("予約の作成と操作を、それぞれの API へ送信する", async () => {
    const item = reservation();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response(JSON.stringify({ reservation: item }), { status: 201 }));
    const commands = createReservationHttpCommand(createJsonHttpClient(fetcher));
    const input = {
      actorId: "customer-a",
      equipmentId: "camera",
      quantity: 1,
      startAt: DEMO_NOW + 3_600_000,
      endAt: DEMO_NOW + 3 * 3_600_000,
    };
    expect(await commands.createReservation(input)).toEqual({ reservation: item });
    expect(fetcher).toHaveBeenLastCalledWith("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
    });
    await commands.performAction({ actorId: "staff-1", reservationId: "item/with space", action: "return" });
    expect(fetcher).toHaveBeenLastCalledWith("/api/reservations/item%2Fwith%20space/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ actorId: "staff-1", action: "return" }),
    });
  });

  it("時刻操作と初期化を API へ送り、ローカルで状態を書き換えない", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ now: DEMO_NOW + 900_000 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));
    const commands = createDemoHttpCommand(createJsonHttpClient(fetcher));
    expect(await commands.advanceTime(15)).toEqual({ now: DEMO_NOW + 900_000 });
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/demo/advance");
    expect(fetcher.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ minutes: 15 }));
    expect(await commands.resetDemo()).toEqual({ ok: true });
    expect(fetcher.mock.calls[1]?.[0]).toBe("/api/demo/reset");
  });

  it.each([400, 403, 404, 409])("HTTP %i の日本語メッセージを UI に渡す", async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "UNAVAILABLE", message: "この時間帯は空きがありません。" } }), {
        status,
      }),
    );
    await expect(createJsonHttpClient(fetcher).request("/api/reservations", {})).rejects.toThrow(
      "この時間帯は空きがありません。",
    );
  });

  it("通信失敗、壊れた JSON、不明なエラー形式にも日本語で案内する", async () => {
    const offline = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(createJsonHttpClient(offline).request("/api/dashboard")).rejects.toThrow(
      "サーバーに接続できませんでした",
    );
    const malformed = vi.fn<typeof fetch>().mockResolvedValue(new Response("<html>bad gateway</html>"));
    await expect(createJsonHttpClient(malformed).request("/api/dashboard")).rejects.toThrow(
      "情報を読み込めませんでした",
    );
    const unknownError = vi.fn<typeof fetch>().mockResolvedValue(new Response("null", { status: 500 }));
    await expect(createJsonHttpClient(unknownError).request("/api/dashboard")).rejects.toThrow(
      "操作を完了できませんでした",
    );
  });
});
