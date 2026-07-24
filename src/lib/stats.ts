import { prisma } from "./prisma";
import type { BookingStatus } from "@prisma/client";

/**
 * Studio analytics (FR-15). Everything is computed over a rolling window of
 * `days` ending now, so the administrator sees recent, actionable figures.
 */

export type StaffUtilization = {
  staffId: string;
  name: string;
  bookedMin: number;
  availableMin: number;
  utilization: number; // 0..1, availableMin === 0 → 0
};

export type StudioStats = {
  days: number;
  from: string;
  bookings: {
    total: number;
    byStatus: Record<BookingStatus, number>;
    cancellationRate: number; // 0..1
    noShowRate: number; // 0..1
  };
  queue: {
    checkins: number;
    completed: number;
    noShow: number;
    avgWaitMin: number | null; // real wait: calledAt - checkinAt, null if none
  };
  utilization: StaffUtilization[];
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const EMPTY_STATUS: Record<BookingStatus, number> = {
  CONFIRMED: 0,
  CHECKED_IN: 0,
  IN_SERVICE: 0,
  COMPLETED: 0,
  CANCELLED: 0,
  NO_SHOW: 0,
};

export async function computeStudioStats(days = 30, now: Date = new Date()): Promise<StudioStats> {
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // ---------- Bookings in the window (by appointment time) ----------
  const bookings = await prisma.booking.findMany({
    where: { startTime: { gte: from, lte: now } },
    select: { status: true, staffId: true, service: { select: { durationMin: true } }, startTime: true },
  });

  const byStatus = { ...EMPTY_STATUS };
  for (const b of bookings) byStatus[b.status]++;
  const total = bookings.length;
  const cancellationRate = total > 0 ? byStatus.CANCELLED / total : 0;
  const noShowRate = total > 0 ? byStatus.NO_SHOW / total : 0;

  // ---------- Queue in the window (by check-in time) ----------
  const queue = await prisma.queueEntry.findMany({
    where: { checkinAt: { gte: from, lte: now } },
    select: { status: true, checkinAt: true, calledAt: true },
  });

  let waitSum = 0;
  let waitCount = 0;
  let completed = 0;
  let noShowQ = 0;
  for (const q of queue) {
    if (q.status === "COMPLETED") completed++;
    if (q.status === "NO_SHOW") noShowQ++;
    if (q.calledAt) {
      // Real, measured wait — the time between check-in and being called.
      const w = (q.calledAt.getTime() - q.checkinAt.getTime()) / 60000;
      if (w >= 0) {
        waitSum += w;
        waitCount++;
      }
    }
  }
  const avgWaitMin = waitCount > 0 ? Math.round(waitSum / waitCount) : null;

  // ---------- Staff utilization ----------
  const staff = await prisma.user.findMany({
    where: { role: "STAFF" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      workingHours: { select: { weekday: true, startTime: true, endTime: true } },
    },
  });

  // Minutes each staff member is scheduled to work per weekday.
  const minutesByWeekday = new Map<string, number[]>();
  for (const s of staff) {
    const perDay = [0, 0, 0, 0, 0, 0, 0];
    for (const h of s.workingHours) perDay[h.weekday] += toMinutes(h.endTime) - toMinutes(h.startTime);
    minutesByWeekday.set(s.id, perDay);
  }

  // Available minutes = sum of each staff member's weekday capacity across the
  // days in the window.
  const availableByStaff = new Map<string, number>();
  for (const s of staff) availableByStaff.set(s.id, 0);
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(now);
  while (cursor <= end) {
    const wd = cursor.getDay();
    for (const s of staff) {
      const perDay = minutesByWeekday.get(s.id)!;
      availableByStaff.set(s.id, availableByStaff.get(s.id)! + perDay[wd]);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Booked minutes = duration of non-cancelled, non-no-show bookings assigned
  // to the staff member in the window.
  const bookedByStaff = new Map<string, number>();
  for (const s of staff) bookedByStaff.set(s.id, 0);
  for (const b of bookings) {
    if (b.status === "CANCELLED" || b.status === "NO_SHOW") continue;
    bookedByStaff.set(b.staffId, (bookedByStaff.get(b.staffId) ?? 0) + b.service.durationMin);
  }

  const utilization: StaffUtilization[] = staff.map((s) => {
    const availableMin = availableByStaff.get(s.id) ?? 0;
    const bookedMin = bookedByStaff.get(s.id) ?? 0;
    return {
      staffId: s.id,
      name: s.name,
      bookedMin,
      availableMin,
      utilization: availableMin > 0 ? Math.min(1, bookedMin / availableMin) : 0,
    };
  });

  return {
    days,
    from: from.toISOString(),
    bookings: { total, byStatus, cancellationRate, noShowRate },
    queue: { checkins: queue.length, completed, noShow: noShowQ, avgWaitMin },
    utilization,
  };
}
