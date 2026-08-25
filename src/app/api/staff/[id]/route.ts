import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { staffUpdateSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

async function findStaff(id: string) {
  const member = await prisma.user.findFirst({ where: { id, role: "STAFF" } });
  if (!member) throw new ApiError(404, "Punonjësi nuk u gjet");
  return member;
}

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole("ADMIN");
    const { id } = await params;
    await findStaff(id);

    const member = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        staffServices: { select: { serviceId: true } },
        workingHours: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
        timeOff: { orderBy: { from: "asc" } },
      },
    });
    return { staff: member };
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const { id } = await params;
    await findStaff(id);

    const data = staffUpdateSchema.parse(await readJson(req));
    const member = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        title: data.title,
        ...(data.password ? { passwordHash: await hashPassword(data.password) } : {}),
      },
      select: { id: true, name: true, email: true, phone: true, title: true },
    });

    await audit({
      userId: session.userId,
      action: "STAFF_UPDATE",
      entity: "User",
      entityId: id,
      details: member.name,
    });

    return { staff: member };
  });
}

// Staff with history are kept; only those without bookings or queue entries
// can be removed outright.
export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const { id } = await params;
    const member = await findStaff(id);

    const used =
      (await prisma.booking.count({ where: { staffId: id } })) +
      (await prisma.queueEntry.count({ where: { staffId: id } }));
    if (used > 0) {
      throw new ApiError(
        409,
        `Punonjësi ka ${used} regjistrime dhe nuk mund të fshihet. Hiqi oraret për ta bërë të padisponueshëm.`
      );
    }

    await prisma.staffService.deleteMany({ where: { staffId: id } });
    await prisma.workingHours.deleteMany({ where: { staffId: id } });
    await prisma.timeOff.deleteMany({ where: { staffId: id } });
    await prisma.user.delete({ where: { id } });

    await audit({
      userId: session.userId,
      action: "STAFF_DELETE",
      entity: "User",
      entityId: id,
      details: member.name,
    });

    return { deleted: true };
  });
}
