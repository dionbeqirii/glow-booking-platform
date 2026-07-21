import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import ServicesManager, { type ServiceRow } from "@/components/admin/ServicesManager";

export default async function ServicesPage() {
  const session = await requireRole("ADMIN");

  const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
  // Prisma returns Decimal for price; convert before passing to the client.
  const rows: ServiceRow[] = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    durationMin: s.durationMin,
    price: Number(s.price),
    active: s.active,
  }));

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="text-sm text-neutral-600 hover:underline">
          ← Paneli
        </Link>
        <h1 className="mt-2 mb-5 text-xl font-bold text-neutral-900">Shërbimet</h1>
        <ServicesManager initial={rows} />
      </div>
    </DashboardShell>
  );
}
