import { prisma } from "./prisma";

const ACTIVITY_WINDOW_DAYS = 30;

function monthBounds(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export type ClientKpis = {
  total: number;
  newThisMonth: number;
  activeLast30d: number;
  repeatClients: number;
};

export async function getClientKpis(now = new Date()): Promise<ClientKpis> {
  const { start: monthStart, end: monthEnd } = monthBounds(now);
  const activitySince = new Date(now.getTime() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [total, newThisMonth, activeClientIds, completedByClient] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.user.count({ where: { role: "CLIENT", createdAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.booking.findMany({
      where: { startTime: { gte: activitySince }, status: { not: "CANCELLED" } },
      select: { clientId: true },
      distinct: ["clientId"],
    }),
    prisma.booking.groupBy({
      by: ["clientId"],
      where: { status: "COMPLETED" },
      _count: { _all: true },
    }),
  ]);

  const repeatClients = completedByClient.filter((c) => c._count._all >= 2).length;

  return {
    total,
    newThisMonth,
    activeLast30d: activeClientIds.length,
    repeatClients,
  };
}

export type ClientSegment = "active" | "new" | "inactive";

export type ClientRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  joinedLabel: string;
  bookingsCount: number;
  queueCount: number;
  lastVisitLabel: string | null;
  segment: ClientSegment;
};

export type ClientListFilters = {
  q?: string;
  segment?: ClientSegment;
};

export async function getClientRows(now = new Date()): Promise<ClientRow[]> {
  const activitySince = new Date(now.getTime() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      _count: { select: { queueAsClient: true } },
      bookingsAsClient: { orderBy: { startTime: "desc" }, select: { status: true, startTime: true } },
    },
  });

  return clients.map((c) => {
    // "Rezervime" counts only real bookings (not cancelled) — matches
    // getTopClients()'s definition, so the same client reads the same
    // booking count everywhere on this page.
    const activeBookings = c.bookingsAsClient.filter((b) => b.status !== "CANCELLED");
    const lastVisit = activeBookings[0]?.startTime ?? null;
    const recentlyActive = lastVisit ? lastVisit >= activitySince : false;
    const recentlyJoined = c.createdAt >= activitySince;
    const segment: ClientSegment = recentlyActive ? "active" : recentlyJoined ? "new" : "inactive";

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      joinedLabel: c.createdAt.toLocaleDateString("sq", { day: "2-digit", month: "2-digit", year: "numeric" }),
      bookingsCount: activeBookings.length,
      queueCount: c._count.queueAsClient,
      lastVisitLabel: lastVisit ? lastVisit.toLocaleDateString("sq", { day: "2-digit", month: "2-digit", year: "numeric" }) : null,
      segment,
    };
  });
}

export type TopClient = { id: string; name: string; bookingsCount: number };

export async function getTopClients(limit = 5): Promise<TopClient[]> {
  const rows = await prisma.booking.groupBy({
    by: ["clientId"],
    where: { status: { not: "CANCELLED" } },
    _count: { _all: true },
    orderBy: { _count: { clientId: "desc" } },
    take: limit,
  });
  if (rows.length === 0) return [];

  const clients = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.clientId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(clients.map((c) => [c.id, c.name]));

  return rows.map((r) => ({ id: r.clientId, name: nameById.get(r.clientId) ?? "—", bookingsCount: r._count._all }));
}
