import { prisma } from "./prisma";
import { DISPLAY_QUEUE_STATUSES, CLIENT_WAIT_BUFFER_MIN } from "./queue";
import type { BookingStatus } from "@prisma/client";

function dateLabel(d: Date): string {
  return d.toLocaleDateString("sq", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function timeLabel(d: Date): string {
  return d.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export type UpcomingAppointment = {
  id: string;
  serviceName: string;
  serviceDescription: string | null;
  dateLabel: string;
  timeLabel: string;
  staffName: string;
  staffTitle: string | null;
  status: BookingStatus;
};

export async function getUpcomingAppointment(clientId: string, now = new Date()): Promise<UpcomingAppointment | null> {
  const booking = await prisma.booking.findFirst({
    where: { clientId, status: { in: ["CONFIRMED", "CHECKED_IN", "IN_SERVICE"] }, startTime: { gte: now } },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      startTime: true,
      status: true,
      service: { select: { name: true, description: true } },
      staff: { select: { name: true, title: true } },
    },
  });
  if (!booking) return null;
  return {
    id: booking.id,
    serviceName: booking.service.name,
    serviceDescription: booking.service.description,
    dateLabel: dateLabel(booking.startTime),
    timeLabel: timeLabel(booking.startTime),
    staffName: booking.staff.name,
    staffTitle: booking.staff.title,
    status: booking.status,
  };
}

export type RecentAppointment = {
  id: string;
  serviceName: string;
  serviceDescription: string | null;
  dateLabel: string;
  timeLabel: string;
  status: BookingStatus;
};

export async function getRecentAppointments(clientId: string, limit = 4): Promise<RecentAppointment[]> {
  const bookings = await prisma.booking.findMany({
    where: { clientId, status: "COMPLETED" },
    orderBy: { startTime: "desc" },
    take: limit,
    select: { id: true, startTime: true, status: true, service: { select: { name: true, description: true } } },
  });
  return bookings.map((b) => ({
    id: b.id,
    serviceName: b.service.name,
    serviceDescription: b.service.description,
    dateLabel: b.startTime.toLocaleDateString("sq", { day: "numeric", month: "short", year: "numeric" }),
    timeLabel: timeLabel(b.startTime),
    status: b.status,
  }));
}

export type ClientQueueStatus = { position: number; estimatedWaitMin: number };

// Mirrors the client branch of GET /api/queue exactly — same statuses, same
// buffered estimate — so the dashboard preview and the full queue page never
// disagree.
export async function getClientQueueStatus(clientId: string): Promise<ClientQueueStatus | null> {
  const mine = await prisma.queueEntry.findFirst({
    where: { clientId, status: { in: DISPLAY_QUEUE_STATUSES } },
    select: { checkinAt: true, estimatedWaitMin: true, status: true },
  });
  if (!mine) return null;

  const position =
    mine.status === "WAITING"
      ? await prisma.queueEntry.count({ where: { status: "WAITING", checkinAt: { lt: mine.checkinAt } } })
      : 0;

  return { position: position + 1, estimatedWaitMin: mine.estimatedWaitMin + CLIENT_WAIT_BUFFER_MIN };
}

export type RecommendedService = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
};

// "Popular services you haven't tried yet" — real studio-wide popularity,
// filtered against this client's own booking history. Falls back to any
// active service once every popular one has already been tried.
export async function getRecommendedServices(clientId: string, limit = 2): Promise<RecommendedService[]> {
  const [bookedRows, popularity, activeServices] = await Promise.all([
    prisma.booking.findMany({
      where: { clientId, status: { not: "CANCELLED" } },
      select: { serviceId: true },
      distinct: ["serviceId"],
    }),
    prisma.booking.groupBy({
      by: ["serviceId"],
      where: { status: { not: "CANCELLED" } },
      _count: { _all: true },
      orderBy: { _count: { serviceId: "desc" } },
    }),
    prisma.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, durationMin: true, price: true },
    }),
  ]);

  const bookedIds = new Set(bookedRows.map((b) => b.serviceId));
  const byId = new Map(activeServices.map((s) => [s.id, s]));

  const notYetTried = popularity.map((p) => byId.get(p.serviceId)).filter((s): s is NonNullable<typeof s> => !!s && !bookedIds.has(s.id));
  const untried = activeServices.filter((s) => !bookedIds.has(s.id));
  const pool = notYetTried.length > 0 ? notYetTried : untried.length > 0 ? untried : activeServices;

  return pool.slice(0, limit).map((s) => ({ id: s.id, name: s.name, description: s.description, durationMin: s.durationMin, price: Number(s.price) }));
}
