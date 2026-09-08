import { prisma } from "./prisma";
import type { BookingStatus, QueueStatus } from "@prisma/client";

function fmtDate(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtTime(d: Date, locale: string): string {
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
}
function fmtWeekday(d: Date, locale: string): string {
  const label = d.toLocaleDateString(locale, { weekday: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export type AdminBookingRow = {
  id: string;
  startTime: string; // ISO — the date-range filter compares against this
  dateLabel: string;
  timeLabel: string;
  weekdayLabel: string;
  status: BookingStatus;
  serviceId: string;
  serviceName: string;
  serviceDurationMin: number;
  servicePrice: number;
  staffId: string;
  staffName: string;
  staffAvatarUrl: string | null;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  clientAvatarUrl: string | null;
};

export type AdminQueueRow = {
  id: string;
  checkinAt: string; // ISO
  dateLabel: string;
  timeLabel: string;
  weekdayLabel: string;
  queueNumber: number;
  status: QueueStatus;
  serviceName: string;
  staffName: string | null;
  staffAvatarUrl: string | null;
  clientName: string | null; // null = no real or typed-in name; render the localized "walk-in" fallback
  clientPhone: string | null;
  clientAvatarUrl: string | null;
};

export type StaffOption = { id: string; name: string; serviceIds: string[] };

// Capped at a generous, most-recent slice — the workspace filters/paginates
// this client-side (same pattern as the Ofertat/Audit Log workspaces), and
// this range comfortably covers real period-over-period comparisons for any
// date range an admin would realistically pick in this studio's history.
export async function getAdminBookingHistory(locale: string, limit = 1000): Promise<AdminBookingRow[]> {
  const bookings = await prisma.booking.findMany({
    orderBy: { startTime: "desc" },
    take: limit,
    select: {
      id: true,
      startTime: true,
      status: true,
      serviceId: true,
      service: { select: { name: true, durationMin: true, price: true } },
      staff: { select: { id: true, name: true, avatarUrl: true } },
      client: { select: { id: true, name: true, phone: true, avatarUrl: true } },
    },
  });

  return bookings.map((b) => ({
    id: b.id,
    startTime: b.startTime.toISOString(),
    dateLabel: fmtDate(b.startTime, locale),
    timeLabel: fmtTime(b.startTime, locale),
    weekdayLabel: fmtWeekday(b.startTime, locale),
    status: b.status,
    serviceId: b.serviceId,
    serviceName: b.service.name,
    serviceDurationMin: b.service.durationMin,
    servicePrice: Number(b.service.price),
    staffId: b.staff.id,
    staffName: b.staff.name,
    staffAvatarUrl: b.staff.avatarUrl,
    clientId: b.client.id,
    clientName: b.client.name,
    clientPhone: b.client.phone,
    clientAvatarUrl: b.client.avatarUrl,
  }));
}

export async function getAdminQueueHistory(locale: string, limit = 1000): Promise<AdminQueueRow[]> {
  const entries = await prisma.queueEntry.findMany({
    orderBy: { checkinAt: "desc" },
    take: limit,
    select: {
      id: true,
      checkinAt: true,
      queueNumber: true,
      status: true,
      clientName: true,
      phone: true,
      service: { select: { name: true } },
      staff: { select: { name: true, avatarUrl: true } },
      client: { select: { name: true, phone: true, avatarUrl: true } },
    },
  });

  return entries.map((e) => ({
    id: e.id,
    checkinAt: e.checkinAt.toISOString(),
    dateLabel: fmtDate(e.checkinAt, locale),
    timeLabel: fmtTime(e.checkinAt, locale),
    weekdayLabel: fmtWeekday(e.checkinAt, locale),
    queueNumber: e.queueNumber,
    status: e.status,
    serviceName: e.service.name,
    staffName: e.staff?.name ?? null,
    staffAvatarUrl: e.staff?.avatarUrl ?? null,
    // Real name/typed name if either exists; null when truly anonymous —
    // the caller renders the localized "walk-in" fallback text for that.
    clientName: e.client?.name ?? e.clientName ?? null,
    clientPhone: e.client?.phone ?? e.phone ?? null,
    clientAvatarUrl: e.client?.avatarUrl ?? null,
  }));
}

export async function getReassignStaffOptions(): Promise<StaffOption[]> {
  const staff = await prisma.user.findMany({
    where: { role: "STAFF" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, staffServices: { select: { serviceId: true } } },
  });
  return staff.map((s) => ({ id: s.id, name: s.name, serviceIds: s.staffServices.map((x) => x.serviceId) }));
}
