import { prisma } from "./prisma";
import { ACTIVE_BOOKING_STATUSES } from "./availability";
import type { QueueStatus } from "@prisma/client";

/**
 * Walk-in queue engine (FR-08, FR-09, FR-10/B2).
 *
 * The queue and the reservation calendar share the same staff time, so the
 * estimated waiting time cannot be "5 minutes per person ahead" — it has to
 * simulate the actual day: which staff member becomes free first, and
 * whether a confirmed booking sits in the way.
 *
 * Algorithm (discrete-event simulation, run for "today" only):
 *   1. For every staff member working today, start a cursor at now (or at
 *      shift start, if the shift has not begun).
 *   2. Walk the active queue entries in check-in order (FIFO). For each
 *      entry, consider the staff who can perform its service and are still
 *      within their shift; pick whichever has the earliest cursor.
 *   3. The candidate start time is that cursor. If a confirmed booking for
 *      that staff overlaps [start, start+duration), the reservation wins
 *      (B2): the cursor jumps to the end of the booking and the check is
 *      repeated. This is what keeps the queue from ever violating a
 *      confirmed appointment (FR-10).
 *   4. If the block still fits before the shift ends, it is scheduled there
 *      and the staff cursor advances to its end. Otherwise that staff has no
 *      more room today; the entry looks for another qualified staff member.
 *   5. If nobody has room today, the entry cannot be estimated (used to
 *      reject a check-in that has nowhere to go).
 */

export type QueueSimEntry = {
  id: string;
  serviceId: string;
  durationMin: number;
  staffId: string | null; // a client's own staff preference, if any
  checkinAt: Date;
};

export type QueueSimResult = {
  start: Date;
  waitMin: number;
  staffId: string;
};

type StaffDay = {
  id: string;
  cursor: number; // minutes from local midnight
  shiftEnd: number; // minutes from local midnight
  serviceIds: Set<string>;
  bookings: { start: number; end: number }[];
};

function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(base: Date, minutes: number): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

/**
 * Loads today's staff shifts (cursor starts at "now"), bookings and skills.
 * Shared by check-in (dry run) and the queue listing (live refresh).
 */
async function loadStaffDay(now: Date): Promise<Map<string, StaffDay>> {
  const weekday = now.getDay();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);

  const staff = await prisma.user.findMany({
    where: { role: "STAFF" },
    select: {
      id: true,
      workingHours: { where: { weekday }, select: { startTime: true, endTime: true } },
      staffServices: { select: { serviceId: true } },
      bookingsAsStaff: {
        where: {
          status: { in: ACTIVE_BOOKING_STATUSES },
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
        },
        select: { startTime: true, endTime: true },
      },
      // A walk-in already being served occupies the staff right now, even
      // though it is no longer in the FIFO queue (status left WAITING/CALLED).
      // It is not in the reservation table, so it would otherwise be invisible
      // to the simulation and produce an over-optimistic estimate.
      queueAsStaff: {
        where: { status: "IN_SERVICE" },
        select: { service: { select: { durationMin: true } } },
      },
    },
  });

  const nowMin = minutesSinceMidnight(now);
  const map = new Map<string, StaffDay>();

  for (const s of staff) {
    if (s.workingHours.length === 0) continue; // not working today
    // A staff member may have several shift intervals; take the outer bound
    // for simplicity and rely on the booking list to fill any gap between
    // them (queue entries will naturally be pushed past a lunch booking).
    const shiftStart = Math.min(...s.workingHours.map((h) => toMinutes(h.startTime)));
    const shiftEnd = Math.max(...s.workingHours.map((h) => toMinutes(h.endTime)));
    if (nowMin >= shiftEnd) continue; // shift already over

    // Conservative bound: assume an in-progress walk-in service takes its
    // full listed duration counted from now (we don't record its actual
    // start time, so this cannot be sharpened further without a schema
    // change; it only ever makes the wait estimate longer, never shorter).
    const inServiceMinutes = s.queueAsStaff.reduce(
      (acc, q) => acc + q.service.durationMin,
      0
    );

    map.set(s.id, {
      id: s.id,
      cursor: Math.max(nowMin, shiftStart, nowMin + inServiceMinutes),
      shiftEnd,
      serviceIds: new Set(s.staffServices.map((x) => x.serviceId)),
      bookings: s.bookingsAsStaff
        .map((b) => ({ start: minutesSinceMidnight(b.startTime), end: minutesSinceMidnight(b.endTime) }))
        .sort((a, b) => a.start - b.start),
    });
  }
  return map;
}

