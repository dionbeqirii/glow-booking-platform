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
function fmtTime(d: Date): string {
  return d.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function fromMinutesLabel(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export type StaffDashboardKpis = {
  todayAppointments: number;
  nextAppointment: { timeLabel: string; serviceName: string } | null;
  completedToday: number;
  queueWaiting: number;
};

export async function getStaffDashboardKpis(staffId: string, now = new Date()): Promise<StaffDashboardKpis> {
  const { start, end } = dayBounds(now);

  const [todayBookings, completedBookingsToday, completedQueueToday, queueWaiting] = await Promise.all([
    prisma.booking.findMany({
      where: { staffId, startTime: { gte: start, lte: end }, status: { in: ACTIVE_BOOKING } },
      orderBy: { startTime: "asc" },
      select: { startTime: true, service: { select: { name: true } } },
    }),
    prisma.booking.count({ where: { staffId, status: "COMPLETED", startTime: { gte: start, lte: end } } }),
    prisma.queueEntry.count({ where: { staffId, status: "COMPLETED", completedAt: { gte: start, lte: end } } }),
    prisma.queueEntry.count({ where: { status: "WAITING" } }),
  ]);

  const next = todayBookings.find((b) => b.startTime > now) ?? null;

  return {
    todayAppointments: todayBookings.length,
    nextAppointment: next ? { timeLabel: fmtTime(next.startTime), serviceName: next.service.name } : null,
    completedToday: completedBookingsToday + completedQueueToday,
    queueWaiting,
  };
}

export type ScheduleItem =
  | { kind: "booking"; id: string; timeLabel: string; clientName: string; serviceName: string; status: BookingStatus }
  | { kind: "break"; timeLabel: string };

// The real timeline for one day: actual bookings, plus a "Break Time" marker
// for any real gap between two separate WorkingHours intervals on that
// weekday (e.g. a 09:00-13:00 + 14:00-18:00 split shift) — never a fabricated
// break; a staff member with one continuous shift just shows no break row.
export async function getMySchedule(staffId: string, date: Date): Promise<ScheduleItem[]> {
  const { start, end } = dayBounds(date);
  const weekday = date.getDay();

  const [bookings, hours] = await Promise.all([
    prisma.booking.findMany({
      where: { staffId, startTime: { gte: start, lte: end }, status: { in: ACTIVE_BOOKING } },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        status: true,
        service: { select: { name: true } },
        client: { select: { name: true } },
      },
    }),
    prisma.workingHours.findMany({ where: { staffId, weekday }, orderBy: { startTime: "asc" }, select: { startTime: true, endTime: true } }),
  ]);

  const items: ScheduleItem[] = bookings.map((b) => ({
    kind: "booking",
    id: b.id,
    timeLabel: fmtTime(b.startTime),
    clientName: b.client.name,
    serviceName: b.service.name,
    status: b.status,
  }));

  for (let i = 0; i + 1 < hours.length; i++) {
    const gapStart = toMinutes(hours[i].endTime);
    const gapEnd = toMinutes(hours[i + 1].startTime);
    if (gapEnd > gapStart) items.push({ kind: "break", timeLabel: fromMinutesLabel(gapStart) });
  }

  return items.sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
}

export type UpcomingAppointment = {
  id: string;
  timeLabel: string;
  dateLabel: string;
  clientName: string;
  serviceName: string;
  durationMin: number;
  status: BookingStatus;
};

export async function getUpcomingAppointments(staffId: string, now = new Date(), limit = 10): Promise<UpcomingAppointment[]> {
  const bookings = await prisma.booking.findMany({
    where: { staffId, startTime: { gte: now }, status: { in: ACTIVE_BOOKING } },
    orderBy: { startTime: "asc" },
    take: limit,
    select: {
      id: true,
      startTime: true,
      status: true,
      service: { select: { name: true, durationMin: true } },
      client: { select: { name: true } },
    },
  });

  return bookings.map((b) => ({
    id: b.id,
    timeLabel: fmtTime(b.startTime),
    dateLabel: b.startTime.toLocaleDateString("sq", { day: "2-digit", month: "2-digit" }),
    clientName: b.client.name,
    serviceName: b.service.name,
    durationMin: b.service.durationMin,
    status: b.status,
  }));
}

export async function getTodayWorkingMinutes(staffId: string, now = new Date()): Promise<number> {
  const weekday = now.getDay();
  const hours = await prisma.workingHours.findMany({ where: { staffId, weekday }, select: { startTime: true, endTime: true } });
  return hours.reduce((sum, h) => sum + (toMinutes(h.endTime) - toMinutes(h.startTime)), 0);
}
