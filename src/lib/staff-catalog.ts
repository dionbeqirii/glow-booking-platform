import { prisma } from "./prisma";
import type { BookingStatus } from "@prisma/client";

function dayBounds(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
function monthBounds(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function fromMinutesLabel(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const ACTIVE_BOOKING: BookingStatus[] = ["CONFIRMED", "CHECKED_IN", "IN_SERVICE"];

export type StaffKpis = {
  todayAppointments: number;
  upcomingToday: number;
  studioRating: number;
  reviewCount: number;
  completedThisMonth: number;
};

export async function getStaffKpis(now = new Date()): Promise<StaffKpis> {
  const { start, end } = dayBounds(now);
  const { start: monthStart, end: monthEnd } = monthBounds(now);

  const [todayBookings, ratingAgg, completedBookingsMonth, completedQueueMonth] = await Promise.all([
    prisma.booking.findMany({
      where: { startTime: { gte: start, lte: end }, status: { in: ACTIVE_BOOKING } },
      select: { startTime: true },
    }),
    prisma.feedback.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
    prisma.booking.count({ where: { status: "COMPLETED", startTime: { gte: monthStart, lt: monthEnd } } }),
    prisma.queueEntry.count({ where: { status: "COMPLETED", completedAt: { gte: monthStart, lt: monthEnd } } }),
  ]);

  return {
    todayAppointments: todayBookings.length,
    upcomingToday: todayBookings.filter((b) => b.startTime > now).length,
    studioRating: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : 0,
    reviewCount: ratingAgg._count._all,
    completedThisMonth: completedBookingsMonth + completedQueueMonth,
  };
}

export type StaffStatus = "active" | "busy" | "off_duty";

export type StaffOverviewRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  status: StaffStatus;
  scheduleLabel: string;
  appointmentsToday: number;
  skillCount: number;
};

// Live status is entirely derived from real data — no separate "break"
// concept exists in the schema, so a shift with a current booking/queue
// visit reads as "busy", inside working hours with nothing active reads as
// "active", and outside the configured shift (or on approved time off)
// reads as "off duty".
export async function getStaffOverviewRows(now = new Date()): Promise<StaffOverviewRow[]> {
  const weekday = now.getDay();
  const { start, end } = dayBounds(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const staff = await prisma.user.findMany({
    where: { role: "STAFF" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      title: true,
      workingHours: { where: { weekday }, select: { startTime: true, endTime: true } },
      timeOff: { where: { from: { lte: now }, until: { gte: now } }, select: { id: true } },
      _count: { select: { staffServices: true } },
      bookingsAsStaff: {
        where: { startTime: { lt: end }, endTime: { gt: start }, status: { in: ACTIVE_BOOKING } },
        select: { startTime: true, endTime: true },
      },
      queueAsStaff: { where: { status: "IN_SERVICE" }, select: { id: true } },
    },
  });

  return staff.map((s) => {
    const onTimeOff = s.timeOff.length > 0;
    let scheduleLabel = "Jashtë orarit sot";
    let withinShift = false;
    if (!onTimeOff && s.workingHours.length > 0) {
      const shiftStart = Math.min(...s.workingHours.map((h) => toMinutes(h.startTime)));
      const shiftEnd = Math.max(...s.workingHours.map((h) => toMinutes(h.endTime)));
      scheduleLabel = `${fromMinutesLabel(shiftStart)} – ${fromMinutesLabel(shiftEnd)}`;
      withinShift = nowMin >= shiftStart && nowMin < shiftEnd;
    } else if (onTimeOff) {
      scheduleLabel = "Në mungesë sot";
    }

    const busyNow = s.queueAsStaff.length > 0 || s.bookingsAsStaff.some((b) => now >= b.startTime && now < b.endTime);
    const status: StaffStatus = busyNow ? "busy" : withinShift ? "active" : "off_duty";

    return {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      title: s.title,
      status,
      scheduleLabel,
      appointmentsToday: s.bookingsAsStaff.length,
      skillCount: s._count.staffServices,
    };
  });
}

export async function getExistingStaffTitles(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { role: "STAFF", title: { not: null } },
    select: { title: true },
    distinct: ["title"],
  });
  return rows.map((r) => r.title!).sort((a, b) => a.localeCompare(b));
}

export type TodayScheduleItem = {
  id: string;
  timeLabel: string;
  serviceName: string;
  clientName: string;
  staffName: string;
  status: BookingStatus;
};

export async function getTodaySchedule(now = new Date(), limit = 6): Promise<TodayScheduleItem[]> {
  const { start, end } = dayBounds(now);
  const bookings = await prisma.booking.findMany({
    where: { startTime: { gte: start, lte: end }, status: { in: ACTIVE_BOOKING } },
    orderBy: { startTime: "asc" },
    take: limit,
    select: {
      id: true,
      startTime: true,
      status: true,
      service: { select: { name: true } },
      client: { select: { name: true } },
      staff: { select: { name: true } },
    },
  });
  return bookings.map((b) => ({
    id: b.id,
    timeLabel: b.startTime.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false }),
    serviceName: b.service.name,
    clientName: b.client.name,
    staffName: b.staff.name,
    status: b.status,
  }));
}

