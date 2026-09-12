// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CreateReservationInput } from "../../src/application/ports/reservation-command-port.js";
import type { RentalAction, ReservationStatus } from "../../src/domain/rentals/types.js";
import { RentalDeskApp } from "../../src/presentation/web/app.js";
import { dashboard, DEMO_NOW, reservation } from "./fixtures.js";

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value() {} });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function createFakeDesk(initial = dashboard()) {
  let state = initial;
  return {
    readState: () => state,
    setState: (next: typeof state) => {
      state = next;
    },
    ports: {
      dashboardQuery: { readDashboard: vi.fn(async () => structuredClone(state)) },
      reservationCommands: {
        createReservation: vi.fn(async (input: CreateReservationInput) => {
          const item = reservation({ ...input, customerId: input.actorId });
          state = { ...state, reservations: [...state.reservations, item] };
          return { reservation: item };
        }),
        performAction: vi.fn(async (input: { actorId: string; reservationId: string; action: RentalAction }) => {
          const statuses: Record<RentalAction, ReservationStatus> = {
            confirm: "confirmed",
            cancel: "cancelled",
            check_out: "checked_out",
            return: "returned",
          };
          const current = state.reservations.find((item) => item.id === input.reservationId)!;
          const updated = { ...current, status: statuses[input.action], effectiveStatus: statuses[input.action] };
          state = {
            ...state,
            reservations: state.reservations.map((item) => (item.id === updated.id ? updated : item)),
          };
          return { reservation: updated };
        }),
      },
      demoCommands: {
        advanceTime: vi.fn(async (minutes: 15 | 60) => {
          state = { ...state, now: state.now + minutes * 60_000 };
          return { now: state.now };
        }),
        resetDemo: vi.fn(async (): Promise<{ ok: true }> => {
          state = dashboard();
          return { ok: true };
        }),
      },
    },
  };
}

async function ready() {
  await screen.findByRole("heading", { name: "機材一覧", level: 1 });
}

