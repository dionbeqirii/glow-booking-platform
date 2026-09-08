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
  userName: string | null; // null = no account (the acting user was since deleted, or a system event)
  userEmail: string | null;
  userAvatarUrl: string | null;
};

// Fetches a capped, most-recent slice (the audit log only grows — a studio
// this size won't outrun this in the timeframe an admin actually needs to
// review), then the admin UI filters/paginates it client-side, same pattern
// as the Ofertat/Terminet workspaces. `locale` drives whenLabel's date
// formatting — the caller's real UI language, not a hardcoded one.
export async function getAuditLogRows(locale: string, limit = 500): Promise<AuditLogRow[]> {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, email: true, avatarUrl: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    whenLabel: r.createdAt.toLocaleString(locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    createdAt: r.createdAt.toISOString(),
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    details: r.details,
    ipAddress: r.ipAddress,
    userId: r.userId,
    userName: r.user?.name ?? null,
    userEmail: r.user?.email ?? null,
    userAvatarUrl: r.user?.avatarUrl ?? null,
  }));
}
