import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export type ServicesKpis = {
  total: number;
  active: number;
  mostBooked: { name: string; count: number } | null;
  averagePrice: number;
};

// Real, all-time totals — no rolling window, so "Most Booked" reflects the
// service's actual lifetime demand rather than a recent-only snapshot.
export async function getServicesKpis(): Promise<ServicesKpis> {
  const [total, active, services, topByBookings] = await Promise.all([
    prisma.service.count(),
    prisma.service.count({ where: { active: true } }),
    prisma.service.findMany({ select: { price: true } }),
    prisma.booking.groupBy({
      by: ["serviceId"],
      _count: { _all: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 1,
    }),
  ]);

  const averagePrice = services.length > 0 ? services.reduce((sum, s) => sum + Number(s.price), 0) / services.length : 0;

  let mostBooked: ServicesKpis["mostBooked"] = null;
  if (topByBookings.length > 0) {
    const top = topByBookings[0];
    const svc = await prisma.service.findUnique({ where: { id: top.serviceId }, select: { name: true } });
    if (svc) mostBooked = { name: svc.name, count: top._count._all };
  }

  return { total, active, mostBooked, averagePrice };
}

export type CategoryCount = { category: string; count: number };

// Groups by the real `category` field — services left uncategorized land in
// a real, honest "Pa kategori" bucket rather than being silently dropped.
export async function getServiceCategoryCounts(): Promise<CategoryCount[]> {
  const rows = await prisma.service.groupBy({ by: ["category"], _count: { _all: true } });
  return rows
    .map((r) => ({ category: r.category ?? "Pa kategori", count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}

export type TopService = { id: string; name: string; count: number };

export async function getTopServicesThisMonth(now: Date, limit = 5): Promise<TopService[]> {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const rows = await prisma.booking.groupBy({
    by: ["serviceId"],
    where: { startTime: { gte: monthStart, lt: nextMonthStart } },
    _count: { _all: true },
    orderBy: { _count: { serviceId: "desc" } },
    take: limit,
  });
  if (rows.length === 0) return [];

  const services = await prisma.service.findMany({
    where: { id: { in: rows.map((r) => r.serviceId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(services.map((s) => [s.id, s.name]));

  return rows.map((r) => ({ id: r.serviceId, name: nameById.get(r.serviceId) ?? "—", count: r._count._all }));
}

export type ServiceListRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  durationMin: number;
  price: number;
  active: boolean;
  bookingCount: number;
};

export type ServiceListFilters = {
  q?: string;
  category?: string;
  status?: "active" | "inactive";
};

export async function getServicesList(filters: ServiceListFilters): Promise<ServiceListRow[]> {
  const where: Prisma.ServiceWhereInput = {};
  if (filters.q) where.name = { contains: filters.q, mode: "insensitive" };
  if (filters.category) where.category = filters.category;
  if (filters.status === "active") where.active = true;
  if (filters.status === "inactive") where.active = false;

  const services = await prisma.service.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { bookings: true } } },
  });

  return services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    imageUrl: s.imageUrl,
    durationMin: s.durationMin,
    price: Number(s.price),
    active: s.active,
    bookingCount: s._count.bookings,
  }));
}
