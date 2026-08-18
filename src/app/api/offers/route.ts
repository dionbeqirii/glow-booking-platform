import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/rbac";
import { offerSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

// Any signed-in user may read the offer list; staff/clients only see the
// ones the admin has enabled. Only the administrator may create one.
export async function GET() {
  return handle(async () => {
    const session = await requireSession();
    const offers = await prisma.offer.findMany({
      where: session.role === "ADMIN" ? {} : { active: true },
      orderBy: { createdAt: "desc" },
      include: { service: { select: { id: true, name: true, durationMin: true, active: true } } },
    });
    return { offers };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const data = offerSchema.parse(await readJson(req));

    const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
    if (!service) throw new ApiError(400, "Shërbimi i zgjedhur nuk ekziston");

    const offer = await prisma.offer.create({
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        price: data.price,
        serviceId: data.serviceId,
        active: data.active ?? true,
      },
    });

    await audit({
      userId: session.userId,
      action: "OFFER_CREATE",
      entity: "Offer",
      entityId: offer.id,
      details: offer.title,
    });

    return { offer };
  });
}
