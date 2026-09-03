import { prisma } from "./prisma";
import { ACTIVE_BOOKING_STATUSES } from "./availability";
import type { BookingStatus } from "@prisma/client";

export type AppointmentRow = {
  id: string;
  startTime: string;
  dateLabel: string;
  timeLabel: string;
  // Pre-computed server-side (not client-side `Date.now()`) so range
  // filters stay pure during render.
  daysFromNow: number;
  status: BookingStatus;
  serviceId: string;
  serviceName: string;
  serviceDescription: string | null;
  serviceImageUrl: string | null;
  serviceDuration: number;
  staffId: string;
  staffName: string;
  staffTitle: string | null;
  canManage: boolean;
  feedback: { rating: number; comment: string | null } | null;
};

export async function getClientAppointments(clientId: string, now = new Date()): Promise<AppointmentRow[]> {
  const bookings = await prisma.booking.findMany({
    where: { clientId },
    orderBy: { startTime: "desc" },
    take: 100,
    select: {
      id: true,
      startTime: true,
      status: true,
      serviceId: true,
      service: { select: { name: true, description: true, durationMin: true, imageUrl: true } },
      staff: { select: { id: true, name: true, title: true } },
      feedback: { select: { rating: true, comment: true } },
    },
  });

  return bookings.map((b) => ({
    id: b.id,
    startTime: b.startTime.toISOString(),
    dateLabel: b.startTime.toLocaleDateString("sq", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    timeLabel: b.startTime.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false }),
    daysFromNow: Math.floor((b.startTime.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    status: b.status,
    serviceId: b.serviceId,
    serviceName: b.service.name,
    serviceDescription: b.service.description,
    serviceImageUrl: b.service.imageUrl,
    serviceDuration: b.service.durationMin,
    staffId: b.staff.id,
    staffName: b.staff.name,
    staffTitle: b.staff.title,
    canManage: b.startTime.getTime() > now.getTime() && (ACTIVE_BOOKING_STATUSES as string[]).includes(b.status),
    feedback: b.feedback,
  }));
}
