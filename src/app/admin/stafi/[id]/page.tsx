import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import StaffDetail from "@/components/admin/StaffDetail";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("ADMIN");
  const { id } = await params;

  const member = await prisma.user.findFirst({
    where: { id, role: "STAFF" },
    select: {
      id: true,
      name: true,
      email: true,
      staffServices: { select: { serviceId: true } },
      workingHours: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
      timeOff: { orderBy: { from: "asc" } },
    },
  });
  if (!member) notFound();

  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, durationMin: true },
  });

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/stafi" className="text-sm text-neutral-600 hover:underline">
          ← Stafi
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900">{member.name}</h1>
        <p className="mb-5 text-sm text-neutral-600">{member.email}</p>

        <StaffDetail
          staffId={member.id}
          staffName={member.name}
          services={services}
          initialSkills={member.staffServices.map((s) => s.serviceId)}
          initialHours={member.workingHours.map((h) => ({
            weekday: h.weekday,
            startTime: h.startTime,
            endTime: h.endTime,
          }))}
          timeOff={member.timeOff.map((t) => ({
            id: t.id,
            from: t.from.toISOString(),
            until: t.until.toISOString(),
            reason: t.reason,
          }))}
        />
      </div>
    </DashboardShell>
  );
}
