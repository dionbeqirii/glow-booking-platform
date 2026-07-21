import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { serviceUpdateSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const { id } = await params;
    const data = serviceUpdateSchema.parse(await readJson(req));

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Shërbimi nuk u gjet");

    const service = await prisma.service.update({ where: { id }, data });

    await audit({
      userId: session.userId,
      action: "SERVICE_UPDATE",
      entity: "Service",
      entityId: id,
      details: service.name,
    });

    return { service };
  });
}

// A service that already appears in bookings or queue entries is deactivated
// instead of removed, so past records keep their reference.
export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const { id } = await params;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Shërbimi nuk u gjet");

    const used =
      (await prisma.booking.count({ where: { serviceId: id } })) +
      (await prisma.queueEntry.count({ where: { serviceId: id } }));

    if (used > 0) {
      await prisma.service.update({ where: { id }, data: { active: false } });
      await audit({
        userId: session.userId,
        action: "SERVICE_DEACTIVATE",
        entity: "Service",
        entityId: id,
        details: `${existing.name} (i përdorur në ${used} regjistrime)`,
      });
      return { deactivated: true };
    }

    await prisma.staffService.deleteMany({ where: { serviceId: id } });
    await prisma.service.delete({ where: { id } });
    await audit({
      userId: session.userId,
      action: "SERVICE_DELETE",
      entity: "Service",
      entityId: id,
      details: existing.name,
    });

    return { deleted: true };
  });
}
