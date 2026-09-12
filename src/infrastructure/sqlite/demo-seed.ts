import { activities, customers, demoClock, equipment, reservations } from "./schema.js";
import type { RentalDatabase } from "./database-types.js";

export const INITIAL_DEMO_TIME = Date.parse("2026-09-14T09:00:00+09:00");
const minute = 60_000;

export function seedDemo(orm: RentalDatabase["orm"]): void {
  orm
    .insert(customers)
    .values([
      { id: "customer-a", name: "高橋 凛", role: "member" },
      { id: "customer-b", name: "佐藤 海斗", role: "member" },
      { id: "staff-1", name: "貸出スタッフ", role: "staff" },
    ])
    .run();
  orm
    .insert(equipment)
    .values([
      {
        id: "camera",
        name: "ミラーレスカメラ",
        category: "camera",
        description: "標準ズームレンズ付き。",
        totalQuantity: 1,
        turnaroundMinutes: 30,
        maintenance: [],
      },
      {
        id: "projector",
        name: "モバイルプロジェクター",
        category: "projector",
        description: "会議・上映用。13:00–14:00は点検。",
        totalQuantity: 2,
        turnaroundMinutes: 30,
        maintenance: [{ startAt: INITIAL_DEMO_TIME + 240 * minute, endAt: INITIAL_DEMO_TIME + 300 * minute }],
      },
      {
        id: "tripod",
        name: "カーボン三脚",
        category: "tripod",
        description: "撮影用三脚。返却後の準備時間は15分。",
        totalQuantity: 3,
        turnaroundMinutes: 15,
        maintenance: [],
      },
    ])
    .run();
  orm
    .insert(reservations)
    .values([
      {
        id: "seed-projector",
        equipmentId: "projector",
        customerId: "customer-b",
        quantity: 1,
        startAt: INITIAL_DEMO_TIME,
        endAt: INITIAL_DEMO_TIME + 120 * minute,
        status: "confirmed",
        holdExpiresAt: INITIAL_DEMO_TIME - 15 * minute,
        createdAt: INITIAL_DEMO_TIME - 30 * minute,
        returnedAt: null,
        version: 1,
      },
      {
        id: "seed-tripod",
        equipmentId: "tripod",
        customerId: "customer-a",
        quantity: 1,
        startAt: INITIAL_DEMO_TIME + 60 * minute,
        endAt: INITIAL_DEMO_TIME + 120 * minute,
        status: "held",
        holdExpiresAt: INITIAL_DEMO_TIME + 15 * minute,
        createdAt: INITIAL_DEMO_TIME,
        returnedAt: null,
        version: 1,
      },
    ])
    .run();
  orm.insert(demoClock).values({ id: 1, now: INITIAL_DEMO_TIME }).run();
  orm
    .insert(activities)
    .values({
      id: "seed-activity",
      at: INITIAL_DEMO_TIME,
      message: "デモを開始しました。カメラは予約できます。",
    })
    .run();
}
