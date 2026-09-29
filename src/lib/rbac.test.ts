import { describe, it, expect, vi } from "vitest";
import { requireRole, AuthError } from "./rbac";
import { getSession } from "./auth";

vi.mock("./auth", () => ({
  getSession: vi.fn(),
}));

// 9.5 — the same three cases verified live with curl against
// /api/admin/clients, now reproduced deterministically.
describe("requireRole — 9.5 authorization matrix", () => {
  it("throws 401 when there is no session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(requireRole("ADMIN", "STAFF")).rejects.toMatchObject({
      status: 401,
    } satisfies Partial<AuthError>);
  });

  it("throws 403 when the session role is not allowed", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", role: "CLIENT", name: "Arta" });

    await expect(requireRole("ADMIN", "STAFF")).rejects.toMatchObject({
      status: 403,
    } satisfies Partial<AuthError>);
  });

  it("resolves when the session role is allowed", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Dion" });

    await expect(requireRole("ADMIN", "STAFF")).resolves.toMatchObject({ role: "ADMIN" });
  });
});
