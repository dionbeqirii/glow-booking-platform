import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { queueAssignSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { refreshQueueEstimates } from "@/lib/queue";

type Ctx = { params: Promise<{ id: string }> };

// FR-12 — the administrator manually pins a staff member to a waiting queue
// entry, overriding the automatic suggestion. The pin (staffLocked) keeps the
// auto-refresh from reassigning it later.
export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const { id } = await params;

    const entry = await prisma.queueEntry.findUnique({
      where: { id },
      include: { service: true },
    });
    if (!entry) throw new ApiError(404, "Klienti nuk u gjet në radhë");
    if (entry.status !== "WAITING") {
      throw new ApiError(400, "Vetëm klientët në pritje mund të ri-caktohen");
    }

    const { staffId } = queueAssignSchema.parse(await readJson(req));

    // The chosen staff member must actually perform this service.
    const skilled = await prisma.staffService.findUnique({
      where: { staffId_serviceId: { staffId, serviceId: entry.serviceId } },
    });
    if (!skilled) {
      throw new ApiError(400, "Ky punonjës nuk e kryen këtë shërbim");
    }

    await prisma.queueEntry.update({
      where: { id },
      data: { staffId, staffLocked: true },
    });

    const staff = await prisma.user.findUnique({ where: { id: staffId }, select: { name: true } });
    await audit({
      userId: session.userId,
      action: "QUEUE_ASSIGN",
      entity: "QueueEntry",
      entityId: id,
      details: `→ ${staff?.name ?? staffId}`,
    });

    if (entry.clientId) {
      await notify({
        userId: entry.clientId,
        type: "STATUS_CHANGE",
        message: `Radha jote për ${entry.service.name} u caktua te ${staff?.name ?? "një punonjës"}.`,
      });
    }

    // The pin changes who is free for everyone else still waiting.
    await refreshQueueEstimates();
    return { ok: true };
  });
}
