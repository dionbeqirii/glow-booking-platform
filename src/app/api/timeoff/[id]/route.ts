import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { handle, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// The admin may remove any staff member's time off; a staff member may only
// remove their own (e.g. undoing a break they just added).
export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await params;

    const entry = await prisma.timeOff.findUnique({ where: { id } });
    if (!entry) throw new ApiError(404, "Mungesa nuk u gjet");
    if (session.role !== "ADMIN" && !(session.role === "STAFF" && session.userId === entry.staffId)) {
      throw new ApiError(403, "Nuk keni qasje te kjo veprim");
    }

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
