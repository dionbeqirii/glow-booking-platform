import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { getClientQueueView } from "@/lib/client-queue";
import ClientQueueWorkspace from "@/components/client/ClientQueueWorkspace";

export default async function ClientQueuePage() {
  const session = await requireRole("CLIENT");

  const [services, view] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, durationMin: true },
    }),
    getClientQueueView(session.userId, session.name),
  ]);

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-none">
        <h1 className="text-xl font-bold text-ink">Radha</h1>
        <p className="mb-4 text-sm text-ink-soft">Bashkohu në radhën pa termin dhe ndiq statusin tënd të pritjes.</p>

        <ClientQueueWorkspace services={services} view={view} />
      </div>
    </DashboardShell>
  );
}
