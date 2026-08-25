import { prisma } from "./prisma";
import type { BookingStatus } from "@prisma/client";

export type WeekBooking = {
  id: string;
  clientName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
};

export type WeekSchedule = {
  staff: { id: string; name: string }[];
  services: { id: string; name: string }[];
  bookings: WeekBooking[];
};

// Monday-start week containing `date`.
export function weekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export async function getWeekSchedule(weekStartDate: Date): Promise<WeekSchedule> {
  const from = new Date(weekStartDate);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);

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
