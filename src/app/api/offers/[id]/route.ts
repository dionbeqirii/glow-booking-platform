import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { offerUpdateSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// Edits a field, or toggles active/disabled (same endpoint — a toggle is
// just a partial update of one boolean). `serviceIds`, when sent, always
// carries the offer's full bundle — the join-table rows are replaced
// wholesale rather than diffed, since the form always submits the complete
// chip set.
export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const { id } = await params;
    const data = offerUpdateSchema.parse(await readJson(req));

    const existing = await prisma.offer.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Oferta nuk u gjet");

    if (data.serviceIds) {
      const services = await prisma.service.findMany({ where: { id: { in: data.serviceIds } } });
      if (services.length !== data.serviceIds.length) throw new ApiError(400, "Një ose më shumë shërbime nuk ekzistojnë");
    }

    let from: Date | null | undefined;
    let until: Date | null | undefined;
    if (data.validFrom !== undefined) {
      from = data.validFrom ? new Date(data.validFrom) : null;
      if (from && Number.isNaN(from.getTime())) throw new ApiError(400, "Data e fillimit të vlefshmërisë nuk është e vlefshme");
    }
    if (data.validUntil !== undefined) {
      until = data.validUntil ? new Date(data.validUntil) : null;
      if (until && Number.isNaN(until.getTime())) throw new ApiError(400, "Data e mbarimit të vlefshmërisë nuk është e vlefshme");
    }

    const { title, description, imageUrl, price, durationMin, active, serviceIds } = data;

    const offer = await prisma.$transaction(async (tx) => {
      if (serviceIds) {
        await tx.offerService.deleteMany({ where: { offerId: id } });
        await tx.offerService.createMany({ data: serviceIds.map((serviceId) => ({ offerId: id, serviceId })) });
      }
      return tx.offer.update({
        where: { id },
        data: {
          title,
          description,
          imageUrl,
          price,
          durationMin,
          active,
          ...(from !== undefined ? { validFrom: from } : {}),
          ...(until !== undefined ? { validUntil: until } : {}),
        },
      });
    });

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