export type OngoingItem = {
  id: string;
  serviceName: string;
  clientName: string;
  staffName: string;
  startedLabel: string;
};

// Merges both real sources of "happening right now" — a booked appointment
// actually in progress, and a walk-in queue visit in progress. Both are
// found purely by status, so no timestamp parameter is needed.
export async function getOngoingAppointments(): Promise<OngoingItem[]> {
  const [bookings, queueEntries] = await Promise.all([
    prisma.booking.findMany({
      where: { status: "IN_SERVICE" },
      select: {
        id: true,
        startTime: true,
        service: { select: { name: true } },
        client: { select: { name: true } },
        staff: { select: { name: true } },
      },
    }),
    prisma.queueEntry.findMany({
      where: { status: "IN_SERVICE" },
      select: {
        id: true,
        startedAt: true,
        checkinAt: true,
        service: { select: { name: true } },
        client: { select: { name: true } },
        clientName: true,
        staff: { select: { name: true } },
      },
    }),
  ]);

  const fmt = (d: Date) => d.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false });

  const fromBookings: OngoingItem[] = bookings.map((b) => ({
    id: `booking-${b.id}`,
    serviceName: b.service.name,
    clientName: b.client.name,
    staffName: b.staff.name,
    startedLabel: fmt(b.startTime),
  }));
  const fromQueue: OngoingItem[] = queueEntries.map((q) => ({
    id: `queue-${q.id}`,
    serviceName: q.service.name,
    clientName: q.client?.name ?? q.clientName ?? "Klient pa emër",
    staffName: q.staff?.name ?? "—",
    startedLabel: fmt(q.startedAt ?? q.checkinAt),
  }));

  return [...fromBookings, ...fromQueue].sort((a, b) => a.startedLabel.localeCompare(b.startedLabel));
}

export type MonthPerformance = {
  appointments: number;
  satisfactionPct: number;
  revenue: number;
  newClients: number;
};

export async function getMonthPerformance(now = new Date()): Promise<MonthPerformance> {
  const { start, end } = monthBounds(now);

  const [completedBookings, completedQueue, ratingAgg, newClients] = await Promise.all([
    prisma.booking.findMany({
      where: { status: "COMPLETED", startTime: { gte: start, lt: end } },
      select: { service: { select: { price: true } } },
    }),
    prisma.queueEntry.findMany({
      where: { status: "COMPLETED", completedAt: { gte: start, lt: end } },
      select: { visitServices: { select: { service: { select: { price: true } } } } },
    }),
    prisma.feedback.aggregate({ where: { createdAt: { gte: start, lt: end } }, _avg: { rating: true } }),
    prisma.user.count({ where: { role: "CLIENT", createdAt: { gte: start, lt: end } } }),
  ]);

  const bookingRevenue = completedBookings.reduce((sum, b) => sum + Number(b.service.price), 0);
  const queueRevenue = completedQueue.reduce(
    (sum, q) => sum + q.visitServices.reduce((s, v) => s + Number(v.service.price), 0),
    0
  );

  return {
    appointments: completedBookings.length + completedQueue.length,
    satisfactionPct: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 20) : 0,
    revenue: bookingRevenue + queueRevenue,
    newClients,
  };
}
