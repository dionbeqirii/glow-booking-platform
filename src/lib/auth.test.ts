import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from "./auth";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-only-used-in-vitest-runs";
});

describe("password hashing", () => {
  it("verifies the correct password against its own hash", async () => {
    const hash = await hashPassword("Password123");
    expect(await verifyPassword("Password123", hash)).toBe(true);
  });

  it("rejects a wrong password against the hash", async () => {
    const hash = await hashPassword("Password123");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});

describe("session token", () => {
  it("round-trips a payload through sign and verify", async () => {
    const token = await createSessionToken({ userId: "u1", role: "ADMIN", name: "Dion" });
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ userId: "u1", role: "ADMIN", name: "Dion" });
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken({ userId: "u1", role: "CLIENT", name: "Arta" });
    const tampered = token.slice(0, -2) + "xx";
    expect(await verifySessionToken(tampered)).toBeNull();
  });
});
