import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { workingHoursSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// FR-03 — weekly working hours. The whole week is replaced in one request so
// the stored schedule always matches what the administrator sees on screen.
export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const { id } = await params;

    const member = await prisma.user.findFirst({ where: { id, role: "STAFF" } });
    if (!member) throw new ApiError(404, "Punonjësi nuk u gjet");

    const { hours } = workingHoursSchema.parse(await readJson(req));

    // Two intervals on the same weekday may not overlap.
    const byDay = new Map<number, { startTime: string; endTime: string }[]>();
    for (const h of hours) {
      const list = byDay.get(h.weekday) ?? [];
      for (const other of list) {
        if (h.startTime < other.endTime && other.startTime < h.endTime) {
          throw new ApiError(400, "Dy intervale të së njëjtës ditë mbivendosen");
        }
      }
      list.push(h);
      byDay.set(h.weekday, list);
    }

    await prisma.$transaction([
      prisma.workingHours.deleteMany({ where: { staffId: id } }),
      prisma.workingHours.createMany({
        data: hours.map((h) => ({
          staffId: id,
          weekday: h.weekday,
          startTime: h.startTime,
          endTime: h.endTime,
        })),
      }),
    ]);

    await audit({
      userId: session.userId,
      action: "STAFF_HOURS_SET",
      entity: "User",
      entityId: id,
      details: `${member.name}: ${hours.length} intervale`,
    });

    return { count: hours.length };
  });
}
