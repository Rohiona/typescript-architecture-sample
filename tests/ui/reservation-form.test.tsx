// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReservationForm } from "../../src/presentation/web/reservation-form.js";
import { dashboard, DEMO_NOW } from "./fixtures.js";

afterEach(cleanup);

it("未編集の予約時間はデモ時刻に追従し、入力した予定は時刻操作で上書きしない", () => {
  const state = dashboard();
  const props = {
    equipment: state.equipment[0]!,
    actor: state.customers[0]!,
    now: DEMO_NOW,
    pending: false,
    onSubmit: vi.fn(),
  };
  const { rerender } = render(<ReservationForm {...props} />);
  const start = screen.getByLabelText(/^利用開始/) as HTMLInputElement;
  const end = screen.getByLabelText(/^利用終了/) as HTMLInputElement;
  expect(start.value).toBe("2026-09-14T10:00");
  rerender(<ReservationForm {...props} now={DEMO_NOW + 3_600_000} />);
  expect(start.value).toBe("2026-09-14T11:00");
  expect(end.value).toBe("2026-09-14T13:00");
  fireEvent.change(start, { target: { value: "2026-09-14T15:00" } });
  fireEvent.change(end, { target: { value: "2026-09-14T17:00" } });
  rerender(<ReservationForm {...props} now={DEMO_NOW + 2 * 3_600_000} />);
  expect(start.value).toBe("2026-09-14T15:00");
  expect(end.value).toBe("2026-09-14T17:00");
});
