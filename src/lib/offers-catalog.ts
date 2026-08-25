import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export type OfferServiceOption = { id: string; name: string; price: number; durationMin: number };

export type OfferDisplayStatus = "active" | "inactive" | "expired";

export type OfferListRow = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  durationMin: number;
  validFrom: string | null;
  validUntil: string | null;
  active: boolean;
  status: OfferDisplayStatus;
  services: { id: string; name: string; price: number }[];
  realValue: number;
};

// "Skaduar" is derived, never stored: an offer past its own validUntil
// reads as expired regardless of the admin's `active` flag, so a
// forgotten-to-deactivate offer never looks bookable in the list.
function displayStatus(active: boolean, validUntil: Date | null, now: Date): OfferDisplayStatus {
  if (validUntil && validUntil < now) return "expired";
  return active ? "active" : "inactive";
}

export type OfferListFilters = {
  q?: string;
  status?: OfferDisplayStatus;
};

export async function getOffersList(filters: OfferListFilters, now = new Date()): Promise<OfferListRow[]> {
  const where: Prisma.OfferWhereInput = {};
  if (filters.q) where.title = { contains: filters.q, mode: "insensitive" };

  const offers = await prisma.offer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { services: { include: { service: { select: { id: true, name: true, price: true } } } } },
  });

  const rows = offers.map((o) => {
    const services = o.services.map((os) => ({ id: os.service.id, name: os.service.name, price: Number(os.service.price) }));
    return {
      id: o.id,
      title: o.title,
      description: o.description,
      imageUrl: o.imageUrl,
      price: Number(o.price),
      durationMin: o.durationMin,
      validFrom: o.validFrom ? o.validFrom.toISOString() : null,
      validUntil: o.validUntil ? o.validUntil.toISOString() : null,
      active: o.active,
      status: displayStatus(o.active, o.validUntil, now),
      services,
      realValue: services.reduce((sum, s) => sum + s.price, 0),
    };
  });

  return filters.status ? rows.filter((r) => r.status === filters.status) : rows;
}

export type BookableOffer = {
  id: string;
  title: string;
  price: number;
  realValue: number;
  serviceNames: string[];
  /** The first still-active bundled service — booking an offer books this service underneath. */
  bookingServiceId: string;
};

// Powers the client booking flow's service-selection step: an offer appears
// there only while the admin has it active, today falls inside its validity
// window (when one is set), and at least one of its bundled services is
// still active — so toggling `active` off (or letting validUntil pass)
// removes it from booking immediately, no separate sync step needed.
export async function getBookableOffers(now = new Date()): Promise<BookableOffer[]> {
  const offers = await prisma.offer.findMany({
    where: {
      active: true,
      OR: [{ validFrom: null }, { validFrom: { lte: now } }],
      AND: [{ OR: [{ validUntil: null }, { validUntil: { gte: now } }] }],
    },
    orderBy: { createdAt: "desc" },
    include: { services: { include: { service: { select: { id: true, name: true, price: true, active: true } } } } },
  });

  const bookable: BookableOffer[] = [];
  for (const o of offers) {
    const firstActive = o.services.find((os) => os.service.active);
    if (!firstActive) continue;
    bookable.push({
      id: o.id,
      title: o.title,
      price: Number(o.price),
      realValue: o.services.reduce((sum, os) => sum + Number(os.service.price), 0),
      serviceNames: o.services.map((os) => os.service.name),
      bookingServiceId: firstActive.serviceId,
    });
  }
  return bookable;
}

export async function getOfferServiceOptions(): Promise<OfferServiceOption[]> {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, price: true, durationMin: true },
  });
  return services.map((s) => ({ id: s.id, name: s.name, price: Number(s.price), durationMin: s.durationMin }));
}
