import { describe, it, expect } from "vitest";
import { resolveAgainstBookings } from "./queue";

// TC-13 (FR-10/B2): the walk-in queue must never schedule over a confirmed
// booking — it has to step aside and resume right after it instead.
describe("resolveAgainstBookings — TC-13 (B2 rule)", () => {
  it("pushes the candidate start past a confirmed booking it would overlap", () => {
    const staff = {
      id: "staff_1",
      cursor: 540, // 09:00
      shiftEnd: 1020, // 17:00
      serviceIds: new Set(["svc_1"]),
      bookings: [{ start: 540, end: 570 }], // 09:00–09:30 confirmed booking
    };

    const result = resolveAgainstBookings(staff, 540, 20);

    expect(result).toBe(570); // bumped to the end of the booking, not 09:00
  });

  it("leaves the candidate untouched when there is no overlap", () => {
    const staff = {
      id: "staff_1",
      cursor: 600,
      shiftEnd: 1020,
      serviceIds: new Set(["svc_1"]),
      bookings: [{ start: 540, end: 570 }],
    };

    const result = resolveAgainstBookings(staff, 600, 20);

    expect(result).toBe(600);
  });

  it("returns null when the block no longer fits before the shift ends", () => {
    const staff = {
      id: "staff_1",
      cursor: 1000,
      shiftEnd: 1020, // 17:00
      serviceIds: new Set(["svc_1"]),
      bookings: [],
    };

    const result = resolveAgainstBookings(staff, 1000, 30); // would end at 17:30

    expect(result).toBeNull();
  });

  it("steps past two consecutive confirmed bookings, not just the first", () => {
    const staff = {
      id: "staff_1",
      cursor: 540,
      shiftEnd: 1020,
      serviceIds: new Set(["svc_1"]),
      bookings: [
        { start: 540, end: 570 },
        { start: 570, end: 600 },
      ],
    };

    const result = resolveAgainstBookings(staff, 540, 15);

    expect(result).toBe(600);
  });
});
