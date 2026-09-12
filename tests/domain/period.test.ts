import { describe, expect, it } from "vitest";
import { isValidPeriod, periodsOverlap } from "../../src/domain/rentals/period";

describe("rental periods", () => {
  it("accepts finite increasing intervals, including times before the epoch", () => {
    expect(isValidPeriod({ startAt: -10, endAt: 0 })).toBe(true);
    expect(isValidPeriod({ startAt: 0, endAt: 1 })).toBe(true);
  });

  it.each([
    { startAt: NaN, endAt: 10 },
    { startAt: Infinity, endAt: 10 },
    { startAt: -Infinity, endAt: 10 },
    { startAt: 0, endAt: NaN },
    { startAt: 0, endAt: Infinity },
    { startAt: 0, endAt: -Infinity },
    { startAt: 10, endAt: 10 },
    { startAt: 20, endAt: 10 },
  ])("rejects invalid periods: %j", (period) => {
    expect(isValidPeriod(period)).toBe(false);
  });

  it.each([
    [{ startAt: 5, endAt: 15 }, true],
    [{ startAt: 0, endAt: 10 }, true],
    [{ startAt: 2, endAt: 3 }, true],
    [{ startAt: -10, endAt: 20 }, true],
    [{ startAt: 10, endAt: 20 }, false],
    [{ startAt: -10, endAt: 0 }, false],
    [{ startAt: 11, endAt: 20 }, false],
    [{ startAt: 5, endAt: 5 }, false],
    [{ startAt: 6, endAt: 5 }, false],
  ] as const)("compares half-open intervals with %j", (other, expected) => {
    const first = { startAt: 0, endAt: 10 };
    expect(periodsOverlap(first, other)).toBe(expected);
    expect(periodsOverlap(other, first)).toBe(expected);
  });

  it("supports an unknown return time without treating it as a valid reservation request", () => {
    expect(periodsOverlap({ startAt: 0, endAt: Infinity }, { startAt: 100, endAt: 200 })).toBe(true);
  });
});
