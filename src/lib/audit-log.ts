import { prisma } from "./prisma";

export type AuditLogRow = {
  id: string;
  whenLabel: string;
  createdAt: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  userAvatarUrl: string | null;
};

// Fetches a capped, most-recent slice (the audit log only grows — a studio
// this size won't outrun this in the timeframe an admin actually needs to
// review), then the admin UI filters/paginates it client-side, same pattern
// as the Ofertat/Terminet workspaces.
export async function getAuditLogRows(limit = 500): Promise<AuditLogRow[]> {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, email: true, avatarUrl: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    whenLabel: r.createdAt.toLocaleString("sq", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    createdAt: r.createdAt.toISOString(),
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    details: r.details,
    ipAddress: r.ipAddress,
    userId: r.userId,
    userName: r.user?.name ?? "Sistemi",
    userEmail: r.user?.email ?? null,
    userAvatarUrl: r.user?.avatarUrl ?? null,
  }));
}
