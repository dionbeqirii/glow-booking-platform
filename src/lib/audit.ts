import { prisma } from "./prisma";

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
      },
    });
  } catch (err) {
    console.error("audit log failed", err);
  }
}
