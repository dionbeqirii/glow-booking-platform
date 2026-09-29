import { describe, it, expect } from "vitest";
import { serviceSchema, bookingCreateSchema, feedbackSchema } from "./validation";

// TC-01 (FR-01): admin creates a service with a negative price.
describe("serviceSchema — TC-01", () => {
  it("rejects a negative price", () => {
    const result = serviceSchema.safeParse({
      name: "Pastrim fytyre",
      durationMin: 45,
      price: -5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid service", () => {
    const result = serviceSchema.safeParse({
      name: "Pastrim fytyre",
      durationMin: 45,
      price: 25,
    });
    expect(result.success).toBe(true);
  });
});

// EC-07 (FR-17): a request bypassing the UI sends a malformed startTime.
describe("bookingCreateSchema — EC-07", () => {
  it("rejects a booking whose startTime is not a valid date/time", () => {
    const result = bookingCreateSchema.safeParse({
      serviceId: "svc_1",
      staffId: "staff_1",
      startTime: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed ISO startTime", () => {
    const result = bookingCreateSchema.safeParse({
      serviceId: "svc_1",
      staffId: "staff_1",
      startTime: "2026-09-14T06:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});

// Supports the client rating use case added alongside the ER/use-case diagrams.
describe("feedbackSchema", () => {
  it("rejects a rating below 1", () => {
    expect(feedbackSchema.safeParse({ rating: 0 }).success).toBe(false);
  });

  it("rejects a rating above 5", () => {
    expect(feedbackSchema.safeParse({ rating: 6 }).success).toBe(false);
  });

  it("accepts a rating within 1-5", () => {
    expect(feedbackSchema.safeParse({ rating: 4, comment: "Shumë mirë" }).success).toBe(true);
  });
});
