import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle, EmptyState } from "@/components/ui";
import BookingFlow from "@/components/client/BookingFlow";

type Search = { searchParams: Promise<{ service?: string }> };

export default async function BookPage({ searchParams }: Search) {
  const session = await requireRole("CLIENT");
  const sp = await searchParams;

  const [services, staff] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, durationMin: true, price: true },
    }),
    prisma.user.findMany({
      where: { role: "STAFF" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, staffServices: { select: { serviceId: true } } },
    }),
  ]);

  const serviceRows = services.map((s) => ({ ...s, price: Number(s.price) }));
  const staffRows = staff.map((m) => ({
    id: m.id,
    name: m.name,
    serviceIds: m.staffServices.map((x) => x.serviceId),
  }));

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-3xl">
        <Link href="/client" className="text-sm text-ink-soft hover:underline">
          ← Terminet e mia
        </Link>
        <div className="mt-2">
          <PageTitle title="Rezervo një termin" hint="Zgjidh shërbimin, punonjësen dhe orarin që të përshtatet." />
        </div>

        {serviceRows.length === 0 ? (
          <EmptyState text="Studioja nuk ka ende shërbime të disponueshme." />
        ) : (
          <BookingFlow
            services={serviceRows}
            staff={staffRows}
            initialServiceId={serviceRows.some((s) => s.id === sp.service) ? sp.service : undefined}
          />
        )}
      </div>
    </DashboardShell>
  );
}
