import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { timeOffSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

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

    const entry = await prisma.timeOff.create({
      data: { staffId: id, from, until, reason: data.reason },
    });

    await audit({
      userId: session.userId,
      action: "TIMEOFF_CREATE",
      entity: "TimeOff",
      entityId: entry.id,
      details: `${member.name}: ${data.from} - ${data.until}`,
    });

    return { timeOff: entry };
  });
}
