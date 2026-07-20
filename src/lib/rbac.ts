import type { Role } from "@prisma/client";
import { getSession, type SessionPayload } from "./auth";

/**
 * Role-based access control helpers (FR-16).
 *
 * `requireRole` is used inside route handlers and server components to guard
 * access. It throws an `AuthError` that the caller converts into a 401/403
 * response, so every protected endpoint checks the role in one place.
 */
export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthError(401, "Not authenticated");
  return session;
}

export async function requireRole(...allowed: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!allowed.includes(session.role)) {
    throw new AuthError(403, "Insufficient permissions");
  }
  return session;
}

// Landing route for each role after login.
export function homeForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "STAFF":
      return "/staff";
    case "CLIENT":
      return "/client";
    default:
      return "/";
  }
}
