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
      include: { services: { include: { service: { select: { id: true, name: true, price: true, active: true } } } } },
    });
    return { offers };
  });
}

function parseValidityDates(validFrom?: string, validUntil?: string) {
  const from = validFrom ? new Date(validFrom) : null;
  const until = validUntil ? new Date(validUntil) : null;
  if ((from && Number.isNaN(from.getTime())) || (until && Number.isNaN(until.getTime()))) {
    throw new ApiError(400, "Datat e vlefshmërisë nuk janë të vlefshme");
  }
  return { from, until };
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const data = offerSchema.parse(await readJson(req));
    const { from, until } = parseValidityDates(data.validFrom, data.validUntil);

    const services = await prisma.service.findMany({ where: { id: { in: data.serviceIds } } });
    if (services.length !== data.serviceIds.length) throw new ApiError(400, "Një ose më shumë shërbime nuk ekzistojnë");

    const offer = await prisma.offer.create({
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        price: data.price,
        durationMin: data.durationMin,
        validFrom: from,
        validUntil: until,
        active: data.active ?? true,
        services: { create: data.serviceIds.map((serviceId) => ({ serviceId })) },
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
