import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { queueUpdateSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { refreshQueueEstimates } from "@/lib/queue";
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

    const entry = await prisma.queueEntry.findUnique({ where: { id }, include: { service: true } });
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

    await prisma.queueEntry.update({
      where: { id },
      data: {
        status: next,
        ...(action === "call" ? { staffId, calledAt: new Date() } : {}),
      },
    });

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

    return { ok: true };
  });
}
