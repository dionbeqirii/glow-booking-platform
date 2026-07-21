import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { timeOffSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// FR-03 — absences and leave, treated as exceptions to the weekly schedule.
export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const { id } = await params;

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
