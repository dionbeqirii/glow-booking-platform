import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle } from "@/components/ui";
import StaffQueue from "@/components/staff/StaffQueue";
import { DISPLAY_QUEUE_STATUSES } from "@/lib/queue";

export default async function StaffPage() {
  const session = await requireRole("STAFF");

  const entries = await prisma.queueEntry.findMany({
    where: { status: { in: DISPLAY_QUEUE_STATUSES } },
    orderBy: { checkinAt: "asc" },
    select: {
      id: true,
      queueNumber: true,
      status: true,
      estimatedWaitMin: true,
      checkinAt: true,
      serviceId: true,
      service: { select: { name: true, durationMin: true } },
      staff: { select: { id: true, name: true } },
      client: { select: { name: true } },
      clientName: true,
    },
  });

  const rows = entries.map((e) => ({ ...e, checkinAt: e.checkinAt.toISOString() }));

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-3xl">
        <PageTitle title="Radha e sotme" hint="Thirr klientin e radhës dhe menaxho shërbimet në vazhdim." />
        <StaffQueue meId={session.userId} isAdmin={false} initial={rows} />
      </div>
    </DashboardShell>
  );
}
