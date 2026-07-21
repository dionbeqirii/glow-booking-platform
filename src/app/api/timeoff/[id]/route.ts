import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { handle, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const { id } = await params;

    const entry = await prisma.timeOff.findUnique({ where: { id } });
    if (!entry) throw new ApiError(404, "Mungesa nuk u gjet");

    await prisma.timeOff.delete({ where: { id } });
    await audit({
      userId: session.userId,
      action: "TIMEOFF_DELETE",
      entity: "TimeOff",
      entityId: id,
    });

    return { deleted: true };
  });
}