describe("貸出デスクの画面", () => {
  it("仮予約から確定し、スタッフへ切り替えて時刻を進め、貸出と返却を体験できる", async () => {
    const fake = createFakeDesk();
    const user = userEvent.setup();
    render(<RentalDeskApp {...fake.ports} />);
    await ready();

    expect((screen.getByLabelText(/^利用開始/) as HTMLInputElement).value).toBe("2026-09-14T10:00");
    await user.click(screen.getByRole("button", { name: "この内容で仮予約する" }));
    await screen.findByRole("button", { name: "予約を確定" });
    expect(fake.ports.reservationCommands.createReservation).toHaveBeenCalledWith({
      actorId: "customer-a",
      equipmentId: "camera",
      quantity: 1,
      startAt: DEMO_NOW + 3_600_000,
      endAt: DEMO_NOW + 3 * 3_600_000,
    });
    expect(screen.getByText("09:15 までに確定してください", { exact: false })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "予約を確定" }));
    await screen.findByText("予約確定");
    expect(screen.queryByRole("button", { name: "貸し出す" })).toBeNull();

    await user.selectOptions(screen.getByLabelText("利用者を切り替え"), "staff-1");
    await user.click(screen.getByRole("button", { name: "貸出管理" }));
    expect(screen.getByRole("button", { name: "貸し出す" })).toHaveProperty("disabled", true);
    await user.click(screen.getByRole("button", { name: "+1時間" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "貸し出す" })).toHaveProperty("disabled", false));
    await user.click(screen.getByRole("button", { name: "貸し出す" }));
    await screen.findByRole("button", { name: "返却を受け付ける" });
    await user.click(screen.getByRole("button", { name: "返却を受け付ける" }));
    await screen.findByRole("heading", { name: "貸出待ち・貸出中の機材はありません" });
    await user.click(screen.getByRole("button", { name: /^予約一覧/ }));
    await screen.findByText("返却済み");
    expect(
      fake.ports.reservationCommands.performAction.mock.calls.map(([input]) => [input.actorId, input.action]),
    ).toEqual([
      ["customer-a", "confirm"],
      ["staff-1", "check_out"],
      ["staff-1", "return"],
    ]);
    expect(fake.ports.demoCommands.advanceTime).toHaveBeenCalledWith(60);
  });

  it("予約エラーをフォーム付近に表示し、通信中の二重送信を防いで再試行できる", async () => {
    const fake = createFakeDesk();
    const user = userEvent.setup();
    let rejectRequest!: (reason: Error) => void;
    fake.ports.reservationCommands.createReservation.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject;
        }),
    );
    render(<RentalDeskApp {...fake.ports} />);
    await ready();
    await user.click(screen.getByRole("button", { name: "この内容で仮予約する" }));
    expect(screen.getByRole("button", { name: "空き状況を確認中…" })).toHaveProperty("disabled", true);
    rejectRequest(new Error("この時間帯は機材の空きがありません。"));
    const error = await screen.findByRole("alert");
    expect(error.textContent).toBe("この時間帯は機材の空きがありません。");
    expect(error.closest("form")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "この内容で仮予約する" }));
    await screen.findByRole("button", { name: "予約を確定" });
    expect(fake.ports.reservationCommands.createReservation).toHaveBeenCalledTimes(2);
  });

  it("時刻変更後に再取得した実効ステータスを使い、期限切れの予約を更新する", async () => {
    const fake = createFakeDesk(dashboard({ reservations: [reservation()] }));
    const user = userEvent.setup();
    fake.ports.demoCommands.advanceTime.mockImplementationOnce(async () => {
      fake.setState(
        dashboard({
          now: DEMO_NOW + 15 * 60_000,
          reservations: [reservation({ effectiveStatus: "expired" })],
        }),
      );
      return { now: DEMO_NOW + 15 * 60_000 };
    });
    render(<RentalDeskApp {...fake.ports} />);
    await ready();
    await user.click(screen.getByRole("button", { name: /^予約一覧/ }));
    expect(screen.getByRole("button", { name: "予約を確定" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "+15分" }));
    await screen.findByText("期限切れ");
    expect(screen.queryByRole("button", { name: "予約を確定" })).toBeNull();
    expect(screen.getByText("確定期限を過ぎました。必要な場合は新しく予約してください。")).toBeDefined();
    expect(fake.ports.dashboardQuery.readDashboard).toHaveBeenCalledTimes(2);
    expect(fake.ports.demoCommands.advanceTime).toHaveBeenCalledWith(15);
    await user.click(screen.getByRole("button", { name: "もう一度予約する" }));
    expect((screen.getByLabelText(/^利用開始/) as HTMLInputElement).value).toBe("2026-09-14T10:00");
  });

  it("読込失敗から再試行して、空の予約一覧も案内する", async () => {
    const fake = createFakeDesk();
    fake.ports.dashboardQuery.readDashboard.mockRejectedValueOnce(new Error("接続できませんでした。"));
    const user = userEvent.setup();
    render(<RentalDeskApp {...fake.ports} />);
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "もう一度読み込む" }));
    await ready();
    await user.click(screen.getByRole("button", { name: /^予約一覧/ }));
    expect(screen.getByRole("heading", { name: "表示する予約はありません" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "機材一覧を見る" }));
    await ready();
  });

  it("他の利用者の予約操作を表示せず、スタッフには全員の予約を表示する", async () => {
    const fake = createFakeDesk(
      dashboard({
        reservations: [reservation({ customerId: "customer-b" })],
      }),
    );
    const user = userEvent.setup();
    render(<RentalDeskApp {...fake.ports} />);
    await ready();
    await user.click(screen.getByRole("button", { name: /^予約一覧/ }));
    expect(screen.queryByRole("button", { name: "予約を確定" })).toBeNull();
    expect(screen.queryByRole("button", { name: "貸出管理" })).toBeNull();
    await user.selectOptions(screen.getByLabelText("利用者を切り替え"), "staff-1");
    expect(screen.getByRole("button", { name: "予約を確定" })).toBeDefined();
    expect(screen.getByRole("button", { name: "貸出管理" })).toBeDefined();
  });

  it("初期化の確認を閉じた場合は保存内容を消さず、確認後に初期化する", async () => {
    const fake = createFakeDesk(dashboard({ reservations: [reservation()] }));
    const user = userEvent.setup();
    render(<RentalDeskApp {...fake.ports} />);
    await ready();
    await user.click(screen.getByRole("button", { name: "初期化" }));
    await screen.findByRole("dialog");
    expect(fake.ports.demoCommands.resetDemo).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "戻る" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "初期化" }));
    await user.click(screen.getByRole("button", { name: "デモを初期化" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fake.ports.demoCommands.resetDemo).toHaveBeenCalledTimes(1);
    expect(screen.getByText("デモを初期状態に戻しました。")).toBeDefined();
  });

  it("操作後の読込に失敗した場合、操作の再送ではなく更新を案内する", async () => {
    const fake = createFakeDesk();
    const user = userEvent.setup();
    render(<RentalDeskApp {...fake.ports} />);
    await ready();
    fake.ports.dashboardQuery.readDashboard.mockRejectedValueOnce(new Error("読込に失敗しました。"));
    await user.click(screen.getByRole("button", { name: "この内容で仮予約する" }));
    await screen.findByText("操作は完了しましたが、表示を更新できませんでした。再読み込みして状態を確認してください。");
    expect(fake.ports.reservationCommands.createReservation).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "再読み込み" }));
    await waitFor(() => expect(screen.queryByText("読込に失敗しました。")).toBeNull());
    expect(fake.ports.reservationCommands.createReservation).toHaveBeenCalledTimes(1);
  });
});
