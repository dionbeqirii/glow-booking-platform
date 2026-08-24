import { prisma } from "./prisma";
import type { BookingStatus } from "@prisma/client";

export type ScheduleBooking = {
  id: string;
  clientName: string;
  serviceName: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  staffId: string;
};

export type DaySchedule = {
  staff: { id: string; name: string }[];
  hours: number[]; // e.g. [9, 10, ..., 18] — the grid's row labels
  bookings: ScheduleBooking[];
};

// Real data for a "daily schedule" grid (staff columns x hourly rows) — shared
// by the admin Kalendari page and the dashboard's compact widget version, so
// both stay backed by the same query instead of drifting.
export async function getDaySchedule(date: Date): Promise<DaySchedule> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const weekday = dayStart.getDay();

  const [staff, bookings, hours] = await Promise.all([
    prisma.user.findMany({ where: { role: "STAFF" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.booking.findMany({
      where: { startTime: { gte: dayStart, lt: dayEnd } },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        staffId: true,
        client: { select: { name: true } },
        service: { select: { name: true } },
      },
    }),
    prisma.workingHours.findMany({ where: { weekday }, select: { startTime: true, endTime: true } }),
  ]);

  // The grid's hour range follows that weekday's actual working hours (widest
  // start-to-end span across all staff); falls back to a sane business-hours
  // default when nobody has hours set for the day (e.g. a Sunday).
  let minHour = 9;
  let maxHour = 18;
  if (hours.length > 0) {
    minHour = Math.min(...hours.map((h) => parseInt(h.startTime.split(":")[0], 10)));
    maxHour = Math.max(...hours.map((h) => parseInt(h.endTime.split(":")[0], 10)));
  }
  const hourRange: number[] = [];
  for (let h = minHour; h <= maxHour; h++) hourRange.push(h);

  return {
    staff,
    hours: hourRange,
    bookings: bookings.map((b) => ({
      id: b.id,
      clientName: b.client.name,
      serviceName: b.service.name,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      staffId: b.staffId,
    })),
  };
}
