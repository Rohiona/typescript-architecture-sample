import { describe, expect, it } from "vitest";
import { getMaximumConcurrentQuantity, type QuantityOccupancy } from "../../src/domain/rentals/concurrent-quantity";

const occupancy = (startAt: number, endAt: number, quantity: number): QuantityOccupancy => ({
  period: { startAt, endAt },
  quantity,
});
const window = { startAt: 0, endAt: 100 };

describe("maximum concurrent occupied quantity", () => {
  it("uses zero for an empty calendar", () => {
    expect(getMaximumConcurrentQuantity([], window)).toBe(0);
  });

  it("ignores periods outside or merely touching the requested window", () => {
    expect(
      getMaximumConcurrentQuantity([occupancy(-10, 0, 3), occupancy(100, 200, 4), occupancy(40, 40, 8)], window),
    ).toBe(0);
  });

  it("does not add consecutive reservations as if they were simultaneous", () => {
    expect(getMaximumConcurrentQuantity([occupancy(0, 50, 2), occupancy(50, 100, 2)], window)).toBe(2);
  });

  it("finds an interior peak instead of summing every intersecting reservation", () => {
    expect(
      getMaximumConcurrentQuantity([occupancy(0, 100, 1), occupancy(25, 50, 2), occupancy(60, 80, 4)], window),
    ).toBe(5);
  });

  it("counts only the part of each reservation within the requested window", () => {
    expect(
      getMaximumConcurrentQuantity(
        [occupancy(-100, 200, 2), occupancy(-10, 20, 1), occupancy(80, 120, 3), occupancy(90, 110, 7)],
        { startAt: 0, endAt: 85 },
      ),
    ).toBe(5);
  });

  it("supports unknown return times and clips them to the query window", () => {
    expect(getMaximumConcurrentQuantity([occupancy(-10, Infinity, 2)], window)).toBe(2);
  });

  it.each([false, true])("merges equal timestamps independently of input order %s", (reverse) => {
    const items = [occupancy(0, 50, 2), occupancy(0, 50, 1), occupancy(50, 100, 2), occupancy(50, 100, 1)];
    expect(getMaximumConcurrentQuantity(reverse ? items.reverse() : items, window)).toBe(3);
  });
});
