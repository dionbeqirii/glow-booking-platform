import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/rbac";
import { serviceSchema } from "@/lib/validation";
import { handle, readJson } from "@/lib/api";
import { audit } from "@/lib/audit";

// FR-01 — service catalog.
// Any signed-in user may read the catalog; only the administrator may change it.
export async function GET() {
  return handle(async () => {
    const session = await requireSession();
    const services = await prisma.service.findMany({
      where: session.role === "ADMIN" ? {} : { active: true },
      orderBy: { name: "asc" },
    });
    return { services };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const data = serviceSchema.parse(await readJson(req));

    const service = await prisma.service.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        imageUrl: data.imageUrl,
        durationMin: data.durationMin,
        price: data.price,
        active: data.active ?? true,
      },
    });

    await audit({
      userId: session.userId,
      action: "SERVICE_CREATE",
      entity: "Service",
      entityId: service.id,
      details: service.name,
    });

    return { service };
  });
}
