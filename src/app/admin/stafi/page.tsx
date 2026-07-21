import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import StaffManager, { type StaffRow } from "@/components/admin/StaffManager";

export default async function StaffPage() {
  const session = await requireRole("ADMIN");

  const staff = await prisma.user.findMany({
    where: { role: "STAFF" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      _count: { select: { staffServices: true, workingHours: true } },
    },
  });

  const rows: StaffRow[] = staff.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    phone: m.phone,
    skillCount: m._count.staffServices,
    hoursCount: m._count.workingHours,
  }));

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="text-sm text-neutral-600 hover:underline">
          ← Paneli
        </Link>
        <h1 className="mt-2 mb-5 text-xl font-bold text-neutral-900">Stafi</h1>
        <StaffManager initial={rows} />
      </div>
    </DashboardShell>
  );
}
