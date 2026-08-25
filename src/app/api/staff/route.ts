import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { staffCreateSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

// FR-02 — staff accounts and the services each of them performs.
export async function GET() {
  return handle(async () => {
    await requireRole("ADMIN");
    const staff = await prisma.user.findMany({
      where: { role: "STAFF" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        title: true,
        createdAt: true,
        staffServices: { select: { serviceId: true } },
        _count: { select: { workingHours: true } },
      },
    });
    return { staff };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const data = staffCreateSchema.parse(await readJson(req));

    const taken = await prisma.user.findUnique({ where: { email: data.email } });
    if (taken) throw new ApiError(409, "Ky email është i regjistruar");

    const member = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        title: data.title,
        passwordHash: await hashPassword(data.password),
        role: "STAFF",
      },
      select: { id: true, name: true, email: true, phone: true, title: true },
    });

    await audit({
      userId: session.userId,
      action: "STAFF_CREATE",
      entity: "User",
      entityId: member.id,
      details: member.name,
    });

    return { staff: member };
  });
}
