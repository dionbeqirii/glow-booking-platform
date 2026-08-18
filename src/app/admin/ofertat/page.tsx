import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import OffersManager, { type OfferRow, type ServiceOption } from "@/components/admin/OffersManager";

export default async function AdminOffersPage() {
  const session = await requireRole("ADMIN");

  const [offers, services] = await Promise.all([
    prisma.offer.findMany({
      orderBy: { createdAt: "desc" },
      include: { service: { select: { name: true } } },
    }),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const rows: OfferRow[] = offers.map((o) => ({
    id: o.id,
    title: o.title,
    description: o.description,
    imageUrl: o.imageUrl,
    price: Number(o.price),
    active: o.active,
    serviceId: o.serviceId,
    serviceName: o.service.name,
  }));
  const serviceOptions: ServiceOption[] = services;

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="text-sm text-ink-soft hover:underline">
          ← Paneli
        </Link>
        <h1 className="mt-2 mb-5 text-xl font-bold text-ink">Ofertat</h1>
        <OffersManager initial={rows} services={serviceOptions} />
      </div>
    </DashboardShell>
  );
}
