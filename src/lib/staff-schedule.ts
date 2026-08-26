import { prisma } from "./prisma";
import type { BookingStatus } from "@prisma/client";

const ACTIVE_BOOKING: BookingStatus[] = ["CONFIRMED", "CHECKED_IN", "IN_SERVICE"];

function dayBounds(d: Date) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function fromMinutesToDate(base: Date, minutes: number): Date {
  const d = new Date(base);
  d.setHours(0, minutes, 0, 0);
  return d;
}

export type ScheduleItem =
  | { kind: "booking"; id: string; start: Date; end: Date; clientName: string; serviceName: string; status: BookingStatus }
  | { kind: "break"; id: string | null; start: Date; end: Date; reason: string | null };

export type WorkingInterval = { startLabel: string; endLabel: string };

export type ScheduleDay = {
  items: ScheduleItem[];
  workingHours: WorkingInterval[];
};

// The real day timeline: actual bookings, a "Break Time" block for any real
// gap between two separate WorkingHours intervals on this weekday (e.g. a
// split shift), and any real TimeOff the staff member has scheduled for this
// day — never a fabricated break; one continuous shift with no time off
// booked just shows no break block.
export async function getScheduleForDay(staffId: string, date: Date): Promise<ScheduleDay> {
  const { start, end } = dayBounds(date);
  const weekday = date.getDay();

  const [bookings, hours, timeOff] = await Promise.all([
    prisma.booking.findMany({
      where: { staffId, startTime: { gte: start, lte: end }, status: { in: ACTIVE_BOOKING } },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        service: { select: { name: true } },
        client: { select: { name: true } },
      },
    }),
    prisma.workingHours.findMany({ where: { staffId, weekday }, orderBy: { startTime: "asc" }, select: { startTime: true, endTime: true } }),
    prisma.timeOff.findMany({
      where: { staffId, from: { lte: end }, until: { gte: start } },
      select: { id: true, from: true, until: true, reason: true },
    }),
  ]);

  const items: ScheduleItem[] = bookings.map((b) => ({
    kind: "booking",
    id: b.id,
    start: b.startTime,
    end: b.endTime,
    clientName: b.client.name,
    serviceName: b.service.name,
    status: b.status,
  }));

  for (let i = 0; i + 1 < hours.length; i++) {
    const gapStart = toMinutes(hours[i].endTime);
    const gapEnd = toMinutes(hours[i + 1].startTime);
    if (gapEnd > gapStart) {
      items.push({ kind: "break", id: null, start: fromMinutesToDate(date, gapStart), end: fromMinutesToDate(date, gapEnd), reason: null });
    }
  }
  for (const t of timeOff) {
    items.push({ kind: "break", id: t.id, start: t.from < start ? start : t.from, end: t.until > end ? end : t.until, reason: t.reason });
  }

  items.sort((a, b) => a.start.getTime() - b.start.getTime());

  const workingHours: WorkingInterval[] = hours.map((h) => ({ startLabel: h.startTime, endLabel: h.endTime }));

  return { items, workingHours };
}

export type DaySummary = {
  total: number;
  completed: number;
  inProgress: number;
  upcoming: number;
  totalDurationMin: number;
};

export async function getDaySummary(staffId: string, date: Date): Promise<DaySummary> {
  const { start, end } = dayBounds(date);
  const bookings = await prisma.booking.findMany({
    where: { staffId, startTime: { gte: start, lte: end }, status: { in: [...ACTIVE_BOOKING, "COMPLETED"] } },
    select: { status: true, startTime: true, endTime: true },
  });

  const totalDurationMin = bookings.reduce((sum, b) => sum + (b.endTime.getTime() - b.startTime.getTime()) / 60000, 0);

  return {
    total: bookings.length,
    completed: bookings.filter((b) => b.status === "COMPLETED").length,
    inProgress: bookings.filter((b) => b.status === "IN_SERVICE" || b.status === "CHECKED_IN").length,
    upcoming: bookings.filter((b) => b.status === "CONFIRMED").length,
    totalDurationMin,
  };
}

export type UpcomingTimeOff = { id: string; fromLabel: string; untilLabel: string; durationLabel: string; reason: string | null };

export async function getUpcomingTimeOff(staffId: string, now = new Date(), limit = 3): Promise<UpcomingTimeOff[]> {
  const rows = await prisma.timeOff.findMany({
    where: { staffId, until: { gte: now } },
    orderBy: { from: "asc" },
    take: limit,
    select: { id: true, from: true, until: true, reason: true },
  });

  const fmt = (d: Date) => d.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false });
  const fmtDate = (d: Date) => d.toLocaleDateString("sq", { day: "2-digit", month: "2-digit" });

  return rows.map((t) => {
    const sameDay = t.from.toDateString() === t.until.toDateString();
    const durationMin = Math.round((t.until.getTime() - t.from.getTime()) / 60000);
    const durationLabel = durationMin < 60 ? `${durationMin} min` : `${(durationMin / 60).toFixed(durationMin % 60 === 0 ? 0 : 1)}h`;
    return {
      id: t.id,
      fromLabel: sameDay ? `${fmtDate(t.from)}, ${fmt(t.from)}` : fmtDate(t.from),
      untilLabel: sameDay ? fmt(t.until) : fmtDate(t.until),
      durationLabel,
      reason: t.reason,
    };
  });
}

export type QualifiedService = { id: string; name: string; durationMin: number; price: number };

export async function getQualifiedServices(staffId: string): Promise<QualifiedService[]> {
  const rows = await prisma.staffService.findMany({
    where: { staffId, service: { active: true } },
    select: { service: { select: { id: true, name: true, durationMin: true, price: true } } },
    orderBy: { service: { name: "asc" } },
  });
  return rows.map((r) => ({ ...r.service, price: Number(r.service.price) }));
}
