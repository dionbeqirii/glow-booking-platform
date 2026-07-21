import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { staffServicesSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// FR-02 — replaces the full skill set of a staff member in one request.
export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const { id } = await params;

    const member = await prisma.user.findFirst({ where: { id, role: "STAFF" } });
    if (!member) throw new ApiError(404, "Punonjësi nuk u gjet");

    const { serviceIds } = staffServicesSchema.parse(await readJson(req));

    // Reject ids that do not exist so the skill list cannot drift.
    const found = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true },
    });
    if (found.length !== serviceIds.length) {
      throw new ApiError(400, "Një ose më shumë shërbime nuk ekzistojnë");
    }

    await prisma.$transaction([
      prisma.staffService.deleteMany({ where: { staffId: id } }),
      prisma.staffService.createMany({
        data: serviceIds.map((serviceId) => ({ staffId: id, serviceId })),
      }),
    ]);

    await audit({
      userId: session.userId,
      action: "STAFF_SERVICES_SET",
      entity: "User",
      entityId: id,
      details: `${member.name}: ${serviceIds.length} shërbime`,
    });

    return { count: serviceIds.length };
  });
}
