import type { Dashboard, ReservationView } from "../../src/contracts/dashboard.js";

export const DEMO_NOW = Date.parse("2026-09-14T09:00:00+09:00");

export function reservation(overrides: Partial<ReservationView> = {}): ReservationView {
  return {
    id: "reservation-1",
    equipmentId: "camera",
    customerId: "customer-a",
    quantity: 1,
    startAt: DEMO_NOW + 3_600_000,
    endAt: DEMO_NOW + 3 * 3_600_000,
    status: "held",
    effectiveStatus: "held",
    holdExpiresAt: DEMO_NOW + 15 * 60_000,
    createdAt: DEMO_NOW,
    returnedAt: null,
    version: 1,
    ...overrides,
  };
}

export function dashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    now: DEMO_NOW,
    customers: [
      { id: "customer-a", name: "高橋 凛", role: "member" },
      { id: "customer-b", name: "佐藤 海斗", role: "member" },
      { id: "staff-1", name: "貸出スタッフ", role: "staff" },
    ],
    equipment: [
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
        description: "会議・上映用。",
        totalQuantity: 2,
        turnaroundMinutes: 30,
        maintenance: [],
      },
      {
        id: "tripod",
        name: "カーボン三脚",
        category: "tripod",
        description: "撮影用三脚。",
        totalQuantity: 3,
        turnaroundMinutes: 15,
        maintenance: [],
      },
    ],
    reservations: [],
    activities: [],
    ...overrides,
  };
}