/** Pushes `start` forward past any confirmed booking it would overlap (B2). */
function resolveAgainstBookings(staff: StaffDay, start: number, duration: number): number | null {
  let candidate = start;
  // Bookings are sorted; loop until no booking in the day overlaps the block.
  let moved = true;
  while (moved) {
    moved = false;
    for (const b of staff.bookings) {
      if (candidate < b.end && b.start < candidate + duration) {
        candidate = b.end;
        moved = true;
      }
    }
  }
  if (candidate + duration > staff.shiftEnd) return null; // no room left today
  return candidate;
}

/**
 * Simulates the whole active queue (in FIFO order) plus an optional
 * hypothetical new entry appended at the end, and returns the projected
 * start time, staff assignment and wait (in minutes) for every entry.
 */
export async function simulateQueue(
  entries: QueueSimEntry[],
  now: Date = new Date()
): Promise<Map<string, QueueSimResult | null>> {
  const staffDay = await loadStaffDay(now);
  const results = new Map<string, QueueSimResult | null>();

  const ordered = [...entries].sort((a, b) => a.checkinAt.getTime() - b.checkinAt.getTime());

  for (const entry of ordered) {
    const candidates = [...staffDay.values()].filter(
      (s) =>
        s.serviceIds.has(entry.serviceId) && (!entry.staffId || entry.staffId === s.id)
    );

    let best: { staff: StaffDay; start: number } | null = null;
    for (const staff of candidates) {
      const start = resolveAgainstBookings(staff, staff.cursor, entry.durationMin);
      if (start === null) continue;
      if (!best || start < best.start) best = { staff, start };
    }

    if (!best) {
      results.set(entry.id, null);
      continue;
    }

    best.staff.cursor = best.start + entry.durationMin;
    const startDate = fromMinutes(now, best.start);
    const waitMin = Math.max(0, Math.round((startDate.getTime() - now.getTime()) / 60000));
    results.set(entry.id, { start: startDate, waitMin, staffId: best.staff.id });
  }

  return results;
}

/**
 * Statuses the simulation still needs to assign a turn to. IN_SERVICE is
 * deliberately excluded: that client already has the staff member's
 * attention, so there is nothing left to schedule for them.
 */
export const ACTIVE_QUEUE_STATUSES: QueueStatus[] = ["WAITING", "CALLED"];

/** Everything still happening today — used for listings/display. */
export const DISPLAY_QUEUE_STATUSES: QueueStatus[] = ["WAITING", "CALLED", "IN_SERVICE"];

/**
 * Recomputes and persists the estimate for every currently active queue
 * entry. Called after any state change (check-in, call, complete, no-show,
 * leave) so the displayed wait time reflects the new queue (FR-09).
 */
export async function refreshQueueEstimates(now: Date = new Date()): Promise<void> {
  const active = await prisma.queueEntry.findMany({
    where: { status: { in: ACTIVE_QUEUE_STATUSES } },
    select: { id: true, serviceId: true, staffId: true, status: true, checkinAt: true, service: { select: { durationMin: true } } },
  });
  if (active.length === 0) return;

  const results = await simulateQueue(
    active.map((e) => ({
      id: e.id,
      serviceId: e.serviceId,
      durationMin: e.service.durationMin,
      // A client already called has a committed staff member; still-waiting
      // entries stay open to whoever ends up free first.
      staffId: e.status === "CALLED" ? e.staffId : null,
      checkinAt: e.checkinAt,
    })),
    now
  );

  await prisma.$transaction(
    active.map((e) => {
      const r = results.get(e.id);
      return prisma.queueEntry.update({
        where: { id: e.id },
        data: {
          estimatedWaitMin: r ? r.waitMin : 0,
          // Only re-suggest the staff member while still waiting.
          ...(e.status === "WAITING" && r ? { staffId: r.staffId } : {}),
        },
      });
    })
  );
}
