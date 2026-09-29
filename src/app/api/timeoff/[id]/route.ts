import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/rbac";
import { handle, readJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { timeOffReviewSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// Admin-only: approve or reject a staff member's pending request (their own
// entries, and any admin-created ones, are already APPROVED and never reach
// here through the UI — but reviewing one twice is harmless either way).
export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const { id } = await params;

    const entry = await prisma.timeOff.findUnique({ where: { id }, include: { staff: { select: { name: true } } } });
    if (!entry) throw new ApiError(404, "Mungesa nuk u gjet");

    const { action } = timeOffReviewSchema.parse(await readJson(req));
    const status = action === "approve" ? "APPROVED" : "REJECTED";

    await prisma.timeOff.update({ where: { id }, data: { status } });
    await audit({
      userId: session.userId,
      action: action === "approve" ? "TIMEOFF_APPROVE" : "TIMEOFF_REJECT",
      entity: "TimeOff",
      entityId: id,
      details: entry.staff.name,
    });

    await notify({
      userId: entry.staffId,
      type: "STATUS_CHANGE",
      message:
        action === "approve"
          ? "Kërkesa jote për mungesë/bllokim kohe u miratua."
          : "Kërkesa jote për mungesë/bllokim kohe u refuzua.",
    });

    return { ok: true };
  });
}

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
