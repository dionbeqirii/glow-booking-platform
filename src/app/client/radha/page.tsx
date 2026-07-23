import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle } from "@/components/ui";
import QueueView from "@/components/client/QueueView";
import { DISPLAY_QUEUE_STATUSES } from "@/lib/queue";

export default async function QueuePage() {
  const session = await requireRole("CLIENT");

  const [services, mine] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, durationMin: true },
    }),
    prisma.queueEntry.findFirst({
      where: { clientId: session.userId, status: { in: DISPLAY_QUEUE_STATUSES } },
      select: {
        id: true,
        queueNumber: true,
        status: true,
        estimatedWaitMin: true,
        checkinAt: true,
        service: { select: { name: true, durationMin: true } },
        staff: { select: { name: true } },
      },
    }),
  ]);

  let initialEntry = null;
  if (mine) {
    // Position among those still WAITING and checked in earlier.
    const position =
      mine.status === "WAITING"
        ? await prisma.queueEntry.count({
            where: {
              status: "WAITING",
              checkinAt: { lt: mine.checkinAt },
            },
          })
        : null;
    initialEntry = { ...mine, position };
  }

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-lg">
        <Link href="/client" className="text-sm text-ink-soft hover:underline">
          ← Terminet e mia
        </Link>
        <div className="mt-2">
          <PageTitle title="Radha pa termin" hint="Nëse nuk ke rezervim, futu në radhë këtu." />
        </div>
        <QueueView services={services} initialEntry={initialEntry} />
      </div>
    </DashboardShell>
  );
}
