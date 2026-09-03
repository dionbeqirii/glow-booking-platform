import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { bookingUpdateSchema } from "@/lib/validation";
import { isSlotBookable, ACTIVE_BOOKING_STATUSES } from "@/lib/availability";
import { handle, readJson, ApiError, isPgError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { offerFreedSlotToWaitlist } from "@/lib/waitlist";
import { awardLoyaltyPoints } from "@/lib/loyalty";
import { BOOKING_STATUS_LABEL } from "@/lib/booking-labels";
import type { BookingStatus } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

// Allowed status transitions (FR-07). Cancellation is handled separately.
// COMPLETED is reachable directly from CONFIRMED/CHECKED_IN too — staff
// marking a scheduled booking "done" from a summary list shouldn't have to
// walk through check-in/in-service clicks it never bothered tracking.
const NEXT: Record<BookingStatus, BookingStatus[]> = {
  CONFIRMED: ["CHECKED_IN", "COMPLETED", "NO_SHOW"],
  CHECKED_IN: ["IN_SERVICE", "COMPLETED", "NO_SHOW"],
  IN_SERVICE: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { service: true },
    });
    if (!booking) throw new ApiError(404, "Rezervimi nuk u gjet");

    const isOwnerClient = booking.clientId === session.userId;
    const isAssignedStaff = booking.staffId === session.userId;
    const isAdmin = session.role === "ADMIN";
    const mayTouch = isAdmin || isAssignedStaff || (session.role === "CLIENT" && isOwnerClient);
    if (!mayTouch) throw new ApiError(403, "Nuk keni qasje te ky rezervim");

    const data = bookingUpdateSchema.parse(await readJson(req));

    // ---------- Cancel (FR-06) ----------
    if (data.action === "cancel") {
      if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(booking.status)) {
        throw new ApiError(400, "Ky rezervim nuk mund të anulohet më");
      }
      await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
      await audit({ userId: session.userId, action: "BOOKING_CANCEL", entity: "Booking", entityId: id, details: booking.service.name });
      // Tell the other party: the client if staff/admin cancelled, else the staff.
      const recipient = session.userId === booking.clientId ? booking.staffId : booking.clientId;
      await notify({
        userId: recipient,
        type: "STATUS_CHANGE",
        message: `Rezervimi për ${booking.service.name} u anulua.`,
      });
      // 3.3 — offer the just-freed slot to the waitlist with priority.
      await offerFreedSlotToWaitlist({
        serviceId: booking.serviceId,
        staffId: booking.staffId,
        startTime: booking.startTime,
        endTime: booking.endTime,
      });
      return { ok: true };
    }

    // ---------- Reschedule (FR-06) ----------
    if (data.action === "reschedule") {
      if (!["CONFIRMED", "CHECKED_IN"].includes(booking.status)) {
        throw new ApiError(400, "Vetëm rezervimet aktive mund të riplanifikohen");
      }
      const start = new Date(data.startTime!);
      const end = new Date(start.getTime() + booking.service.durationMin * 60000);

      // The new slot passes the same conflict check as a fresh booking,
      // ignoring this booking's own current interval.
      const check = await isSlotBookable({
        serviceId: booking.serviceId,
        staffId: data.staffId!,
        start,
        end,
        ignoreBookingId: id,
        requestingClientId: booking.clientId,
      });
      if (!check.ok) throw new ApiError(409, check.reason ?? "Termini i ri nuk është i lirë");

      try {
        await prisma.booking.update({
          where: { id },
          data: { staffId: data.staffId!, startTime: start, endTime: end, status: "CONFIRMED" },
        });
      } catch (err) {
        if (isPgError(err, "23P01")) throw new ApiError(409, "Termini u zu ndërkohë");
        throw err;
      }

      await audit({
        userId: session.userId,
        action: "BOOKING_RESCHEDULE",
        entity: "Booking",
        entityId: id,
        details: `${booking.service.name} → ${start.toLocaleString("sq")}`,
      });
      await notify({
        userId: booking.clientId,
        type: "STATUS_CHANGE",
        message: `Rezervimi për ${booking.service.name} u riplanifikua për ${start.toLocaleString("sq")}.`,
      });
      return { ok: true };
    }

    // ---------- Manual staff reassignment (FR-12) ----------
    // Only the administrator overrides who serves a booking. The new staff
    // member passes the same conflict check, so a manual move can never
    // create a double-booking either.
    if (data.action === "assign") {
      if (!isAdmin) throw new ApiError(403, "Vetëm administratori cakton punonjësin");
      if (!["CONFIRMED", "CHECKED_IN"].includes(booking.status)) {
        throw new ApiError(400, "Vetëm rezervimet aktive mund të ri-caktohen");
      }
      const newStaffId = data.staffId!;
      if (newStaffId === booking.staffId) return { ok: true };

      const check = await isSlotBookable({
        serviceId: booking.serviceId,
        staffId: newStaffId,
        start: booking.startTime,
        end: booking.endTime,
        ignoreBookingId: id,
      });
      if (!check.ok) throw new ApiError(409, check.reason ?? "Punonjësi i ri nuk është i lirë");

      try {
        await prisma.booking.update({ where: { id }, data: { staffId: newStaffId } });
      } catch (err) {
        if (isPgError(err, "23P01")) throw new ApiError(409, "Termini u zu ndërkohë");
        throw err;
      }

      const newStaff = await prisma.user.findUnique({
        where: { id: newStaffId },
        select: { name: true },
      });
      await audit({
        userId: session.userId,
        action: "BOOKING_ASSIGN",
        entity: "Booking",
        entityId: id,
        details: `→ ${newStaff?.name ?? newStaffId}`,
      });
      await notify({
        userId: booking.clientId,
        type: "STATUS_CHANGE",
        message: `Rezervimi për ${booking.service.name} u caktua te ${newStaff?.name ?? "një punonjës tjetër"}.`,
      });
      await notify({
        userId: newStaffId,
        type: "STATUS_CHANGE",
        message: `Ju u caktua rezervimi për ${booking.service.name}, ${booking.startTime.toLocaleString("sq")}.`,
      });
      return { ok: true };
    }

    // ---------- Payment status (admin-tracked, not a payment gateway) ----------
    if (data.action === "payment") {
      if (!isAdmin) throw new ApiError(403, "Vetëm administratori ndryshon statusin e pagesës");
      await prisma.booking.update({ where: { id }, data: { paymentStatus: data.paymentStatus! } });
      await audit({
        userId: session.userId,
        action: "BOOKING_PAYMENT_STATUS_CHANGE",
        entity: "Booking",
        entityId: id,
        details: data.paymentStatus,
      });
      return { ok: true };
    }

    // ---------- Status change (FR-07) ----------
    // Staff moves a booking forward through its normal lifecycle. The admin
    // gets a full correction override — any of the 6 statuses, in any
    // direction — since they're the one fixing mistakes after the fact.
    if (session.role === "CLIENT") throw new ApiError(403, "Klienti nuk e ndryshon statusin");
    const next = data.status as BookingStatus;
    if (!isAdmin && !NEXT[booking.status].includes(next)) {
      throw new ApiError(400, `Kalimi ${booking.status} → ${next} nuk lejohet`);
    }
    if (next === booking.status) return { ok: true };

    // 3.3 — an admin correction into CANCELLED frees the slot the same way
    // a normal cancel does, so the waitlist gets offered it too.
    const wasActive = ACTIVE_BOOKING_STATUSES.includes(booking.status);

    try {
      await prisma.booking.update({ where: { id }, data: { status: next } });
    } catch (err) {
      // Reviving a cancelled/completed booking back into an active status
      // (CONFIRMED/CHECKED_IN/IN_SERVICE) re-enters the exclusion
      // constraint's watch — a real conflict surfaces here, not earlier.
      if (isPgError(err, "23P01")) {
        throw new ApiError(409, "Ky orar është zënë tashmë nga një rezervim tjetër aktiv i këtij punonjësi");
      }
      throw err;
    }

    await audit({
      userId: session.userId,
      action: `BOOKING_${next}`,
      entity: "Booking",
      entityId: id,
      details: booking.service.name,
    });
    if (next === "COMPLETED") {
      await awardLoyaltyPoints(booking.clientId, Number(booking.service.price));
    }
    // Keep the client informed of every lifecycle move on their booking (FR-13).
    await notify({
      userId: booking.clientId,
      type: "STATUS_CHANGE",
      message: `Rezervimi për ${booking.service.name}: ${BOOKING_STATUS_LABEL[next].toLowerCase()}.`,
    });

    if (next === "CANCELLED" && wasActive) {
      await offerFreedSlotToWaitlist({
        serviceId: booking.serviceId,
        staffId: booking.staffId,
        startTime: booking.startTime,
        endTime: booking.endTime,
      });
    }

    return { ok: true };
  });
}
