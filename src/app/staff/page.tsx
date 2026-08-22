import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle } from "@/components/ui";
import StaffQueue from "@/components/staff/StaffQueue";
import { DISPLAY_QUEUE_STATUSES } from "@/lib/queue";

export default async function StaffPage() {
  const session = await requireRole("STAFF");

  const [entries, myServices, services] = await Promise.all([
    prisma.queueEntry.findMany({
      where: { status: { in: DISPLAY_QUEUE_STATUSES } },
      orderBy: { checkinAt: "asc" },
      select: {
        id: true,
        queueNumber: true,
        status: true,
        estimatedWaitMin: true,
        checkinAt: true,
        startedAt: true,
        serviceId: true,
        service: { select: { name: true, durationMin: true } },
        staff: { select: { id: true, name: true } },
        client: { select: { name: true } },
        clientName: true,
        visitServices: { select: { serviceId: true } },
      },
    }),
    prisma.staffService.findMany({ where: { staffId: session.userId }, select: { serviceId: true } }),
    prisma.service.findMany({ select: { id: true, name: true, price: true } }),
  ]);

  const rows = entries.map((e) => ({
    ...e,
    checkinAt: e.checkinAt.toISOString(),
    startedAt: e.startedAt ? e.startedAt.toISOString() : null,
    visitServiceIds: e.visitServices.map((v) => v.serviceId),
  }));
  const staffOptions = [
    { id: session.userId, name: session.name, serviceIds: myServices.map((s) => s.serviceId) },
  ];
  const serviceCatalog = services.map((s) => ({ id: s.id, name: s.name, price: Number(s.price) }));

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-3xl">
        <PageTitle title="Radha e sotme" hint="Thirr klientin e radhës dhe menaxho shërbimet në vazhdim." />
        <StaffQueue
          meId={session.userId}
          isAdmin={false}
          initial={rows}
          staffOptions={staffOptions}
          services={serviceCatalog}
        />
      </div>
    </DashboardShell>
  );
}
