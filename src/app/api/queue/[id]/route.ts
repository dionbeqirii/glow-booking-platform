import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { queueUpdateSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { refreshQueueEstimates } from "@/lib/queue";
import { awardLoyaltyPoints } from "@/lib/loyalty";
import type { QueueStatus } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

// Allowed lifecycle transitions (FR-11), mirroring the booking status model.
const NEXT: Record<QueueStatus, QueueStatus[]> = {
  WAITING: ["CALLED", "NO_SHOW"],
  CALLED: ["IN_SERVICE", "NO_SHOW"],
  IN_SERVICE: ["COMPLETED"],
  COMPLETED: [],
  NO_SHOW: [],
};

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await params;

    const entry = await prisma.queueEntry.findUnique({
      where: { id },
      include: { service: true, client: true, staff: true },
    });
    if (!entry) throw new ApiError(404, "Klienti nuk u gjet në radhë");

    const { action } = queueUpdateSchema.parse(await readJson(req));

    // ---------- Leave the queue (client, while still waiting) ----------
    if (action === "leave") {
      const isOwner = entry.clientId === session.userId;
      if (!isOwner && session.role !== "ADMIN") throw new ApiError(403, "Nuk keni qasje te kjo hyrje");
      if (entry.status !== "WAITING") throw new ApiError(400, "Vetëm klientët në pritje mund të largohen");

      await prisma.queueEntry.delete({ where: { id } });
      await audit({ userId: session.userId, action: "QUEUE_LEAVE", entity: "QueueEntry", entityId: id });
      await refreshQueueEstimates();
      return { ok: true };
    }

    // ---------- Everything else is staff/admin only ----------
    if (session.role === "CLIENT") throw new ApiError(403, "Vetëm stafi menaxhon radhën");

    const map: Record<Exclude<typeof action, "leave">, QueueStatus> = {
      call: "CALLED",
      start: "IN_SERVICE",
      complete: "COMPLETED",
      no_show: "NO_SHOW",
    };
    const next = map[action as Exclude<typeof action, "leave">];
    if (!NEXT[entry.status].includes(next)) {
      throw new ApiError(400, `Kalimi ${entry.status} → ${next} nuk lejohet`);
    }

    // Calling the client commits the caller as the serving staff member,
    // unless an admin calls on behalf of the originally suggested staff.
    const staffId =
      action === "call" ? (session.role === "STAFF" ? session.userId : entry.staffId) : entry.staffId;
    if (action === "call" && !staffId) {
      throw new ApiError(400, "Ky rekord s'ka punonjës të caktuar; thirreni si staf i identifikuar");
    }

    // Completing requires at least one confirmed service — nothing to
    // invoice otherwise (3.1). "start" pre-checks the originally booked one.
    if (action === "complete") {
      const checked = await prisma.queueEntryService.count({ where: { queueEntryId: id } });
      if (checked === 0) {
        throw new ApiError(400, "Shëno të paktën një shërbim të kryer para se të përfundosh");
      }
    }

    await prisma.queueEntry.update({
      where: { id },
      data: {
        status: next,
        ...(action === "call" ? { staffId, calledAt: new Date() } : {}),
        ...(action === "start" ? { startedAt: new Date() } : {}),
        ...(action === "complete" ? { completedAt: new Date() } : {}),
      },
    });

    if (action === "start") {
      // Pre-check the originally booked service so staff isn't forced to
      // re-tick something the client already checked in for.
      await prisma.queueEntryService.upsert({
        where: { queueEntryId_serviceId: { queueEntryId: id, serviceId: entry.serviceId } },
        create: { queueEntryId: id, serviceId: entry.serviceId },
        update: {},
      });
    }

    let invoice: {
      clientName: string;
      staffName: string;
      startedAt: string | null;
      completedAt: string;
      services: { name: string; price: number }[];
      total: number;
    } | null = null;

    if (action === "complete") {
      const visitServices = await prisma.queueEntryService.findMany({
        where: { queueEntryId: id },
        include: { service: { select: { name: true, price: true } } },
      });
      const services = visitServices.map((v) => ({ name: v.service.name, price: Number(v.service.price) }));
      invoice = {
        clientName: entry.client?.name ?? entry.clientName ?? "Klient pa emër",
        staffName: entry.staff?.name ?? "—",
        startedAt: entry.startedAt ? entry.startedAt.toISOString() : null,
        completedAt: new Date().toISOString(),
        services,
        total: services.reduce((s, x) => s + x.price, 0),
      };
      await awardLoyaltyPoints(entry.clientId, invoice.total);
    }

    await audit({
      userId: session.userId,
      action: `QUEUE_${next}`,
      entity: "QueueEntry",
      entityId: id,
    });

    if (entry.clientId) {
      if (action === "call") {
        await notify({
          userId: entry.clientId,
          type: "QUEUE_CALL",
          message: `Radha jote erdhi për ${entry.service.name}. Paraqitu te studioja.`,
        });
      } else if (action === "complete") {
        await notify({
          userId: entry.clientId,
          type: "STATUS_CHANGE",
          message: `Shërbimi ${entry.service.name} përfundoi. Faleminderit që zgjodhe Glow By Diellza!`,
        });
      } else if (action === "no_show") {
        await notify({
          userId: entry.clientId,
          type: "STATUS_CHANGE",
          message: `Hyrja jote në radhë për ${entry.service.name} u shënua si "nuk u paraqit".`,
        });
      }
    }

    // Freeing this staff member (complete/no_show) or committing them
    // (call) both change the picture for everyone still waiting.
    await refreshQueueEstimates();

    return { ok: true, invoice };
  });
}
