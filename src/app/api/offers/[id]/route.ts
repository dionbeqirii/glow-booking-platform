import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { offerUpdateSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// Edits a field, or toggles active/disabled (same endpoint — a toggle is
// just a partial update of one boolean).
export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const { id } = await params;
    const data = offerUpdateSchema.parse(await readJson(req));

    const existing = await prisma.offer.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Oferta nuk u gjet");

    if (data.serviceId) {
      const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
      if (!service) throw new ApiError(400, "Shërbimi i zgjedhur nuk ekziston");
    }

    const offer = await prisma.offer.update({ where: { id }, data });

    await audit({
      userId: session.userId,
      action: data.active !== undefined && Object.keys(data).length === 1 ? "OFFER_TOGGLE" : "OFFER_UPDATE",
      entity: "Offer",
      entityId: id,
      details: offer.title,
    });

    return { offer };
  });
}

// Offers have no downstream references (a booking made from one just
// becomes a normal Booking against the service), so deletion is safe.
export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const { id } = await params;

    const existing = await prisma.offer.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Oferta nuk u gjet");

    await prisma.offer.delete({ where: { id } });

    await audit({
      userId: session.userId,
      action: "OFFER_DELETE",
      entity: "Offer",
      entityId: id,
      details: existing.title,
    });

    return { deleted: true };
  });
}
