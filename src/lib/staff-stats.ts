import { prisma } from "./prisma";
import { computeStudioStats } from "./stats";

const DAY_MS = 24 * 60 * 60 * 1000;

// Relative % change vs the prior period. `null` means "no prior data to
// compare against" — shown as a neutral state instead of a fabricated
// infinite/undefined percentage.
function pctDelta(current: number, prior: number): number | null {
  if (prior === 0) return current > 0 ? null : 0;
  return Math.round(((current - prior) / prior) * 100);
}

export type StaffStatsKpis = {
  days: number;
  fromLabel: string;
  toLabel: string;
  completedCount: number;
  completedDeltaPct: number | null;
  revenue: number;
  revenueDeltaPct: number | null;
  bookedHours: number;
  availableHours: number;
  bookedHoursDeltaPct: number | null;
  utilizationPct: number;
  utilizationDeltaPct: number | null;
  studioAvgUtilizationPct: number;
};

// Every figure is scoped to this one staff member and compared against the
// immediately preceding period of equal length (e.g. 30 days vs the 30
// before that) — never a fabricated benchmark.
export async function getStaffStatsKpis(staffId: string, days: number, now = new Date()): Promise<StaffStatsKpis> {
  const from = new Date(now.getTime() - days * DAY_MS);
  const priorNow = from;
  const priorFrom = new Date(priorNow.getTime() - days * DAY_MS);

  const [currentCompleted, priorCompleted, currentStudio, priorStudio] = await Promise.all([
    prisma.booking.findMany({
      where: { staffId, status: "COMPLETED", startTime: { gte: from, lte: now } },
      select: { service: { select: { price: true } } },
    }),
    prisma.booking.findMany({
      where: { staffId, status: "COMPLETED", startTime: { gte: priorFrom, lte: priorNow } },
      select: { service: { select: { price: true } } },
    }),
    computeStudioStats(days, now),
    computeStudioStats(days, priorNow),
  ]);

  const currentRevenue = currentCompleted.reduce((s, b) => s + Number(b.service.price), 0);
  const priorRevenue = priorCompleted.reduce((s, b) => s + Number(b.service.price), 0);

  const currentUtil = currentStudio.utilization.find((u) => u.staffId === staffId);
  const priorUtil = priorStudio.utilization.find((u) => u.staffId === staffId);
  const bookedMin = currentUtil?.bookedMin ?? 0;
  const availableMin = currentUtil?.availableMin ?? 0;
  const priorBookedMin = priorUtil?.bookedMin ?? 0;
  const utilization = currentUtil?.utilization ?? 0;
  const priorUtilization = priorUtil?.utilization ?? 0;

  const others = currentStudio.utilization.filter((u) => u.staffId !== staffId && u.availableMin > 0);
  const studioAvgUtilizationPct =
    others.length > 0 ? Math.round((others.reduce((s, u) => s + u.utilization, 0) / others.length) * 100) : Math.round(utilization * 100);

  return {
    days,
    fromLabel: from.toLocaleDateString("sq", { day: "numeric", month: "long", year: "numeric" }),
    toLabel: now.toLocaleDateString("sq", { day: "numeric", month: "long", year: "numeric" }),
    completedCount: currentCompleted.length,
    completedDeltaPct: pctDelta(currentCompleted.length, priorCompleted.length),
    revenue: currentRevenue,
    revenueDeltaPct: pctDelta(currentRevenue, priorRevenue),
    bookedHours: bookedMin / 60,
    availableHours: availableMin / 60,
    bookedHoursDeltaPct: pctDelta(bookedMin, priorBookedMin),
    utilizationPct: Math.round(utilization * 100),
    utilizationDeltaPct: pctDelta(utilization, priorUtilization),
    studioAvgUtilizationPct,
  };
}

export type WeekdayPoint = { label: string; current: number; prior: number };

const WEEKDAY_LABELS_MON_FIRST = ["E Hënë", "E Martë", "E Mërkurë", "E Enjte", "E Premte", "E Shtunë", "E Diel"];

// Revenue from this staff member's completed bookings, bucketed by weekday
// across the whole selected window (not just the most recent 7 days) —
// current period vs the equal-length period before it.
export async function getWeeklyPerformance(staffId: string, days: number, now = new Date()): Promise<WeekdayPoint[]> {
  const from = new Date(now.getTime() - days * DAY_MS);
  const priorNow = from;
  const priorFrom = new Date(priorNow.getTime() - days * DAY_MS);

  const [current, prior] = await Promise.all([
    prisma.booking.findMany({
      where: { staffId, status: "COMPLETED", startTime: { gte: from, lte: now } },
      select: { startTime: true, service: { select: { price: true } } },
    }),
    prisma.booking.findMany({
      where: { staffId, status: "COMPLETED", startTime: { gte: priorFrom, lte: priorNow } },
      select: { startTime: true, service: { select: { price: true } } },
    }),
  ]);

  const currentByWd = [0, 0, 0, 0, 0, 0, 0];
  const priorByWd = [0, 0, 0, 0, 0, 0, 0];
  for (const b of current) currentByWd[(b.startTime.getDay() + 6) % 7] += Number(b.service.price);
  for (const b of prior) priorByWd[(b.startTime.getDay() + 6) % 7] += Number(b.service.price);

  return WEEKDAY_LABELS_MON_FIRST.map((label, i) => ({ label, current: currentByWd[i], prior: priorByWd[i] }));
}

export type RequestedService = { name: string; count: number };

export async function getMostRequestedServices(staffId: string, days: number, now = new Date(), limit = 5): Promise<RequestedService[]> {
  const from = new Date(now.getTime() - days * DAY_MS);
  const completed = await prisma.booking.findMany({
    where: { staffId, status: "COMPLETED", startTime: { gte: from, lte: now } },
    select: { service: { select: { name: true } } },
  });
  const counts = new Map<string, number>();
  for (const b of completed) counts.set(b.service.name, (counts.get(b.service.name) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export type MyServiceRow = { id: string; name: string; durationMin: number; price: number; active: boolean };

export async function getMyServices(staffId: string): Promise<MyServiceRow[]> {
  const rows = await prisma.staffService.findMany({
    where: { staffId },
    orderBy: { service: { name: "asc" } },
    select: { service: { select: { id: true, name: true, durationMin: true, price: true, active: true } } },
  });
  return rows.map((r) => ({ ...r.service, price: Number(r.service.price) }));
}
