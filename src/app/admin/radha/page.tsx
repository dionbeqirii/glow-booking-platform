import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle } from "@/components/ui";
import StaffQueue from "@/components/staff/StaffQueue";
import { DISPLAY_QUEUE_STATUSES } from "@/lib/queue";

export default async function AdminQueuePage() {
  const session = await requireRole("ADMIN");

  const entries = await prisma.queueEntry.findMany({
    where: { status: { in: DISPLAY_QUEUE_STATUSES } },
    orderBy: { checkinAt: "asc" },
    select: {
      id: true,
      queueNumber: true,
      status: true,
      estimatedWaitMin: true,
      checkinAt: true,
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
        <Link href="/admin" className="text-sm text-ink-soft hover:underline">
          ← Paneli
        </Link>
        <div className="mt-2">
          <PageTitle title="Radha e sotme" hint="Pamje e gjithë radhës, sipas roleve të stafit." />
        </div>
        <StaffQueue meId={session.userId} isAdmin initial={rows} />
      </div>
    </DashboardShell>
  );
}
