import { prisma } from "./prisma";
import { DISPLAY_QUEUE_STATUSES, getNextAvailableSlots } from "./queue";
import type { QueueStatus } from "@prisma/client";

function dayBounds(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export type QueueKpis = {
  liveInQueue: number;
  avgWaitMin: number;
  servedToday: number;
  walkInsToday: number;
};

// "Served Today" spans both systems the studio actually runs on (booked
// appointments finishing today + walk-ins completed today) — a broader,
// honest "how much did we get through today" figure. "Walk-ins Today" stays
// scoped to the queue alone (today's check-ins, any status) since that is
// specifically the walk-in-traffic number front desk cares about.
export async function getQueueKpis(now = new Date()): Promise<QueueKpis> {
  const { start, end } = dayBounds(now);

  const [liveInQueue, waitingEntries, completedQueueToday, completedBookingsToday, walkInsToday, calledToday] = await Promise.all([
    prisma.queueEntry.count({ where: { status: "WAITING" } }),
    prisma.queueEntry.findMany({ where: { status: "WAITING" }, select: { estimatedWaitMin: true } }),
    prisma.queueEntry.count({ where: { status: "COMPLETED", completedAt: { gte: start, lte: end } } }),
    prisma.booking.count({ where: { status: "COMPLETED", startTime: { gte: start, lte: end } } }),
    prisma.queueEntry.count({ where: { checkinAt: { gte: start, lte: end } } }),
    prisma.queueEntry.findMany({
      where: { checkinAt: { gte: start, lte: end }, calledAt: { not: null } },
      select: { checkinAt: true, calledAt: true },
    }),
  ]);

  // Real average wait: actual elapsed check-in → called time for everyone
  // called today. Falls back to the live simulated estimate for whoever is
  // currently waiting so the KPI isn't stuck at 0 before the first call.
  let avgWaitMin = 0;
  if (calledToday.length > 0) {
    const totalMin = calledToday.reduce((sum, e) => sum + (e.calledAt!.getTime() - e.checkinAt.getTime()) / 60000, 0);
    avgWaitMin = Math.round(totalMin / calledToday.length);
  } else if (waitingEntries.length > 0) {
    avgWaitMin = Math.round(waitingEntries.reduce((s, e) => s + e.estimatedWaitMin, 0) / waitingEntries.length);
  }

  return {
    liveInQueue,
    avgWaitMin,
    servedToday: completedQueueToday + completedBookingsToday,
    walkInsToday,
  };
}

export type QueueSummary = QueueKpis & { noShowToday: number };

export async function getQueueSummary(now = new Date()): Promise<QueueSummary> {
  const [kpis, noShowToday] = await Promise.all([
    getQueueKpis(now),
    (async () => {
      const { start, end } = dayBounds(now);
      return prisma.queueEntry.count({ where: { status: "NO_SHOW", checkinAt: { gte: start, lte: end } } });
    })(),
  ]);
  return { ...kpis, noShowToday };
}

export type QueueTableRow = {
  id: string;
  queueNumber: number;
  clientName: string;
  clientPhone: string | null;
  notes: string | null;
  serviceId: string;
  serviceName: string;
  durationMin: number;
  addedAtLabel: string;
  estWaitMin: number;
  status: QueueStatus;
  staffId: string | null;
  staffName: string | null;
  visitServiceIds: string[];
};

// Every still-active entry (waiting, called, or mid-visit) in one flat,
// check-in-ordered list — the unified "Current Queue" table.
export async function getCurrentQueueRows(): Promise<QueueTableRow[]> {
  const entries = await prisma.queueEntry.findMany({
    where: { status: { in: DISPLAY_QUEUE_STATUSES } },
    orderBy: { checkinAt: "asc" },
    include: {
      service: { select: { name: true, durationMin: true } },
      staff: { select: { id: true, name: true } },
      client: { select: { name: true, phone: true } },
      visitServices: { select: { serviceId: true } },
    },
  });

  return entries.map((e) => ({
    id: e.id,
    queueNumber: e.queueNumber,
    clientName: e.client?.name ?? e.clientName ?? "Klient pa emër",
    clientPhone: e.client?.phone ?? e.phone,
    notes: e.notes,
    serviceId: e.serviceId,
    serviceName: e.service.name,
    durationMin: e.service.durationMin,
    addedAtLabel: e.checkinAt.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false }),
    estWaitMin: e.estimatedWaitMin,
    status: e.status,
    staffId: e.staff?.id ?? null,
    staffName: e.staff?.name ?? null,
    visitServiceIds: e.visitServices.map((v) => v.serviceId),
  }));
}

export type QueueSlot = { timeLabel: string };

export async function getQueueSlots(now = new Date(), limit = 5): Promise<QueueSlot[]> {
  const slots = await getNextAvailableSlots(now, limit);
  return slots.map((s) => ({ timeLabel: s.time.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false }) }));
}

export type RecentlyServed = { id: string; clientName: string; serviceName: string; servedAtLabel: string };

export async function getRecentlyServed(limit = 5): Promise<RecentlyServed[]> {
  const entries = await prisma.queueEntry.findMany({
    where: { status: "COMPLETED", completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    take: limit,
    select: {
      id: true,
      completedAt: true,
      clientName: true,
      client: { select: { name: true } },
      service: { select: { name: true } },
    },
  });
  return entries.map((e) => ({
    id: e.id,
    clientName: e.client?.name ?? e.clientName ?? "Klient pa emër",
    serviceName: e.service.name,
    servedAtLabel: e.completedAt!.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false }),
  }));
}

export type QueueInsight = { icon: "walkin" | "alert" | "slot"; text: string; timeLabel: string };

const LONG_WAIT_THRESHOLD_MIN = 45;

// Live, computed facts (never stored rows) standing in for the reference's
// notification feed — each one reads straight off current queue state, so
// it is always real and never stale.
export async function getQueueInsights(now = new Date()): Promise<QueueInsight[]> {
  const insights: QueueInsight[] = [];

  const [lastCheckin, longWaiting, [nextSlot]] = await Promise.all([
    prisma.queueEntry.findFirst({
      orderBy: { checkinAt: "desc" },
      select: { checkinAt: true, clientName: true, client: { select: { name: true } } },
    }),
    prisma.queueEntry.count({ where: { status: "WAITING", estimatedWaitMin: { gt: LONG_WAIT_THRESHOLD_MIN } } }),
    getNextAvailableSlots(now, 1),
  ]);

  if (lastCheckin) {
    const name = lastCheckin.client?.name ?? lastCheckin.clientName ?? "Një klient";
    insights.push({
      icon: "walkin",
      text: `${name} u shtua në radhë`,
      timeLabel: lastCheckin.checkinAt.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false }),
    });
  }

  if (longWaiting > 0) {
    insights.push({
      icon: "alert",
      text: `${longWaiting} ${longWaiting === 1 ? "klient duke pritur" : "klientë duke pritur"} mbi ${LONG_WAIT_THRESHOLD_MIN} min`,
      timeLabel: "tani",
    });
  }

  if (nextSlot) {
    insights.push({
      icon: "slot",
      text: `Vend i lirë pas ${nextSlot.time.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false })}`,
      timeLabel: "",
    });
  }

  return insights;
}
