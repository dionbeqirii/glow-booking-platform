import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { bookingCreateSchema } from "@/lib/validation";
import { isSlotBookable, ACTIVE_BOOKING_STATUSES } from "@/lib/availability";
import { handle, readJson, ApiError, isPgError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

// GET — the caller's bookings, scoped by role.
export async function GET(req: Request) {
  return handle(async () => {
    const session = await requireSession();
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope"); // "upcoming" | "all"

    // A client sees only their own bookings; staff see the ones assigned to
    // them; the administrator sees everything.
    const where =
      session.role === "CLIENT"
        ? { clientId: session.userId }
        : session.role === "STAFF"
          ? { staffId: session.userId }
          : {};

    const bookings = await prisma.booking.findMany({
      where: {
        ...where,
        ...(scope === "upcoming"
          ? { startTime: { gte: new Date() }, status: { in: ACTIVE_BOOKING_STATUSES } }
          : {}),
      },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        service: { select: { name: true, durationMin: true } },
        staff: { select: { name: true } },
        client: { select: { name: true } },
      },
    });

    return { bookings };
  });
}

// POST — create a booking (FR-05). The server re-checks the slot; the database
// exclusion constraint is the final guarantee against a concurrent double
// booking (NFR-01).
export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireSession();
    const data = bookingCreateSchema.parse(await readJson(req));

    const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
    if (!service || !service.active) throw new ApiError(404, "Shërbimi nuk u gjet");

    const start = new Date(data.startTime);
    const end = new Date(start.getTime() + service.durationMin * 60000);

    // A client books for themselves. An admin may book on behalf of any
    // existing client account, for any staff member, via the "Termin i Ri"
    // modal. Staff may do the same from their own "My Schedule" page, but
    // only ever onto their own calendar — data.staffId is ignored for them.
    let clientId = session.userId;
    if ((session.role === "ADMIN" || session.role === "STAFF") && data.clientId) {
      const targetClient = await prisma.user.findUnique({ where: { id: data.clientId }, select: { role: true } });
      if (!targetClient || targetClient.role !== "CLIENT") throw new ApiError(404, "Klienti nuk u gjet");
      clientId = data.clientId;
    }
    const staffId = session.role === "STAFF" ? session.userId : data.staffId;

    const check = await isSlotBookable({
      serviceId: data.serviceId,
      staffId,
      start,
      end,
      requestingClientId: clientId,
    });
    if (!check.ok) throw new ApiError(409, check.reason ?? "Termini nuk është i disponueshëm");

    let booking;
    try {
      booking = await prisma.booking.create({
        data: {
          clientId,
          serviceId: data.serviceId,
          staffId,
          startTime: start,
          endTime: end,
          status: "CONFIRMED",
        },
        select: { id: true, startTime: true, staff: { select: { name: true } } },
      });
    } catch (err) {
      // 23P01 = exclusion_violation: another request took the slot first.
      if (isPgError(err, "23P01")) {
        throw new ApiError(409, "Termini u zu ndërkohë nga një kërkesë tjetër");
      }
      throw err;
    }

    await audit({
      userId: session.userId,
      action: "BOOKING_CREATE",
      entity: "Booking",
      entityId: booking.id,
      details: `${service.name} te ${booking.staff.name}, ${start.toLocaleString("sq")}`,
    });
    await notify({
      userId: clientId,
      type: "CONFIRMATION",
      message: `Rezervimi u konfirmua për ${service.name} te ${booking.staff.name}, ${start.toLocaleString("sq")}.`,
    });

    // They now have an appointment for this service — waiting for one to
    // free up no longer applies (3.3). Ignored if they were never on it.
    await prisma.waitlist
      .delete({ where: { clientId_serviceId: { clientId, serviceId: data.serviceId } } })
      .catch(() => {});

    return { booking: { id: booking.id } };
  });
}
