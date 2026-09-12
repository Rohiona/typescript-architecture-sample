import { describe, expect, it } from "vitest";
import {
  defaultReservationPeriod,
  formatDate,
  formatPeriod,
  formatTime,
  fromDateTimeInput,
  toDateTimeInput,
} from "../../src/presentation/web/date-time.js";

describe("日本時間の入力と表示", () => {
  it("UTC の前日でも、日本時間の日付と時刻で表示して往復する", () => {
    const timestamp = Date.parse("2026-09-13T15:30:00Z");
    expect(toDateTimeInput(timestamp)).toBe("2026-09-14T00:30");
    expect(fromDateTimeInput("2026-09-14T00:30")).toBe(timestamp);
    expect(formatDate(timestamp)).toBe("9/14(月)");
    expect(formatTime(timestamp)).toBe("00:30");
  });

  it("年またぎと分の精度を維持する", () => {
    const value = "2027-01-01T00:01";
    expect(fromDateTimeInput(value)).toBe(Date.parse("2026-12-31T15:01:00Z"));
    expect(toDateTimeInput(fromDateTimeInput(value))).toBe(value);
  });

  it.each(["", "2026-09-14", "2026-09-14T09:00Z", "2026-02-30T09:00", "2026-13-01T09:00", "2026-09-14T25:00"])(
    "日時入力として不正な値 %s を受け付けない",
    (value) => {
      expect(Number.isNaN(fromDateTimeInput(value))).toBe(true);
    },
  );

  it("初期 9 時から 10〜12 時の予約を提案する", () => {
    expect(defaultReservationPeriod(Date.parse("2026-09-14T09:00:00+09:00"))).toEqual({
      start: "2026-09-14T10:00",
      end: "2026-09-14T12:00",
    });
  });

  it("時刻を進めると次の正時を提案し、日またぎにも追従する", () => {
    expect(defaultReservationPeriod(Date.parse("2026-09-14T23:15:00+09:00"))).toEqual({
      start: "2026-09-15T00:00",
      end: "2026-09-15T02:00",
    });
  });

  it("同日は日付をまとめ、日をまたぐ期間は両日を表示する", () => {
    expect(formatPeriod(Date.parse("2026-09-14T10:00:00+09:00"), Date.parse("2026-09-14T12:00:00+09:00"))).toBe(
      "9/14(月) 10:00 — 12:00",
    );
    expect(formatPeriod(Date.parse("2026-09-14T23:00:00+09:00"), Date.parse("2026-09-15T01:00:00+09:00"))).toBe(
      "9/14(月) 23:00 — 9/15(火) 01:00",
    );
  });
});
