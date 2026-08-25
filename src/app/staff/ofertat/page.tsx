import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle, EmptyState } from "@/components/ui";
import { OfferCard, type OfferCardData } from "@/components/OfferCard";

// Staff sees only the offers the admin has enabled, and only to view — no
// edit/booking actions live here.
export default async function StaffOffersPage() {
  const session = await requireRole("STAFF");

  const offers = await prisma.offer.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: { services: { include: { service: { select: { name: true } } } } },
  });

  const rows: OfferCardData[] = offers.map((o) => ({
    id: o.id,
    title: o.title,
    description: o.description,
    imageUrl: o.imageUrl,
    price: Number(o.price),
    serviceNames: o.services.map((os) => os.service.name),
  }));

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-5xl">
        <Link href="/staff" className="text-sm text-ink-soft hover:underline">
          ← Radha e sotme
        </Link>
        <div className="mt-2">
          <PageTitle title="Ofertat" hint="Ofertat aktive të studios." />
        </div>
        {rows.length === 0 ? (
          <EmptyState text="Nuk ka ende oferta aktive." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
