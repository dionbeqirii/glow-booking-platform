import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { timeOffSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

type Ctx = { params: Promise<{ id: string }> };

// FR-03 — absences and leave, treated as exceptions to the weekly schedule.
// The admin may set time off for any staff member; a staff member may only
// ever block their own calendar (breaks, appointments away, etc.).
export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await params;
    if (session.role !== "ADMIN" && !(session.role === "STAFF" && session.userId === id)) {
      throw new ApiError(403, "Nuk keni qasje te kjo veprim");
    }

    const member = await prisma.user.findFirst({ where: { id, role: "STAFF" } });
    if (!member) throw new ApiError(404, "Punonjësi nuk u gjet");

    const data = timeOffSchema.parse(await readJson(req));
    const from = new Date(data.from);
    const until = new Date(data.until);
    if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime())) {
      throw new ApiError(400, "Datat nuk janë të vlefshme");
    }

    // Admin-set time off (their own or on a staff member's behalf) takes
    // effect immediately — there's no one above the admin to approve it. A
    // staff member requesting their own needs the admin's sign-off first;
    // it doesn't block the schedule until then (see availability.ts).
    const isAdmin = session.role === "ADMIN";
    const entry = await prisma.timeOff.create({
      data: { staffId: id, from, until, reason: data.reason, status: isAdmin ? "APPROVED" : "PENDING" },
    });

    await audit({
      userId: session.userId,
      action: "TIMEOFF_CREATE",
      entity: "TimeOff",
      entityId: entry.id,
      details: `${member.name}: ${data.from} - ${data.until}`,
    });

    if (!isAdmin) {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      await Promise.all(
        admins.map((a) =>
          notify({
            userId: a.id,
            type: "STATUS_CHANGE",
            message: `${member.name} ka kërkuar mungesë/bllokim kohe (${data.from} - ${data.until}) — kërkon miratimin tuaj.`,
          })
        )
      );
    }

    return { timeOff: entry };
  });
}
