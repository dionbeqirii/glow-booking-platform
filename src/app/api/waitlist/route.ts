import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { waitlistJoinSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";

// GET — the current client's own waitlist entries (3.3). Never exposes
// anyone else's — there is no staff/admin view of the raw waitlist itself,
// only its effect (a priority hold) once a slot actually frees up.
export async function GET() {
  return handle(async () => {
    const session = await requireRole("CLIENT");
    const entries = await prisma.waitlist.findMany({
      where: { clientId: session.userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        service: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } },
      },
    });
    return { entries };
  });
}

// POST — join the waitlist for a service, optionally narrowed to one staff
// member. Re-joining just updates the staff preference; the original
// createdAt (and so FIFO position) is kept.
export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireRole("CLIENT");
    const data = waitlistJoinSchema.parse(await readJson(req));

    const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
    if (!service || !service.active) throw new ApiError(404, "Shërbimi nuk u gjet");

    if (data.staffId) {
      const qualified = await prisma.staffService.findUnique({
        where: { staffId_serviceId: { staffId: data.staffId, serviceId: data.serviceId } },
      });
      if (!qualified) throw new ApiError(400, "Ky punonjës nuk e kryen këtë shërbim");
    }

    const entry = await prisma.waitlist.upsert({
      where: { clientId_serviceId: { clientId: session.userId, serviceId: data.serviceId } },
      create: { clientId: session.userId, serviceId: data.serviceId, staffId: data.staffId ?? null },
      update: { staffId: data.staffId ?? null },
    });

    return { entry };
  });
}
