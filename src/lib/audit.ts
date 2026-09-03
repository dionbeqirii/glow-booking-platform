import { headers } from "next/headers";
import { prisma } from "./prisma";

// Best-effort client IP from the request headers — every call site is a
// route handler, so this always runs inside the request's async context
// without needing the Request object threaded through. x-forwarded-for can
// carry a proxy chain ("client, proxy1, proxy2"); the first entry is the
// original client. Neither header is set in local dev (no proxy in front),
// so this is null there — that's a real absence, not a bug.
async function clientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return h.get("x-real-ip");
  } catch {
    return null;
  }
}

/**
 * Records a critical action in the audit log (FR-18).
 * Never throws — auditing must not break the primary operation.
 */
export async function audit(params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        details: params.details ?? null,
        ipAddress: await clientIp(),
      },
    });
  } catch (err) {
    console.error("audit log failed", err);
  }
}
