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

const RETURNING_VISITS_THRESHOLD = 2;
const LOYAL_VISITS_THRESHOLD = 5;

export type StaffClientKpis = {
  total: number;
  newThisMonth: number;
  newLastMonth: number;
  returning: number;
  loyal: number;
};

export async function getStaffClientKpis(now = new Date()): Promise<StaffClientKpis> {
  const { start: thisStart, end: thisEnd } = monthBounds(now);
  const lastMonthAnchor = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const { start: lastStart, end: lastEnd } = monthBounds(lastMonthAnchor);

  const [total, newThisMonth, newLastMonth, completedByClient] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.user.count({ where: { role: "CLIENT", createdAt: { gte: thisStart, lt: thisEnd } } }),
    prisma.user.count({ where: { role: "CLIENT", createdAt: { gte: lastStart, lt: lastEnd } } }),
    prisma.booking.groupBy({ by: ["clientId"], where: { status: "COMPLETED" }, _count: { _all: true } }),
  ]);

  return {
    total,
    newThisMonth,
    newLastMonth,
    returning: completedByClient.filter((c) => c._count._all >= RETURNING_VISITS_THRESHOLD).length,
    loyal: completedByClient.filter((c) => c._count._all >= LOYAL_VISITS_THRESHOLD).length,
  };
}

export type ClientListStatus = "active" | "inactive";

export type StaffClientRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  lastVisitDate: string | null;
  lastVisitLabel: string | null;
  daysSinceVisit: number | null;
  daysSinceVisitLabel: string | null;
  visitsCount: number;
  favoriteService: string | null;
  status: ClientListStatus;
  isLoyal: boolean;
};

function daysSince(date: Date | null, now: Date): number | null {
  if (!date) return null;
  return Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
}

function daysAgoLabel(days: number | null): string | null {
  if (days === null) return null;
  if (days <= 0) return "Sot";
  if (days === 1) return "1 ditë më parë";
  return `${days} ditë më parë`;
}

// The staff-facing client list (adds favorite service, visit recency and a
// simpler 2-way status than the admin table's 3-way segment, to match the
// reference design). "Visits" here means COMPLETED bookings specifically —
// a future confirmed appointment hasn't happened yet, so it doesn't count
// as one.
export async function getStaffClientRows(now = new Date()): Promise<StaffClientRow[]> {
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
      bookingsAsClient: {
        orderBy: { startTime: "desc" },
        select: { status: true, startTime: true, service: { select: { id: true, name: true } } },
      },
    },
  });

  return clients.map((c) => {
    const nonCancelled = c.bookingsAsClient.filter((b) => b.status !== "CANCELLED");
    const completed = c.bookingsAsClient.filter((b) => b.status === "COMPLETED");
    const lastVisitDate = nonCancelled[0]?.startTime ?? null;

    const pool = completed.length > 0 ? completed : nonCancelled;
    const countByService = new Map<string, { name: string; count: number }>();
    for (const b of pool) {
      const cur = countByService.get(b.service.id) ?? { name: b.service.name, count: 0 };
      cur.count += 1;
      countByService.set(b.service.id, cur);
    }
    const favorite = [...countByService.values()].sort((a, b) => b.count - a.count)[0] ?? null;

    const recentlyVisited = lastVisitDate ? lastVisitDate >= activitySince : false;
    const recentlyJoined = c.createdAt >= activitySince;
    const daysSinceVisit = daysSince(lastVisitDate, now);

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      lastVisitDate: lastVisitDate ? lastVisitDate.toISOString() : null,
      lastVisitLabel: lastVisitDate
        ? lastVisitDate.toLocaleDateString("sq", { day: "2-digit", month: "2-digit", year: "numeric" })
        : null,
      daysSinceVisit,
      daysSinceVisitLabel: daysAgoLabel(daysSinceVisit),
      visitsCount: completed.length,
      favoriteService: favorite?.name ?? null,
      status: recentlyVisited || recentlyJoined ? "active" : "inactive",
      isLoyal: completed.length >= LOYAL_VISITS_THRESHOLD,
    };
  });
}

export type ClientOverview = {
  activeCount: number;
  inactiveCount: number;
  noShowCount: number;
  activePct: number;
  inactivePct: number;
  noShowPct: number;
  total: number;
};

// A client's bucket is decided by their single most recent non-cancelled
// booking: a no-show there flags the client regardless of recency (a studio
// wants to know who bailed, even if it happened a while ago); otherwise the
// same recency rule as the segment above decides active vs inactive.
export async function getClientOverview(now = new Date()): Promise<ClientOverview> {
  const activitySince = new Date(now.getTime() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    select: {
      createdAt: true,
      bookingsAsClient: { orderBy: { startTime: "desc" }, select: { status: true, startTime: true } },
    },
  });

  let activeCount = 0;
  let inactiveCount = 0;
  let noShowCount = 0;

  for (const c of clients) {
    const mostRecent = c.bookingsAsClient.find((b) => b.status !== "CANCELLED") ?? null;
    if (mostRecent?.status === "NO_SHOW") {
      noShowCount++;
      continue;
    }
    const recentlyVisited = mostRecent ? mostRecent.startTime >= activitySince : false;
    const recentlyJoined = c.createdAt >= activitySince;
    if (recentlyVisited || recentlyJoined) activeCount++;
    else inactiveCount++;
  }

  const total = clients.length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return {
    activeCount,
    inactiveCount,
    noShowCount,
    activePct: pct(activeCount),
    inactivePct: pct(inactiveCount),
    noShowPct: pct(noShowCount),
    total,
  };
}

export type TopService = { id: string; name: string; count: number };

export async function getTopServicesThisMonth(now = new Date(), limit = 5): Promise<TopService[]> {
  const { start, end } = monthBounds(now);
  const rows = await prisma.booking.groupBy({
    by: ["serviceId"],
    where: { startTime: { gte: start, lt: end }, status: { not: "CANCELLED" } },
    _count: { _all: true },
    orderBy: { _count: { serviceId: "desc" } },
    take: limit,
  });
  if (rows.length === 0) return [];

  const services = await prisma.service.findMany({
    where: { id: { in: rows.map((r) => r.serviceId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(services.map((s) => [s.id, s.name]));

  return rows.map((r) => ({ id: r.serviceId, name: nameById.get(r.serviceId) ?? "—", count: r._count._all }));
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
