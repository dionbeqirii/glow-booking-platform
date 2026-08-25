import { prisma } from "./prisma";
import type { WeekBooking } from "./week-schedule";

export type MonthSchedule = {
  staff: { id: string; name: string }[];
  services: { id: string; name: string }[];
  bookings: WeekBooking[];
};

// Same shape as getWeekSchedule, scoped to a calendar month instead of a
// week — reused by the Kalendari page's Month view (day cells bucket
// `bookings` by `startTime.toDateString()`, same pattern WeekCalendar uses).
export async function getMonthSchedule(monthOf: Date): Promise<MonthSchedule> {
  const year = monthOf.getFullYear();
  const month = monthOf.getMonth();
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 1);

  const [staff, services, bookings] = await Promise.all([
    prisma.user.findMany({ where: { role: "STAFF" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.service.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.booking.findMany({
      where: { startTime: { gte: from, lt: to } },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        client: { select: { name: true } },
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
    }),
  ]);

  return {
    staff,
    services,
    bookings: bookings.map((b) => ({
      id: b.id,
      clientName: b.client.name,
      serviceName: b.service.name,
      staffName: b.staff.name,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
    })),
  };
}
