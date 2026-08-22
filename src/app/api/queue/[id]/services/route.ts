import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { queueServicesSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

// PUT — replace the full set of services checked off as performed during an
// in-progress visit (3.1). Only the assigned staff member or an admin may
// edit, and only while the visit is IN_SERVICE (before start or after
// completion, the set is final).
export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireSession();
    if (session.role === "CLIENT") throw new ApiError(403, "Vetëm stafi menaxhon vizitën");
    const { id } = await params;

    const entry = await prisma.queueEntry.findUnique({ where: { id } });
    if (!entry) throw new ApiError(404, "Klienti nuk u gjet në radhë");
    if (session.role === "STAFF" && entry.staffId !== session.userId) {
      throw new ApiError(403, "Kjo vizitë i takon një punonjësi tjetër");
    }
    if (entry.status !== "IN_SERVICE") {
      throw new ApiError(400, "Shërbimet mund të ndryshohen vetëm gjatë vizitës");
    }

    const { serviceIds } = queueServicesSchema.parse(await readJson(req));

    // The assigned staff member must actually be qualified for whatever is
    // checked off (defends against billing a service they can't perform).
    if (serviceIds.length > 0 && entry.staffId) {
      const qualifiedCount = await prisma.staffService.count({
        where: { staffId: entry.staffId, serviceId: { in: serviceIds } },
      });
      if (qualifiedCount !== serviceIds.length) {
        throw new ApiError(400, "Njëri prej shërbimeve nuk është ndër aftësitë e punonjësit");
      }
    }

    await prisma.$transaction([
      prisma.queueEntryService.deleteMany({ where: { queueEntryId: id } }),
      prisma.queueEntryService.createMany({
        data: serviceIds.map((serviceId) => ({ queueEntryId: id, serviceId })),
      }),
    ]);

    return { serviceIds };
  });
}
