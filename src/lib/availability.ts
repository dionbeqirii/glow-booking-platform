import { prisma } from "./prisma";
import type { BookingStatus } from "@prisma/client";

// Statuses that still occupy the calendar. Cancelled and no-show entries are
// treated as free space, so a cancelled slot can be booked again (B4).
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  "CONFIRMED",
  "CHECKED_IN",
  "IN_SERVICE",
];

// Candidate start times are generated on this grid (minutes).
const SLOT_STEP_MIN = 15;

export type SlotStaff = { id: string; name: string };
export type Slot = { time: string; staff: SlotStaff[] };

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Builds a Date from a calendar day and a minute offset, in the server's local
 * time. Availability and booking creation must use the same construction so
 * that their overlap checks agree.
 */
function at(dateStr: string, minutes: number): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0);
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Free appointment slots for a service on a given day (FR-04).
 *
 * A slot is free when the whole block [start, start+duration] fits inside a
 * working interval, falls outside any time off, does not overlap an active
 * booking, and does not start in the past.
 */
export async function availableSlots(params: {
  serviceId: string;
  date: string; // YYYY-MM-DD
  staffId?: string; // optional preferred staff
}): Promise<{ durationMin: number; slots: Slot[] }> {
  const service = await prisma.service.findUnique({ where: { id: params.serviceId } });
  if (!service || !service.active) return { durationMin: 0, slots: [] };

  const duration = service.durationMin;
  const [y, mo, d] = params.date.split("-").map(Number);
  const weekday = new Date(y, mo - 1, d).getDay(); // 0..6
  const dayStart = at(params.date, 0);
  const dayEnd = at(params.date, 24 * 60);
  const now = new Date();

  // Staff who can perform this service (optionally narrowed to one).
  const staff = await prisma.user.findMany({
    where: {
      role: "STAFF",
      ...(params.staffId ? { id: params.staffId } : {}),
      staffServices: { some: { serviceId: params.serviceId } },
    },
    select: {
      id: true,
      name: true,
      workingHours: { where: { weekday }, select: { startTime: true, endTime: true } },
      timeOff: {
        where: { from: { lt: dayEnd }, until: { gt: dayStart } },
        select: { from: true, until: true },
      },
      bookingsAsStaff: {
        where: {
          status: { in: ACTIVE_BOOKING_STATUSES },
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
        },
        select: { startTime: true, endTime: true },
      },
    },
  });

  // Collect available start minutes per staff, then invert into slots.
  const byTime = new Map<number, SlotStaff[]>();

  for (const member of staff) {
    const busy = member.bookingsAsStaff.map((b) => ({
      start: (b.startTime.getTime() - dayStart.getTime()) / 60000,
      end: (b.endTime.getTime() - dayStart.getTime()) / 60000,
    }));
    const off = member.timeOff.map((t) => ({
      start: (t.from.getTime() - dayStart.getTime()) / 60000,
      end: (t.until.getTime() - dayStart.getTime()) / 60000,
    }));

    for (const wh of member.workingHours) {
      const openFrom = toMinutes(wh.startTime);
      const openTo = toMinutes(wh.endTime);

      for (let start = openFrom; start + duration <= openTo; start += SLOT_STEP_MIN) {
        const end = start + duration;

        if (at(params.date, start) < now) continue; // no past slots
        if (busy.some((b) => overlaps(start, end, b.start, b.end))) continue;
        if (off.some((o) => overlaps(start, end, o.start, o.end))) continue;

        const list = byTime.get(start) ?? [];
        list.push({ id: member.id, name: member.name });
        byTime.set(start, list);
      }
    }
  }

  const slots: Slot[] = [...byTime.keys()]
    .sort((a, b) => a - b)
    .map((minutes) => ({
      time: at(params.date, minutes).toISOString(),
      staff: byTime.get(minutes)!,
    }));

  return { durationMin: duration, slots };
}

/**
 * Server-side re-check used before a booking is written (FR-05). It is the
 * first line of defence; the database exclusion constraint is the guarantee
 * that holds even under concurrent requests (NFR-01).
 */
export async function isSlotBookable(params: {
  serviceId: string;
  staffId: string;
  start: Date;
  end: Date;
  ignoreBookingId?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const { serviceId, staffId, start, end } = params;

  if (end <= start) return { ok: false, reason: "Intervali i terminit është i pavlefshëm" };
  if (start < new Date()) return { ok: false, reason: "Termini nuk mund të jetë në të kaluarën" };

  const canDo = await prisma.staffService.findUnique({
    where: { staffId_serviceId: { staffId, serviceId } },
  });
  if (!canDo) return { ok: false, reason: "Punonjësi nuk e kryen këtë shërbim" };

  const weekday = start.getDay();
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  const hours = await prisma.workingHours.findMany({ where: { staffId, weekday } });
  const insideShift = hours.some(
    (h) => toMinutes(h.startTime) <= startMin && endMin <= toMinutes(h.endTime)
  );
  if (!insideShift) return { ok: false, reason: "Jashtë orarit të punës së punonjësit" };

  const off = await prisma.timeOff.count({
    where: { staffId, from: { lt: end }, until: { gt: start } },
  });
  if (off > 0) return { ok: false, reason: "Punonjësi ka mungesë në këtë periudhë" };

  const clash = await prisma.booking.count({
    where: {
      staffId,
      status: { in: ACTIVE_BOOKING_STATUSES },
      startTime: { lt: end },
      endTime: { gt: start },
      ...(params.ignoreBookingId ? { id: { not: params.ignoreBookingId } } : {}),
    },
  });
  if (clash > 0) return { ok: false, reason: "Termini është zënë ndërkohë" };

  return { ok: true };
}
