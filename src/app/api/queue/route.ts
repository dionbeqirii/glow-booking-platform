import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { queueCheckinSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import {
  simulateQueue,
  refreshQueueEstimates,
  ACTIVE_QUEUE_STATUSES,
  DISPLAY_QUEUE_STATUSES,
  CLIENT_WAIT_BUFFER_MIN,
} from "@/lib/queue";

// GET — today's active queue. A client sees only their own entry (position +
// buffered wait time); staff and admin see the whole line, with everyone's
// details, so they can call the next person (FR-11, 3.2).
export async function GET() {
  return handle(async () => {
    const session = await requireSession();

    if (session.role === "CLIENT") {
      const mine = await prisma.queueEntry.findFirst({
        where: { clientId: session.userId, status: { in: DISPLAY_QUEUE_STATUSES } },
        select: {
          id: true,
          queueNumber: true,
          checkinAt: true,
          estimatedWaitMin: true,
          status: true,
          calledAt: true,
          service: { select: { name: true, durationMin: true } },
          staff: { select: { name: true } },
        },
      });
      if (!mine) return { entries: [] };

      // Position among those still WAITING and checked in earlier — computed
      // as its own query, never by scanning a result set that (correctly)
      // never contains any other client's row.
      const position =
        mine.status === "WAITING"
          ? await prisma.queueEntry.count({
              where: { status: "WAITING", checkinAt: { lt: mine.checkinAt } },
            })
          : null;

      return {
        entries: [
          { ...mine, position, estimatedWaitMin: mine.estimatedWaitMin + CLIENT_WAIT_BUFFER_MIN },
        ],
      };
    }

    // ---------- Staff / admin: the full line ----------
    const entries = await prisma.queueEntry.findMany({
      where: { status: { in: DISPLAY_QUEUE_STATUSES } },
      orderBy: { checkinAt: "asc" },
      select: {
        id: true,
        clientName: true,
        phone: true,
        notes: true,
        queueNumber: true,
        checkinAt: true,
        estimatedWaitMin: true,
        status: true,
        calledAt: true,
        service: { select: { name: true, durationMin: true } },
        staff: { select: { id: true, name: true } },
        client: { select: { name: true, phone: true } },
      },
    });

    // Position = how many WAITING entries are ahead in line.
    let waitingSeen = 0;
    const withPosition = entries.map((e) => {
      const position = e.status === "WAITING" ? waitingSeen : null;
      if (e.status === "WAITING") waitingSeen++;
      return { ...e, position };
    });

    return { entries: withPosition };
  });
}

// POST — check in (FR-08). Rejected if no qualified staff has room left
// today, so a client never queues for a slot that cannot exist.
export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireSession();
    const data = queueCheckinSchema.parse(await readJson(req));

    const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
    if (!service || !service.active) throw new ApiError(404, "Shërbimi nuk u gjet");

    // One active queue entry per client at a time.
    if (session.role === "CLIENT") {
      const existing = await prisma.queueEntry.findFirst({
        where: { clientId: session.userId, status: { in: ACTIVE_QUEUE_STATUSES } },
      });
      if (existing) throw new ApiError(409, "Je tashmë në radhë");
    }

    const now = new Date();
    const existingActive = await prisma.queueEntry.findMany({
      where: { status: { in: ACTIVE_QUEUE_STATUSES } },
      select: { id: true, serviceId: true, checkinAt: true, service: { select: { durationMin: true } } },
    });

    const hypotheticalId = "__new__";
    const sim = await simulateQueue(
      [
        ...existingActive.map((e) => ({
          id: e.id,
          serviceId: e.serviceId,
          durationMin: e.service.durationMin,
          staffId: null,
          checkinAt: e.checkinAt,
        })),
        {
          id: hypotheticalId,
          serviceId: data.serviceId,
          durationMin: service.durationMin,
          staffId: null,
          checkinAt: now,
        },
      ],
      now
    );

    const projection = sim.get(hypotheticalId);
    if (!projection) {
      throw new ApiError(
        409,
        "Asnjë punonjës i disponueshëm sot për këtë shërbim. Provo një shërbim tjetër ose kthehu më vonë."
      );
    }

    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const todayCount = await prisma.queueEntry.count({ where: { checkinAt: { gte: dayStart } } });

    const entry = await prisma.queueEntry.create({
      data: {
        clientId: session.role === "CLIENT" ? session.userId : null,
        clientName: session.role === "CLIENT" ? null : data.clientName,
        phone: session.role === "CLIENT" ? null : data.phone,
        notes: session.role === "CLIENT" ? null : data.notes,
        serviceId: data.serviceId,
        staffId: projection.staffId,
        queueNumber: todayCount + 1,
        estimatedWaitMin: projection.waitMin,
      },
      select: { id: true, queueNumber: true, estimatedWaitMin: true },
    });

    await audit({
      userId: session.userId,
      action: "QUEUE_CHECKIN",
      entity: "QueueEntry",
      entityId: entry.id,
      details: service.name,
    });

    if (session.role === "CLIENT") {
      await notify({
        userId: session.userId,
        type: "CONFIRMATION",
        message: `Je në radhë me numrin ${entry.queueNumber}. Koha e parashikuar e pritjes: ~${entry.estimatedWaitMin + CLIENT_WAIT_BUFFER_MIN} min.`,
      });
    }

    await refreshQueueEstimates(now);

    return { entry };
  });
}
